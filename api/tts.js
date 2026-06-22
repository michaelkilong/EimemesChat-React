// api/tts.js — v1.5
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (['https://eimemes-chat-ai.vercel.app','http://localhost:5173','http://localhost:3000'].includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const text = (req.body?.text || '').slice(0, 2000).trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (!text) return res.status(400).json({ error: 'Text required' });

  try {
    const r = await fetch('https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4', {
      method: 'POST',
      headers: { 'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-48kbitrate-mono-mp3','User-Agent':'Mozilla/5.0' },
      body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="en-US-AriaNeural">${text}</voice></speak>`,
    });
    if (!r.ok) throw new Error(`TTS API ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
  } catch (e) {
    res.status(502).json({ error: 'TTS unavailable' });
  }
}
