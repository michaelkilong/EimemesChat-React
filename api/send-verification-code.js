// api/send-verification-code.js — v1.1 (clean light theme, matching welcome email)
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
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:48px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Blue header -->
        <tr>
          <td style="background:#2563eb;padding:32px 24px;text-align:center;">
            <img src="https://eimemes-chat-ai.vercel.app/chat-logo.png" alt="EimemesChat" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Verify your email</h1>
          </td>
        </tr>

        <!-- White body -->
        <tr>
          <td style="padding:32px 28px;color:#334155;font-size:15px;line-height:1.7;text-align:center;">
            <p style="margin:0 0 24px;">Use the 6‑digit code below to verify your email address and start using EimemesChat.</p>

            <!-- Code box -->
            <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;padding:20px 36px;display:inline-block;margin-bottom:24px;">
              <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#1e293b;font-family:monospace;">${code}</span>
            </div>

            <p style="margin:0;color:#64748b;font-size:13px;">This code expires in 10 minutes.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;color:#94a3b8;font-size:12px;">
            © 2026 EimemesChat AI
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = `Your verification code for EimemesChat is: ${code}\n\nIt expires in 10 minutes.\n\n© 2026 EimemesChat AI`;

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
