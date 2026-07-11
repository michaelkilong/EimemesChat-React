// api/welcome-email.js — v1.2 — Gmail via dynamic nodemailer import
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  if (['https://eimemes-chat-ai.vercel.app', 'http://localhost:5173', 'http://localhost:3000'].includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await admin.auth().verifyIdToken(idToken);

    const { email, displayName } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Dynamic import — only loaded at runtime on the server
    const nodemailer = (await import('nodemailer')).default;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASS,
      },
    });

    const userName = displayName || email.split('@')[0];

    await transporter.sendMail({
      from: `"EimemesChat AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to EimemesChat AI! ✦',
      html: `
        <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, sans-serif; color: #1e2b3c;">
          <h2 style="color: #0a84ff;">Welcome, ${userName}! ✦</h2>
          <p>Thank you for joining <strong>EimemesChat AI</strong> — your intelligent, privacy‑first AI assistant.</p>
          <p>You can start chatting right away. Here are a few things you can do:</p>
          <ul>
            <li>💬 Chat with AI — fast, conversational replies</li>
            <li>🔍 Search the web in real time</li>
            <li>📎 Upload files for analysis</li>
            <li>🎤 Use voice input and output</li>
            <li>📱 Install as a PWA on your phone</li>
          </ul>
          <p>If you have any questions, just reply to this email or visit our <a href="https://app-eimemeschat.vercel.app/support.html">support page</a>.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #8a9bb5;">
            — The EimemesChat AI Team
          </p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[welcome-email] Error:', err.message);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
}
