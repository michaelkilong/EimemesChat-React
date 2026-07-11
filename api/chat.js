// api/chat.js
// v5.12 — Fixed image handling: detect images by mimeType, bypass truncation; Groq path ignores image content
// v5.11 — Hardened safeReply fallback: never send an empty safeReply to the frontend
// v5.10 — Fixed: daily limit error aborts request, attachment truncation, history duplicate removal,
//         image‑only queries allowed, displayName/nickname deduplication, memory extraction note.
// v5.9 — Use user's display name from Firestore; removed hardcoded "Melhoi"
// v5.8 — Fixed disclaimer rendering: now sends 'critical' or 'web' string to frontend
// v5.7 — Always strip last user message from history to prevent double input
// v5.6 — Behavioral prompt now contains full personality & formatting rules;
//        fingerprint prompt built from same content for leak protection.
// v5.5 — Regeneration fix: strip last user message from history to avoid doubling
// v5.4 — Native Gemini REST API with proper thinkingConfig; Groq fallback stays OpenAI format
// v5.0 — Tavily web search; auto-detect sensitive topics; inline source citations

import admin from "firebase-admin";
import { buildFingerprint, createStreamScanner, shieldInput, getBlockMessage } from "../shield.js";
import { BEHAVIORAL_PROMPT, FINGERPRINT_PROMPT } from "../src/lib/promptLoader.js";

/* ── Firebase Admin ───────────────────────────────────────────── */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

/* ── Behavioral & fingerprint prompts ─────────────────────────── */
const PROMPT_FINGERPRINT = buildFingerprint(FINGERPRINT_PROMPT);

/* ── Constants ────────────────────────────────────────────────── */
const DAILY_LIMIT      = 100;
const MODEL_TIMEOUT_MS = 25000;
const MAX_ATTACHMENT_LENGTH = 8000;

/* ── Model config ─────────────────────────────────────────────── */
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;
const GEMINI_GEN_URL    = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";

const CRITICAL_PATTERNS = /\b(health|medical|medicine|doctor|diagnosis|symptom|disease|drug|medication|dosage|treatment|therapy|mental health|depression|anxiety|suicide|cancer|infection|pain|legal|law|lawsuit|attorney|lawyer|court|rights|contract|financial|invest|stock|crypto|tax|loan|debt|insurance)\b/i;

/* ── Helpers ──────────────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().slice(0, 10); }

async function checkAndIncrementDailyCount(uid) {
  const ref = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const today      = todayStr();
    const lastDate   = data.lastDate || "";
    const dailyCount = lastDate === today ? (data.dailyCount || 0) : 0;
    if (dailyCount >= DAILY_LIMIT) return false;
    tx.set(ref, { dailyCount: dailyCount + 1, lastDate: today }, { merge: true });
    return true;
  });
}

function adaptiveMaxTokens(message, hasAttachment) {
  if (hasAttachment) return 2000;
  const len = message.length;
  if (len < 60 && !/\?/.test(message))  return 600;
  if (/\b(code|function|class|implement|write|build|script|program|algorithm)\b/i.test(message)) return 2000;
  if (/\b(list|enumerate|steps?|explain|describe|summarise?|summarize|compare)\b/i.test(message)) return 1800;
  if (len > 300) return 1800;
  return 1200;
}

function truncateAttachmentContent(content) {
  if (typeof content !== 'string') return '';
  return content.length > MAX_ATTACHMENT_LENGTH
    ? content.slice(0, MAX_ATTACHMENT_LENGTH) + '…[truncated]'
    : content;
}

/* ── Convert OpenAI-style history to Gemini native format ─────── */
function toGeminiHistory(history) {
  return history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
    }));
}

