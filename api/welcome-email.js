// api/welcome-email.js — v3.0 — Clean light welcome email
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

    const nodemailer = (await import('nodemailer')).default;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASS,
      },
    });

    const firstName = (displayName || email.split('@')[0]).trim();
    const greetingName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to EimemesChat</title>
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
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome, ${greetingName}</h1>
          </td>
        </tr>

        <!-- White body -->
        <tr>
          <td style="padding:32px 28px;color:#334155;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Thanks for creating an account. EimemesChat is an AI assistant built to help you think, write, search, and get things done — through natural conversation, in English or Kuki, however you prefer to talk.</p>
            <p style="margin:0 0 16px;">There's nothing to configure. Sign in, ask a question, and it's ready to go — whether that's drafting something, searching the web, or just talking something through.</p>
            <p style="margin:0;">Glad to have you here.</p>
          </td>
        </tr>

        <!-- Subtle footer -->
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

    const text = `Welcome, ${greetingName}

Thanks for creating an account. EimemesChat is an AI assistant built to help you think, write, search, and get things done — through natural conversation, in English or Kuki, however you prefer to talk.

There's nothing to configure. Sign in, ask a question, and it's ready to go — whether that's drafting something, searching the web, or just talking something through.

Glad to have you here.

© 2026 EimemesChat AI`;

    await transporter.sendMail({
      from: `"EimemesChat AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to EimemesChat',
      text,
      html,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[welcome-email] Error:', err.message);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
}
