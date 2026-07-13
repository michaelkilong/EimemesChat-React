// api/bug-report.js — v2.0 (reply-to user, shows name & email)
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASS,
  },
});

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowed = ['https://eimemes-chat-ai.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { message, reporterName, reporterEmail } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Rate limit (1/min, 10/day)
    const userRef = db.collection('bugReportCounters').doc(uid);
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const doc = await userRef.get();
    const data = doc.exists ? doc.data() : {};
    const lastTimestamp = data.lastReportAt || 0;
    const countToday = data.date === today ? (data.count || 0) : 0;

    if (now - lastTimestamp < 60_000)
      return res.status(429).json({ error: 'Please wait a moment before sending another report.' });
    if (countToday >= 10)
      return res.status(429).json({ error: 'Daily limit reached. Try again tomorrow.' });

    await userRef.set({ lastReportAt: now, date: today, count: countToday + 1 }, { merge: true });

    // Build readable name
    const name = reporterName?.trim() || 'User';
    const userEmail = reporterEmail || 'unknown@email';

    // ── Send email with reply‑to set to the reporter ──
    await transporter.sendMail({
      from: `"EimemesChat Bug Report" <${process.env.EMAIL_USER}>`,
      to: 'support.eimemeschat@gmail.com',
      replyTo: userEmail,                    // ← you can reply directly
      subject: `Bug Report from ${name}`,
      text: `New bug report from:

👤 Name: ${name}
📧 Email: ${userEmail}

Message:
${message}`,
      html: `
        <h2>New Bug Report</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
        <hr/>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[bug-report] Error:', err.message);
    return res.status(500).json({ error: 'Failed to send report' });
  }
}
