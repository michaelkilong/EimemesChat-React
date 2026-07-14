// api/send-verification-code.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://eimemes-chat-ai.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

  let uid, email;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Rate limit: 1 per 60s, 3 per 10 min
  const counterRef = db.collection('verificationRateLimits').doc(uid);
  const now = Date.now();
  const snap = await counterRef.get();
  const data = snap.exists ? snap.data() : {};
  const lastSent = data.lastSent || 0;
  const windowStart = data.windowStart || 0;
  const countInWindow = (now - windowStart < 600000) ? (data.count || 0) : 0;

  if (now - lastSent < 60000) {
    return res.status(429).json({ error: 'Wait a moment before requesting another code.' });
  }
  if (countInWindow >= 3) {
    return res.status(429).json({ error: 'Too many codes requested. Try again later.' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(now + 10 * 60 * 1000);

  await db.collection('emailVerificationCodes').doc(uid).set({
    code,
    expiresAt,
    createdAt: new Date(),
  });

  await counterRef.set({
    lastSent: now,
    windowStart: countInWindow === 0 ? now : (data.windowStart || now),
    count: countInWindow + 1,
  }, { merge: true });

  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASS,
    },
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your email — EimemesChat</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr>
<td align="center" style="padding:64px 24px;">
<table width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;">
<tr>
<td align="center" style="padding-bottom:40px;">
<img src="https://i.postimg.cc/VLwLSYfT/F4601C8F-006B-4327-ABED-2B46FA7366AF.png" alt="EimemesChat" width="56" height="56" style="display:block;border:0;border-radius:12px;">
</td>
</tr>
<tr>
<td align="center" style="padding-bottom:16px;">
<h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.35;font-weight:700;">Your verification code</h1>
</td>
</tr>
<tr>
<td align="center" style="padding-bottom:14px;">
<p style="margin:0;color:#a3a3a3;font-size:15px;line-height:1.7;">Use the 6‑digit code below to verify your email address and start using EimemesChat.</p>
</td>
</tr>
<tr>
<td align="center" style="padding-bottom:24px;">
<div style="display:inline-block;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:16px 40px;font-size:32px;font-weight:700;letter-spacing:8px;color:#ffffff;font-family:monospace;">${code}</div>
</td>
</tr>
<tr>
<td align="center" style="padding-bottom:36px;">
<p style="margin:0;color:#5c5c5c;font-size:13px;">This code expires in 10 minutes.</p>
</td>
</tr>
<tr>
<td align="center" style="border-top:1px solid #232323;padding-top:24px;">
<p style="margin:0;color:#5c5c5c;font-size:12.5px;">© 2026 EimemesChat AI</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

  const text = `Your verification code for EimemesChat is: ${code}\n\nIt expires in 10 minutes.`;

  try {
    await transporter.sendMail({
      from: `"EimemesChat AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your email — EimemesChat',
      text,
      html,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-verification-code] Email error:', err.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
