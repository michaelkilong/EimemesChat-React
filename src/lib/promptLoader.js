// src/lib/promptLoader.js
// v7 — Exclude 05-test-mode.md from fingerprint; still sent to AI as part of behavioral prompt
// v6 — Fingerprint only secret core files + suffix; formatting rules excluded
// v1-v5 — Original modular loader with auto-discovery of core/*.md
//
// Loads the modular system-prompt files from /prompts so the AI's
// persona, formatting rules, and future prompt modules can be edited
// without touching application code.
//
// prompts/core/*.md   → concatenated (filename order) into BEHAVIORAL_PROMPT,
//                       the actual system prompt sent to the model.
// prompts/security/*  → NOT sent to the model. Used only to build the
//                       leak-detection fingerprint (see shield.js).
//
// NOTE: uses process.cwd() instead of import.meta.url on purpose —
// this file gets transpiled to CommonJS by Vercel's build step, and
// import.meta.url doesn't survive that transform.

import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");
const CORE_DIR    = path.join(PROMPTS_DIR, "core");

function readModule(filePath) {
  return fs.readFileSync(filePath, "utf8").trimEnd();
}

// All core .md files → AI system prompt (unchanged)
function loadCorePrompt() {
  const files = fs.readdirSync(CORE_DIR)
    .filter(f => f.endsWith(".md"))
    .sort();
  return files
    .map(f => readModule(path.join(CORE_DIR, f)))
    .join("\n\n");
}

// Files to exclude from fingerprint (AI can safely repeat these)
const FINGERPRINT_EXCLUDE = ["05-test-mode.md"];

// Fingerprint prompt = all core files except the excluded ones + security suffix
function loadFingerprintPrompt() {
  const files = fs.readdirSync(CORE_DIR)
    .filter(f => f.endsWith(".md") && !FINGERPRINT_EXCLUDE.includes(f))
    .sort();
  const core = files
    .map(f => readModule(path.join(CORE_DIR, f)))
    .join("\n\n");

  const suffix = readModule(path.join(PROMPTS_DIR, "security", "fingerprint-suffix.md"));
  return core + "\n" + suffix;
}

export const BEHAVIORAL_PROMPT = loadCorePrompt();
export const FINGERPRINT_PROMPT = loadFingerprintPrompt();
