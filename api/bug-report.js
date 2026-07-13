// api/bug-report.js — v1.1 — shows email instead of UID
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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASS,
  },
});

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://eimemes-chat-ai.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  if (allowedOrigins.includes(origin)) {
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

    const { message, reporterName, reporterEmail } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Use display name if available, otherwise fall back to email
    const name = reporterName?.trim() || reporterEmail?.split('@')[0] || 'User';

    const html = `
      <h2>New Bug Report</h2>
      <p><strong>From:</strong> ${name}${reporterEmail ? ` (${reporterEmail})` : ''}</p>
      <hr/>
      <p>${message.replace(/\n/g, '<br/>')}</p>
    `;

    const text = `New bug report submitted by:

Name: ${name}
Email: ${reporterEmail || 'N/A'}

Message:
${message}`;

    await transporter.sendMail({
      from: `"EimemesChat Bug Report" <${process.env.EMAIL_USER}>`,
      to: 'support.eimemeschat@gmail.com',
      subject: `Bug Report from ${name}`,
      text,
      html,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[bug-report] Error:', err.message);
    return res.status(500).json({ error: 'Failed to send bug report' });
  }
}
