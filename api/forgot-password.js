// api/forgot-password.js
import admin from 'firebase-admin';
import crypto from 'crypto';

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
  // CORS
  const origin = req.headers.origin || '';
  const allowed = ['https://eimemes-chat-ai.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Rate limit per IP: 1 per 60 seconds
  const ip = req.headers['x-vercel-ip'] || req.socket?.remoteAddress || 'ip-unavailable';
  const ipRef = db.collection('passwordResetRateLimits').doc(ip);
  const now = Date.now();

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ipRef);
      const data = doc.exists ? doc.data() : {};
      if (now - (data.lastRequest || 0) < 60_000) {
        throw new Error('RATE_LIMITED');
      }
      tx.set(ipRef, { lastRequest: now }, { merge: true });
    });
  } catch (err) {
    if (err.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    return res.status(500).json({ error: 'Service unavailable' });
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(now + 30 * 60 * 1000);

    await db.collection('passwordResetTokens').doc(uid).set({
      token,
      expiresAt,
      createdAt: new Date(now),
      used: false,
    });

    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASS,
      },
    });

    const resetLink = `${process.env.APP_URL || 'https://eimemes-chat-ai.vercel.app'}/reset-password?token=${token}&uid=${uid}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset your password — EimemesChat</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#2563eb;">
    <tr>
      <td align="center" style="padding:24px 24px 20px;">
        <img src="https://eimemes-chat-ai.vercel.app/chat-logo.png" alt="EimemesChat" width="56" height="56" style="display:block;margin:0 auto;">
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td style="padding:32px 24px;color:#334155;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 16px;">Dear user,</p>
        <p style="margin:0 0 24px;">You requested a password reset. Click the button below to choose a new password. This link expires in 30 minutes.</p>
        <div style="text-align:center; margin-bottom:24px;">
          <a href="${resetLink}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">Reset Password</a>
        </div>
        <p style="margin:0;color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px 24px;color:#94a3b8;font-size:12px;">
        © 2026 EimemesChat AI
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `You requested a password reset for your EimemesChat account.\n\nCopy and paste the following link into your browser to reset your password:\n${resetLink}\n\nThis link expires in 30 minutes.\n\nIf you didn't request this, you can ignore this email.\n\n© 2026 EimemesChat AI`;

    await transporter.sendMail({
      from: `"EimemesChat AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your password — EimemesChat',
      text,
      html,
    });
  } catch {
    // User not found or email failed – still return success to prevent enumeration
  }

  return res.status(200).json({ success: true });
}
