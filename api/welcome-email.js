// api/welcome-email.js — v2.3 — Premium dark welcome email
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

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to EimemesChat</title>
</head>

<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr>
<td align="center" style="padding:64px 24px;">

<table width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;">

<!-- Logo -->
<tr>
<td align="center" style="padding-bottom:40px;">
<a href="https://eimemes-chat-ai.vercel.app" target="_blank">
<img src="https://i.postimg.cc/VLwLSYtF/F4601C8F-006B-4327-ABED-2B46FA7366AF.png" alt="EimemesChat" width="56" height="56" style="display:block;border:0;border-radius:12px;">
</a>
</td>
</tr>

<!-- Heading -->
<tr>
<td align="center" style="padding-bottom:16px;">
<h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.35;font-weight:700;letter-spacing:-0.3px;">
Welcome, ${greetingName}
</h1>
</td>
</tr>

<!-- Body -->
<tr>
<td align="center" style="padding-bottom:14px;">
<p style="margin:0;color:#a3a3a3;font-size:15px;line-height:1.7;">
Thanks for creating an account. EimemesChat is an AI assistant built to help you think, write, search, and get things done — through natural conversation, in English or Kuki, however you prefer to talk.
</p>
</td>
</tr>
<tr>
<td align="center" style="padding-bottom:14px;">
<p style="margin:0;color:#a3a3a3;font-size:15px;line-height:1.7;">
There's nothing to configure. Sign in, ask a question, and it's ready to go — whether that's drafting something, searching the web, or just talking something through.
</p>
</td>
</tr>
<tr>
<td align="center" style="padding-bottom:36px;">
<p style="margin:0;color:#a3a3a3;font-size:15px;line-height:1.7;">
Glad to have you here.
</p>
</td>
</tr>

<!-- Button -->
<tr>
<td align="center" style="padding-bottom:44px;">
<a href="https://eimemes-chat-ai.vercel.app"
style="background:#ffffff;color:#0a0a0a;text-decoration:none;font-size:14.5px;font-weight:600;padding:13px 30px;border-radius:8px;display:inline-block;">
Open EimemesChat
</a>
</td>
</tr>

<!-- Footer -->
<tr>
<td align="center" style="border-top:1px solid #232323;padding-top:24px;">
<p style="margin:0;color:#5c5c5c;font-size:12.5px;line-height:1.6;">
© 2026 EimemesChat AI · MIT License
</p>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

    const text = `Welcome, ${greetingName}

Thanks for creating an account. EimemesChat is an AI assistant built to help you think, write, search, and get things done — through natural conversation, in English or Kuki, however you prefer to talk.

There's nothing to configure. Sign in, ask a question, and it's ready to go — whether that's drafting something, searching the web, or just talking something through.

Glad to have you here.

Open EimemesChat: https://eimemes-chat-ai.vercel.app

© 2026 EimemesChat AI · MIT License`;

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
