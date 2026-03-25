// api/title.js
// v1.0 — AI-generated chat title from first user message + AI reply
// Changelog:
//   v1.0 — Initial release; calls Groq with llama-3.1-8b-instant for fast title generation

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const ALLOWED_ORIGINS = [
  "https://eimemes-chat-ai.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  /* ── Auth ─────────────────────────────────────────────────────── */
  const idToken = (req.headers.authorization || "").replace("Bearer ", "");
  if (!idToken) return res.status(401).json({ error: "Unauthorized" });

  try {
    await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  const { userMessage, aiReply } = req.body;
  if (!userMessage || !aiReply) return res.status(400).json({ error: "userMessage and aiReply required" });

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 16,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: "You generate ultra-short chat titles. Output ONLY the title, 2-5 words max, no punctuation, no quotes, no explanation.",
          },
          {
            role: "user",
            content: `User said: "${userMessage.slice(0, 200)}"\nAI replied: "${aiReply.slice(0, 200)}"\n\nGenerate a 2-5 word title for this conversation.`,
          },
        ],
      }),
    });

    if (!groqRes.ok) return res.status(500).json({ error: "Groq request failed" });

    const data  = await groqRes.json();
    const title = data.choices?.[0]?.message?.content?.trim().slice(0, 60) || "";
    if (!title) return res.status(500).json({ error: "Empty title" });

    return res.status(200).json({ title });
  } catch (err) {
    console.error("[title] Error:", err.message);
    return res.status(500).json({ error: "Title generation failed" });
  }
}
