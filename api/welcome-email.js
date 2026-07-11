// api/welcome-email.js — v1.4 — Gmail via dynamic nodemailer import
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

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to EimemesChat</title>
</head>

<body style="margin:0;padding:0;background:#f6f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;">
<tr>
<td align="center" style="padding:64px 20px;">

<table width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;background:#ffffff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 12px 40px rgba(0,0,0,0.06);">
<tr>
<td style="padding:56px 48px 48px;">

<!-- Mark -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding-bottom:36px;">
<div style="width:44px;height:44px;border:1.5px solid #0d0d0d;border-radius:50%;line-height:41px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:19px;color:#0d0d0d;">E</div>
</td>
</tr>
</table>

<!-- Eyebrow -->
<p style="margin:0 0 18px;text-align:center;color:#a39a8a;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">
A note for you
</p>

<!-- Note -->
<p style="margin:0 0 22px;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.6;text-align:center;">
Welcome to EimemesChat.
</p>

<p style="margin:0 0 22px;color:#4a4a4a;font-size:15px;line-height:1.85;text-align:center;">
We built this for conversations that feel natural — in English, in Kuki, in whatever way you think best. No manuals, no friction. Just open it and talk.
</p>

<p style="margin:0 0 40px;color:#4a4a4a;font-size:15px;line-height:1.85;text-align:center;">
That's really it. We're glad you're here.
</p>

<!-- CTA -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding-bottom:40px;">
<a href="https://eimemes-chat-ai.vercel.app"
style="background:#0d0d0d;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.3px;padding:14px 32px;border-radius:100px;display:inline-block;">
Start a conversation
</a>
</td>
</tr>
</table>

<!-- Signature -->
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ede8;padding-top:28px;">
<tr>
<td align="center">
<p style="margin:0;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;line-height:1.6;">
— The EimemesChat team
</p>
</td>
</tr>
</table>

</td>
</tr>
</table>

<!-- Footer -->
<table width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;">
<tr>
<td align="center" style="padding-top:32px;">
<p style="margin:0;color:#b8b0a4;font-size:11.5px;line-height:1.8;">
EimemesChat AI · Built for the Kuki community<br>
© 2026 EimemesChat AI
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

    await transporter.sendMail({
      from: `"EimemesChat AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to EimemesChat',
      text: "Welcome to EimemesChat. We built this for conversations that feel natural — in English, in Kuki, in whatever way you think best. We're glad you're here. — The EimemesChat team",
      html,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[welcome-email] Error:', err.message);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
}
