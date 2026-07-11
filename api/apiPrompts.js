// prompts/apiPrompts.js
// Centralised prompt strings for the chat API.
// v1.0 — extracted from api/chat.js to keep that file lean.

export function buildMemoryExtractionPrompt(existingBlock, safeUserMsg, safeAiReply) {
  return `You are a memory manager for an AI assistant. Analyse this conversation exchange and decide what to remember about the user.

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
}

export function buildSearchOptimizationPrompt(message, historyContext = '') {
  if (historyContext) {
    return `Conversation so far:
${historyContext}

Latest user message: "${message}"

Convert the user's intent into an optimal web search query (a few keywords). Output ONLY the query.`;
  }
  return `Convert the user message into an optimal web search query. Output ONLY the search query — no explanation, no quotes, no punctuation at the end.`;
}

export function buildTitlePrompt(safeMessage, fullText) {
  return `User: "${safeMessage.slice(0, 200)}"
AI: "${fullText.slice(0, 200)}"

Generate an ultra-short chat title — 2-5 words, no punctuation, no quotes. Output ONLY the title.`;
}
