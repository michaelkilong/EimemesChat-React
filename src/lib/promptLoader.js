// src/lib/promptLoader.js
// v2 — Fingerprint now built from suffix only to prevent false leak blocks
import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");
const CORE_DIR    = path.join(PROMPTS_DIR, "core");

function readModule(filePath) {
  return fs.readFileSync(filePath, "utf8").trimEnd();
}

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

// 🔥 KEY CHANGE: fingerprint is now ONLY the secret suffix,
// not the entire system prompt. This prevents false positives
// when the AI naturally echoes harmless parts of its own persona.
export const FINGERPRINT_PROMPT = FINGERPRINT_SUFFIX;
