// shield.js — EimemesChat Prompt Shield v2.0
// Structural approach: fingerprint the actual system prompt text,
// scan every streaming chunk in real-time, abort on match.
// No reliance on instruction-based prevention.

/* ══════════════════════════════════════════════════════════════
   SYSTEM PROMPT FINGERPRINTING
   Generates distinctive n-grams from the real system prompt so
   we can detect verbatim leakage in model output at stream time.
══════════════════════════════════════════════════════════════ */

/**
 * Extract all overlapping word n-grams of a given size from text.
 * n=5 is long enough to avoid false positives on common phrases,
 * short enough to catch partial leaks.
 */
function extractNgrams(text, n = 5) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const ngrams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

/**
 * Build a fingerprint object from a system prompt string.
 * Call this ONCE at module load — pass the result into createStreamScanner().
 *
 * @param {string} systemPrompt  The full system prompt text
 * @returns {SystemPromptFingerprint}
 */
export function buildFingerprint(systemPrompt) {
  return {
    ngrams5: extractNgrams(systemPrompt, 5), // high-specificity matches
    ngrams4: extractNgrams(systemPrompt, 4), // catches partial leaks
  };
}

/* ══════════════════════════════════════════════════════════════
   REAL-TIME STREAMING SCANNER
   Create one scanner per response. Call checkChunk() on every
   token BEFORE writing it to the client response.
   It uses a rolling word window so n-grams that span multiple
   small token chunks are still detected.
══════════════════════════════════════════════════════════════ */

/**
 * @param {ReturnType<buildFingerprint>} fingerprint
 * @returns {{ checkChunk: (token: string) => string|null }}
 *   checkChunk returns null when safe, or the leaking gram string when leaked.
 */