/* ── Tavily web search ────────────────────────────────────────── */
async function optimizeSearchQuery(message, geminiApiKey, groqApiKey) {
  if (geminiApiKey) {
    try {
      const res = await fetch(GEMINI_GEN_URL, {
        method: "POST",
        headers: { "x-goog-api-key": geminiApiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: "Convert the user message into an optimal web search query. Output ONLY the search query — no explanation, no quotes, no punctuation at the end." }] },
          generationConfig: { maxOutputTokens: 40, temperature: 0.2 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const query = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (query) return query;
      }
    } catch { /* fall through */ }
  }
  if (groqApiKey) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL, max_tokens: 40, temperature: 0.2,
          messages: [
            { role: "system", content: "Convert the user message into an optimal web search query. Output ONLY the search query." },
            { role: "user",   content: message },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || message;
      }
    } catch { /* fall through */ }
  }
  return message;
}

async function searchWeb(query) {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_API_KEY) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY, query,
        search_depth: "advanced", max_results: 6,
        include_answer: false, include_raw_content: false,
        exclude_domains: ["pinterest.com","quora.com","reddit.com","facebook.com","twitter.com","instagram.com","tiktok.com","youtube.com"],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data.results || [])
      .filter(r => r.content && r.content.length > 80)
      .slice(0, 5)
      .map(r => ({ title: r.title, url: r.url, content: r.content?.slice(0, 800), score: r.score }));
    return results.length ? results : null;
  } catch { return null; }
}

