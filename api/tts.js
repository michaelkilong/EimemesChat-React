// api/tts.js — v1.2 — Direct Microsoft Edge TTS API (no package, no key, free)
export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────
  const origin = req.headers.origin || '';
  const allowed = [
    'https://eimemes-chat-ai.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Input ────────────────────────────────────────────────────
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text required' });
  }

  const safeText = text.slice(0, 2000).trim();

  // ── Microsoft Edge TTS (free, no key required) ───────────────
  try {
    // Construct SSML for the request
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="en-US-AriaNeural">
        ${safeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </voice>
    </speak>`;

    const response = await fetch(
      `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: ssml,
      }
    );

    if (!response.ok) throw new Error(`TTS API returned ${response.status}`);

    const audioBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error('[tts] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS unavailable. Please try again.' });
    }
  }
}