export function createStreamScanner(fingerprint) {
  let wordBuf = []; // rolling window of recent words
  const WINDOW = 12;

  function wordsFrom(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function findMatch(words, ngrams, n) {
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(" ");
      if (ngrams.has(gram)) return gram;
    }
    return null;
  }

  return {
    /**
     * @param {string} token  A single decoded token from the model
     * @returns {string|null}  null = safe to forward; string = leaked gram (abort!)
     */
    checkChunk(token) {
      wordBuf = [...wordBuf, ...wordsFrom(token)].slice(-WINDOW);

      // Check 5-grams first (most reliable signal)
      const leak5 = findMatch(wordBuf, fingerprint.ngrams5, 5);
      if (leak5) return leak5;

      // Check 4-grams as secondary check
      const leak4 = findMatch(wordBuf, fingerprint.ngrams4, 4);
      if (leak4) return leak4;

      return null;
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   INPUT SHIELD
   Runs on the raw user message before it ever reaches the model.
   Blocks prompt injection, extraction tricks, and harmful requests.
══════════════════════════════════════════════════════════════ */

const INJECTION_PATTERNS = [
  // Classic instruction overrides
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompt|rules?|context|constraints?)/i,
  /forget\s+(everything|all|what\s+you|your\s+(previous|prior|system))/i,
  /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompt|rules?)/i,
  /override\s+(your|the|all)\s*(system\s+)?(prompt|instructions?|rules?|constraints?)/i,
  /new\s+(persona|role|instructions?|system\s+prompt|identity|character|mode)/i,
  /system\s*:\s*you\s+are/i,

  // Direct extraction
  /repeat\s+(back\s+|verbatim\s+|exactly\s+)?(your\s+)?(system\s+prompt|instructions?|initial\s+prompt|first\s+message)/i,
  /(print|reveal|show|output|quote|display|summarize|paraphrase|describe)\s+(your|the)\s+(system\s+prompt|instructions?|full\s+prompt|raw\s+instructions?|persona|behavior|configuration|config|rules?|guidelines?|constraints?)/i,
  /what\s+(are|is)\s+(your\s+)?(exact\s+)?(system\s+prompt|instructions?|initial\s+prompt|rules?|guidelines?|persona)/i,
  /how\s+(are|were)\s+you\s+(configured|instructed|programmed|set\s+up|prompted|built|designed|told)/i,
  /what\s+(were\s+you|are\s+you)\s+(told|instructed|programmed|configured|prompted)\s+to/i,
  /what\s+(instructions?|rules?|guidelines?|directives?|constraints?)\s+(were\s+you|are\s+you)\s+(given|following|using)/i,
  /tell\s+me\s+(about\s+)?(your\s+)?(system\s+prompt|instructions?|rules?|persona|configuration|how\s+you\s+work)/i,
  /what\s+is\s+your\s+(persona|role|character|identity|purpose|goal|objective|mission|directive)/i,
  /describe\s+(your\s+)?(system\s+prompt|instructions?|persona|configuration|how\s+you\s+(behave|work|operate))/i,
  /are\s+you\s+(instructed|programmed|configured|told)\s+to/i,

  // ── THE KEY ONES: indirect "output above text" style attacks ──
  /output\s+(the\s+)?(above|previous|prior|earlier|preceding)\s+(text|message|content|prompt|instructions?|context)/i,
  /repeat\s+(the\s+)?(above|previous|prior|earlier|preceding)\s+(text|message|content|prompt|instructions?)/i,
  /copy\s+(the\s+)?(above|previous|prior|earlier|preceding)\s+(text|message|content|prompt|instructions?)/i,
  /print\s+(the\s+)?(above|previous|prior|earlier|preceding)\s+(text|message|content|prompt|instructions?)/i,
  /write\s+out\s+(the\s+)?(above|previous|prior|earlier)/i,

  // Code block exfiltration tricks
  /put\s+(the\s+)?(above|previous|prior|earlier|that|it|this|everything|all).{0,30}(code\s+block|markdown|verbatim|backtick)/i,
  /format\s+(the\s+)?(above|previous|prior|earlier|that|it|this).{0,30}(code\s+block|markdown|verbatim)/i,
  /place\s+(the\s+)?(above|previous|prior|earlier|that|it|this).{0,30}(code\s+block|markdown|verbatim)/i,
  /wrap\s+(the\s+)?(above|previous|prior|earlier|that|it|this).{0,30}(code\s+block|markdown|backtick)/i,
  /enclose\s+(the\s+)?(above|previous|prior|earlier|that|it|this).{0,30}(code\s+block|markdown)/i,
  /show\s+(it|that|this|everything|all)\s+(in|into|as)\s+(a\s+)?code\s+block/i,
  /output\s+(it|that|this|everything|all)\s+(in|into|as)\s+(a\s+)?code\s+block/i,
  /display\s+(it|that|this|everything|all)\s+(in|into|as)\s+(a\s+)?code\s+block/i,
  /reformat\s+(it|that|this|everything|all)\s+(as|in)\s+(a\s+)?code\s+block/i,

  // Format/encoding conversion exfiltration
  /convert\s+(it|that|this|the\s+(above|previous|prior|earlier)).{0,30}(json|yaml|xml|base64|hex|binary)/i,
  /translate\s+(it|that|this|the\s+(above|previous|prior|earlier)).{0,30}(json|yaml|xml|base64|rot13|hex|morse)/i,
  /base64\s*(decode|encode|:)/i,

  // Jailbreak techniques
  // Note: standalone /\bDAN\b/ removed — false-positives on the name "Dan".
  // The actual jailbreak phrase is caught by the pattern below.
  /do\s+anything\s+now/i,
  /jailbreak/i,
  /\bdev(eloper)?\s+mode\b/i,
  /act\s+as\s+(if\s+you\s+(are|were|have\s+no)\s+)?(?:an?\s+)?(evil|unrestricted|uncensored|unfiltered|unethical)/i,
  /pretend\s+(you\s+)?(have\s+no\s+(restrictions?|rules?|limits?|guidelines?|ethics?))/i,
  /you\s+have\s+no\s+(restrictions?|limits?|rules?|ethics?|guidelines?)/i,
  /bypass\s+(safety|filter|restriction|content\s+policy)/i,
];

const HARMFUL_PATTERNS = [
  /how\s+to\s+(make|build|create|synthesize|produce)\s+(a\s+)?(bomb|explosive|grenade|poison|nerve\s+agent|chemical\s+weapon|bioweapon|meth|fentanyl|heroin)/i,
  /step[s\-]*\s*(by[- ]step)?\s*(guide|instructions?)\s*(to|for)\s*(kill|harm|hurt|attack|bomb)/i,
  /\b(child|minor|underage|kid).{0,30}(sex|nude|naked|porn|explicit)/i,
  /\b(sex|nude|naked|porn|explicit).{0,30}(child|minor|underage|kid)/i,
];

const MAX_INPUT_LENGTH = 4000;

/**
 * @param {string} message
 * @returns {{ blocked: boolean, reason?: string, sanitized: string }}
 */
export function shieldInput(message) {
  if (typeof message !== "string") {
    return { blocked: true, reason: "invalid_input", sanitized: "" };
  }

  const sanitized = message.slice(0, MAX_INPUT_LENGTH).trim();
  if (!sanitized) return { blocked: true, reason: "empty_message", sanitized };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn(`[shield:input] BLOCKED injection — ${pattern}`);
      return { blocked: true, reason: "prompt_injection", sanitized };
    }
  }

  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn(`[shield:input] BLOCKED harmful — ${pattern}`);
      return { blocked: true, reason: "harmful_content", sanitized };
    }
  }

  return { blocked: false, sanitized };
}

/* ══════════════════════════════════════════════════════════════
   USER-FACING BLOCK MESSAGES
══════════════════════════════════════════════════════════════ */
export function getBlockMessage(reason) {
  const map = {
    prompt_injection:
      "⚠️ That request was flagged as a potential prompt manipulation attempt. Please rephrase your question!",
    harmful_content:
      "⚠️ I'm not able to help with that. Try asking something else! 😊",
    system_leak:
      "I can't share that information — it's confidential. Ask me something else! 😊",
    empty_message: "Please type a message first.",
    invalid_input: "Something went wrong. Please try again.",
  };
  return map[reason] ?? "I couldn't process that request. Please try again.";
}

