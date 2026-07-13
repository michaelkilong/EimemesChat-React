// api/bug-report.js — v1.0 — sends bug report to support email
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
  // CORS
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

  // Auth check – user must be logged in
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await admin.auth().verifyIdToken(idToken);

    const { message, reporterName, reporterEmail, reporterUid } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const name = reporterName || 'Anonymous';

    const html = `
      <h2>New Bug Report</h2>
      <p><strong>From:</strong> ${name}</p>
      <p><strong>Email:</strong> ${reporterEmail || 'N/A'}</p>
      <p><strong>User ID:</strong> ${reporterUid || 'N/A'}</p>
      <hr/>
      <p>${message.replace(/\n/g, '<br/>')}</p>
    `;

    const text = `New bug report submitted by:

Name: ${name}
Email: ${reporterEmail || 'N/A'}
User ID: ${reporterUid || 'N/A'}

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
