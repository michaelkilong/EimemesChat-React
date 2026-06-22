// api/tts.js — v1.0 — Free neural TTS via Microsoft Edge (no API key, unlimited)
import { EdgeTTS } from 'edge-tts';

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

  // ── TTS ──────────────────────────────────────────────────────
  try {
    const tts = new EdgeTTS({
      voice: 'en-US-AriaNeural',   // warm female – natural & clear
      rate: '+0%',
      pitch: '+0Hz',
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    await tts.stream(safeText, res);
  } catch (err) {
    console.error('[tts] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS unavailable. Please try again.' });
    }
  }
}