function buildSearchContext(results) {
  if (!results?.length) return '';
  return '\n\nSearch results:\n\n' + results.map((r, i) =>
    `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
  ).join('\n\n');
}

/* ── SSE helpers ──────────────────────────────────────────────── */
function sseEvent(res, payload) { res.write(`data: ${JSON.stringify(payload)}\n\n`); }
function setSSEHeaders(res) {
  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

/* ── CORS ─────────────────────────────────────────────────────── */
const ALLOWED_ORIGINS = [
  "https://eimemes-chat-ai.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/* ── Memory system ────────────────────────────────────────────── */
const MEMORY_LIMIT = 30;
const MEMORY_CATEGORIES = ['fact', 'preference', 'style', 'interest', 'context'];

function sanitizeForMemory(text) {
  return text
    .slice(0, 600)
    .replace(/ignores+(previous|above|all)s+(instructions?|prompts?)/gi, '')
    .replace(/yous+ares+now/gi, '')
    .replace(/systems*:/gi, '')
    .replace(/[INST]|[/INST]|<|.*?|>/g, '')
    .replace(/acts+ass+(an?s+)?(admin|system|root|developer)/gi, '')
    .replace(/adds+(thiss+)?memory/gi, '')
    .replace(/forgets+(everything|all|previous)/gi, '')
    .replace(/yours+(instructions?|rules?|systems+prompt)/gi, '')
    .trim();
}

function isValidMemory(text) {
  return typeof text === 'string' &&
    text.length >= 5 &&
    text.length <= 120 &&
    !/ignore|instructions?|system prompt|admin|root|override/i.test(text);
}

const PERSONAL_SIGNAL = /\b(i am|i'm|i work|my name|i like|i love|i hate|i prefer|i study|i live|i want|i need|i always|i usually|i never|i enjoy|i use|my job|my hobby|my goal|i feel|i think|call me|we are|our team|i graduated|i'm a|i've been)\b/i;

function shouldExtractMemory(userMsg, aiReply) {
  if ((userMsg.length + aiReply.length) < 120) return false;
  if (!PERSONAL_SIGNAL.test(userMsg)) return false;
  return true;
}

async function loadMemories(uid) {
  try {
    const snap = await db.collection('users').doc(uid)
      .collection('memories').orderBy('createdAt', 'desc').limit(MEMORY_LIMIT).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function extractAndUpdateMemories(uid, userMsg, aiReply, geminiApiKey) {
  if (!shouldExtractMemory(userMsg, aiReply)) return;

  const safeUserMsg = sanitizeForMemory(userMsg);
  const safeAiReply = sanitizeForMemory(aiReply);
  if (safeUserMsg.length < 10) return;

  const existing = await loadMemories(uid);

  const existingBlock = existing.length
    ? 'Existing memories:\n' + existing.map((m, i) => `[${i}] (${m.category}) ${m.text}`).join('\n')
    : 'No existing memories yet.';

  const extractionPrompt = `You are a memory manager for an AI assistant. Analyse this conversation exchange and decide what to remember about the user.

${existingBlock}

New conversation:
User: "${safeUserMsg}"
AI: "${safeAiReply}"

Rules:
- Extract facts, preferences, communication style, interests, and context about the USER only
- Categories: fact (name/job/location/age), preference (likes/dislikes/habits), style (tone/language/communication), interest (hobbies/topics), context (current situation/goals)
- If new info UPDATES an existing memory, use action UPDATE with the existing memory index
- If new info CONTRADICTS an existing memory, use DELETE the old index then ADD new
- If already captured, use NONE
- Be specific and concise — max 12 words per memory
- Capture communication style: casual language, slang, preferred response length, tone
- If nothing meaningful, return NONE

Respond ONLY with valid JSON, no markdown, no explanation:
{"action":"ADD","category":"fact","text":"User is a software engineer"}
OR {"action":"UPDATE","index":2,"text":"Updated memory text"}
OR {"action":"DELETE","index":2}
OR {"action":"NONE"}`;

  try {
    let raw = null;

    if (geminiApiKey) {
      const res = await fetch(GEMINI_GEN_URL, {
        method: 'POST',
        headers: { 'x-goog-api-key': geminiApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.1 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
      }
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!raw && GROQ_API_KEY) {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 80,
          temperature: 0.1,
          messages: [
            { role: 'system', content: 'You are a memory extraction assistant. Output ONLY valid JSON, no markdown, no explanation.' },
            { role: 'user', content: extractionPrompt },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        raw = data.choices?.[0]?.message?.content?.trim() || null;
      }
    }

    if (!raw) return;

    const clean  = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const result = JSON.parse(clean);
    const memRef = db.collection('users').doc(uid).collection('memories');

    if (result.action === 'ADD' && result.text && MEMORY_CATEGORIES.includes(result.category) && isValidMemory(result.text)) {
      if (existing.length >= MEMORY_LIMIT) {
        await memRef.doc(existing[existing.length - 1].id).delete();
      }
      await memRef.add({
        text: result.text, category: result.category,
        createdAt: new Date(), updatedAt: new Date(), source: 'auto',
      });
      console.log(`[memory] ADD (${result.category}): "${result.text}"`);

    } else if (result.action === 'UPDATE' && typeof result.index === 'number' && existing[result.index] && isValidMemory(result.text)) {
      await memRef.doc(existing[result.index].id).update({ text: result.text, updatedAt: new Date() });
      console.log(`[memory] UPDATE [${result.index}]: "${result.text}"`);

    } else if (result.action === 'DELETE' && typeof result.index === 'number' && existing[result.index]) {
      await memRef.doc(existing[result.index].id).delete();
      console.log(`[memory] DELETE [${result.index}]`);
    }

  } catch (err) {
    console.warn('[memory] Extraction failed:', err.message);
  }
}

async function buildMemoryPrompt(uid) {
  try {
    const memories = await loadMemories(uid);
    if (!memories.length) return '';
    const grouped = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m.text);
    }
    const labels = { fact: 'About user', preference: 'Preferences', style: 'Communication style', interest: 'Interests', context: 'Current context' };
    const lines = Object.entries(grouped).map(([cat, items]) => `${labels[cat] || cat}: ${items.join('; ')}`);
    return '\n\nWhat you remember about this user:\n' + lines.join('\n');
  } catch { return ''; }
}

/* ── Stream Gemini (native REST) ──────────────────────────────── */
async function streamGemini({ apiKey, systemPrompt, contents, maxTokens, enableThinking, res, scanner }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  const generationConfig = {
    maxOutputTokens: maxTokens,
    temperature: enableThinking ? 1 : 0.72,
  };

  if (enableThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 8000 };
  }

  const apiRes = await fetch(GEMINI_STREAM_URL, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig,
    }),
    signal: controller.signal,
  });

  clearTimeout(timer);

  if (!apiRes.ok) {
    const errText = await apiRes.text();
    console.error(`[${GEMINI_MODEL}] HTTP ${apiRes.status}: ${errText.slice(0, 300)}`);
    return { success: false, status: apiRes.status };
  }

  console.log(`✅ Streaming: ${GEMINI_MODEL}${enableThinking ? ' (thinking)' : ''}`);

  const reader  = apiRes.body.getReader();
  const decoder = new TextDecoder();
  let buf          = "";
  let fullText     = "";
  let thinkingText = "";
  let leaked       = false;

  streamLoop:
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;

      try {
        const parsed = JSON.parse(raw);
        const parts  = parsed.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
          if (!part.text) continue;

          if (part.thought === true) {
            thinkingText += part.text;
            sseEvent(res, { thinking: part.text });
            continue;
          }

          const leakGram = scanner.checkChunk(part.text);
          if (leakGram) {
            leaked = true;
            let safeReply = getBlockMessage("system_leak");
            if (!safeReply) safeReply = "I can't respond to that request.";
            sseEvent(res, { outputBlocked: true, safeReply });
            sseEvent(res, { done: true, model: GEMINI_MODEL, reply: safeReply });
            res.end(); break streamLoop;
          }

          fullText += part.text;
          sseEvent(res, { token: part.text });
        }
      } catch { /* malformed chunk */ }
    }
  }

  return { success: true, leaked, fullText, thinkingText, model: GEMINI_MODEL };
}

/* ── Stream Groq (OpenAI format — fallback) ───────────────────── */
async function streamGroq({ apiKey, messages, maxTokens, res, scanner }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  const apiRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature: 0.72, stream: true }),
    signal: controller.signal,
  });

  clearTimeout(timer);

  if (!apiRes.ok) {
    const errText = await apiRes.text();
    console.error(`[${GROQ_MODEL}] HTTP ${apiRes.status}: ${errText.slice(0, 200)}`);
    return { success: false, status: apiRes.status };
  }

  console.log(`✅ Streaming: ${GROQ_MODEL}`);

  const reader  = apiRes.body.getReader();
  const decoder = new TextDecoder();
  let buf      = "";
  let fullText = "";
  let leaked   = false;

  streamLoop:
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") break streamLoop;

      try {
        const parsed = JSON.parse(raw);
        const token  = parsed.choices?.[0]?.delta?.content || "";
        if (!token) continue;

        const leakGram = scanner.checkChunk(token);
        if (leakGram) {
          leaked = true;
          let safeReply = getBlockMessage("system_leak");
          if (!safeReply) safeReply = "I can't respond to that request.";
          sseEvent(res, { outputBlocked: true, safeReply });
          sseEvent(res, { done: true, model: GROQ_MODEL, reply: safeReply });
          res.end(); break streamLoop;
        }

        fullText += token;
        sseEvent(res, { token });
      } catch { /* malformed chunk */ }
    }
  }

  return { success: true, leaked, fullText, thinkingText: '', model: GROQ_MODEL };
}

/* ── Title generation ─────────────────────────────────────────── */
async function generateTitle({ geminiApiKey, groqApiKey, safeMessage, fullText, res }) {
  const prompt = `User: "${safeMessage.slice(0, 200)}"\nAI: "${fullText.slice(0, 200)}"\n\nGenerate an ultra-short chat title — 2-5 words, no punctuation, no quotes. Output ONLY the title.`;

  try {
    if (geminiApiKey) {
      const r = await fetch(GEMINI_GEN_URL, {
        method: "POST",
        headers: { "x-goog-api-key": geminiApiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 16, temperature: 0.4 },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim().slice(0, 60);
        if (t) { sseEvent(res, { title: t }); return; }
      }
    }
    if (groqApiKey) {
      const r = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL, max_tokens: 16, temperature: 0.4,
          messages: [
            { role: "system", content: "Generate an ultra-short chat title. Output ONLY the title, 2-5 words, no punctuation, no quotes." },
            { role: "user",   content: prompt },
          ],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content?.trim().slice(0, 60);
        if (t) sseEvent(res, { title: t });
      }
    }
  } catch { /* ignore */ }
}

/* ── Handler ──────────────────────────────────────────────────── */
export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: "Unauthorized. Please sign in." });

  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid session. Please sign in again." });
  }

  try {
    const allowed = await checkAndIncrementDailyCount(uid);
    if (!allowed) return res.status(429).json({ error: "Daily limit reached. Your quota resets tomorrow." });
  } catch (err) {
    console.error("Daily limit check failed:", err.message);
    return res.status(500).json({ error: "Service temporarily unavailable. Please try again." });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GROQ_API_KEY   = process.env.GROQ_API_KEY;
  if (!GEMINI_API_KEY && !GROQ_API_KEY) return res.status(500).json({ error: "No AI API key configured." });

  const { message, history, isFirstMessage, attachment, useWebSearch, useThinking, isRegeneration } = req.body;
  if (!message && !attachment) return res.status(400).json({ error: "Message or attachment required" });

  const inputCheck = shieldInput(message || "");
  if (inputCheck.blocked) {
    setSSEHeaders(res);
    const msg = getBlockMessage(inputCheck.reason);
    sseEvent(res, { token: msg });
    sseEvent(res, { done: true, model: "shield", reply: msg });
    res.end(); return;
  }

  const safeMessage     = inputCheck.sanitized;
  const needsDisclaimer = CRITICAL_PATTERNS.test(safeMessage);
  const shouldSearch    = useWebSearch === true;
  const enableThinking  = useThinking === true && !!GEMINI_API_KEY;
  const maxTokens       = adaptiveMaxTokens(safeMessage, !!attachment) + (shouldSearch ? 400 : 0);

  let trimmedHistory = Array.isArray(history)
    ? history.slice(-8).map(({ role, content }) => ({ role, content }))
    : [];

  if (
    trimmedHistory.length &&
    trimmedHistory[trimmedHistory.length - 1].role === 'user' &&
    trimmedHistory[trimmedHistory.length - 1].content === safeMessage
  ) {
    trimmedHistory.pop();
  }

  setSSEHeaders(res);

  /* ── User preferences ─────────────────────────────────────────── */
  let userPrefsPrompt = '';
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) {
      const data = userSnap.data();
      const prefs = data.preferences || {};
      const parts = [];

      if (prefs.nickname) {
        parts.push(`Call the user "${prefs.nickname}".`);
      } else if (data.displayName) {
        parts.push(`Call the user "${data.displayName}".`);
      }

      if (prefs.tone)               parts.push(`Respond in a ${prefs.tone.toLowerCase()} tone.`);
      if (prefs.occupation)         parts.push(`User is a ${prefs.occupation}.`);
      if (prefs.customInstructions) parts.push(prefs.customInstructions);
      if (parts.length) userPrefsPrompt = '\n\n' + parts.join(' ');
    }
  } catch { /* fail open */ }

  /* ── Web search ───────────────────────────────────────────────── */
  let searchResults = null;
  let searchContext = '';
  if (shouldSearch) {
    const optimizedQuery = await optimizeSearchQuery(safeMessage, GEMINI_API_KEY, GROQ_API_KEY);
    searchResults = await searchWeb(optimizedQuery);
    if (searchResults?.length) {
      searchContext = buildSearchContext(searchResults);
      sseEvent(res, { searching: true, resultCount: searchResults.length });
    }
  }

  const memoryPrompt = await buildMemoryPrompt(uid);
  const FULL_SYSTEM_PROMPT = BEHAVIORAL_PROMPT + userPrefsPrompt + memoryPrompt;

  /* ── Build user message part (with image safety) ──────────────── */
  const isImage = attachment?.type === 'image' || attachment?.mimeType?.startsWith('image/');

  let userParts;
  if (isImage) {
    const base64 = attachment.content.split(',')[1] || attachment.content;
    userParts = [
      { inlineData: { mimeType: attachment.mimeType, data: base64 } },
      { text: safeMessage || "Describe this image in detail." },
    ];
  } else if (attachment?.content) {
    const truncatedContent = truncateAttachmentContent(attachment.content);
    userParts = [{ text: `[Attached file: ${attachment.name}]\n\n${truncatedContent}\n\n---\nUser question: ${safeMessage}${searchContext}` }];
  } else {
    userParts = [{ text: safeMessage + searchContext }];
  }

  const geminiContents = [
    ...toGeminiHistory(trimmedHistory),
    { role: "user", parts: userParts },
  ];

  // Groq fallback: for images, omit the raw base64 – it can't process it anyway
  const openaiUserContent = attachment?.content
    ? (isImage
        ? safeMessage + searchContext  // ignore image content for Groq
        : `[Attached file: ${attachment.name}]\n\n${truncateAttachmentContent(attachment.content)}\n\n---\nUser question: ${safeMessage}${searchContext}`)
    : safeMessage + searchContext;

  const openaiMessages = [
    { role: "system", content: FULL_SYSTEM_PROMPT },
    ...trimmedHistory,
    { role: "user", content: openaiUserContent },
  ];

  const scanner = createStreamScanner(PROMPT_FINGERPRINT);

  /* ── Try Gemini native, fall back to Groq ─────────────────────── */
  let result = null;

  if (GEMINI_API_KEY) {
    console.log(`[chat] uid=${uid} model=${GEMINI_MODEL} thinking=${enableThinking} search=${shouldSearch} regen=${!!isRegeneration}`);
    try {
      result = await streamGemini({
        apiKey: GEMINI_API_KEY,
        systemPrompt: FULL_SYSTEM_PROMPT,
        contents: geminiContents,
        maxTokens, enableThinking, res, scanner,
      });
    } catch (err) {
      console.error(`[${GEMINI_MODEL}] Error:`, err.name === "AbortError" ? "Timed out" : err.message);
      result = { success: false };
    }
  }

  if ((!result || !result.success) && GROQ_API_KEY) {
    console.log(`[chat] Falling back to Groq (${GROQ_MODEL})`);
    try {
      const fallbackScanner = createStreamScanner(PROMPT_FINGERPRINT);
      result = await streamGroq({
        apiKey: GROQ_API_KEY,
        messages: openaiMessages,
        maxTokens, res,
        scanner: fallbackScanner,
      });
    } catch (err) {
      console.error(`[${GROQ_MODEL}] Error:`, err.name === "AbortError" ? "Timed out" : err.message);
      result = { success: false };
    }
  }

  if (!result || !result.success) {
    sseEvent(res, { error: "EimemesChat is currently unavailable. Please try again shortly." });
    res.end(); return;
  }

  if (result.leaked) return;

  const finalDisclaimer = needsDisclaimer ? 'critical' : (shouldSearch ? 'web' : false);

  sseEvent(res, {
    done: true,
    model: result.model,
    reply: result.fullText,
    ...(result.thinkingText && { thinkingDone: true }),
    ...(finalDisclaimer && { disclaimer: finalDisclaimer }),
    ...(searchResults?.length && { sources: searchResults }),
  });

  if (isFirstMessage && result.fullText) {
    await generateTitle({ geminiApiKey: GEMINI_API_KEY, groqApiKey: GROQ_API_KEY, safeMessage, fullText: result.fullText, res });
  }

  res.end();

  /* ── Silent background memory extraction (best‑effort) ── */
  if (result.fullText && GEMINI_API_KEY) {
    extractAndUpdateMemories(uid, safeMessage, result.fullText, GEMINI_API_KEY)
      .catch(err => console.warn('[memory] Background extraction error:', err.message));
  }
}
