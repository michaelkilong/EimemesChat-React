// src/lib/promptLoader.js
// Loads the modular system-prompt files from /prompts so the AI's
// persona, formatting rules, and future prompt modules (knowledge.md,
// skills.md, etc.) can be edited without touching application code.
//
// prompts/core/*.md   → concatenated (filename order) into BEHAVIORAL_PROMPT,
//                       the actual system prompt sent to the model.
// prompts/security/*  → NOT sent to the model. Used only to build the
//                       leak-detection fingerprint (see shield.js).
//
// NOTE: uses process.cwd() instead of import.meta.url on purpose —
// this file gets transpiled to CommonJS by Vercel's build step, and
// import.meta.url doesn't survive that transform. process.cwd() works
// identically either way and is Vercel's documented pattern for
// resolving files added via vercel.json's "includeFiles".

import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");
const CORE_DIR    = path.join(PROMPTS_DIR, "core");

function readModule(filePath) {
  return fs.readFileSync(filePath, "utf8").trimEnd();
}

// Auto-discover every .md file in prompts/core, sorted by filename.
// Add new files (e.g. 03-knowledge.md, 04-skills.md) and they'll be
// picked up automatically on the next deploy — no code changes needed.
function loadCorePrompt() {
  const files = fs.readdirSync(CORE_DIR)
    .filter(f => f.endsWith(".md"))
    .sort();
  return files
    .map(f => readModule(path.join(CORE_DIR, f)))
    .join("\n\n");
}

export const BEHAVIORAL_PROMPT = loadCorePrompt();

const FINGERPRINT_SUFFIX = readModule(path.join(PROMPTS_DIR, "security", "fingerprint-suffix.md"));

export const FINGERPRINT_PROMPT = BEHAVIORAL_PROMPT + "\n" + FINGERPRINT_SUFFIX;

