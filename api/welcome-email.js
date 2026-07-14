// api/welcome-email.js — v3.6 (full display name, clean fallback)
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

// ── Helper: get a friendly name ─────────────────────────────────
function getFriendlyName(displayName, email) {
  if (displayName && displayName.trim().length > 0) {
    return displayName.trim();                       // full name as user set it
  }
  // Fallback: cleaned first word from email local part
  const raw = (email || '').split('@')[0]
    .replace(/[0-9._-]/g, ' ')
    .trim()
    .split(/\s+/)[0];
  if (!raw) return 'there';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export default async function handler(req, res) {
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

    const name = getFriendlyName(displayName, email);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to EimemesChat</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Blue header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#2563eb;">
    <tr>
      <td align="center" style="padding:24px 24px 20px;">
        <img src="https://eimemes-chat-ai.vercel.app/chat-logo.png" alt="EimemesChat" width="56" height="56" style="display:block;margin:0 auto;">
      </td>
    </tr>
  </table>

  <!-- White body -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td style="padding:32px 24px;color:#334155;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 16px;">Dear <strong>${name}</strong>,</p>
        <p style="margin:0 0 16px;">Thank you for signing up for EimemesChat. We're glad to have you here.</p>
        <p style="margin:0 0 16px;">EimemesChat helps you write, research, and stay organised — just start a conversation.</p>
        <p style="margin:0;">Best wishes,<br/>Team EimemesChat</p>
      </td>
    </tr>
  </table>

  <!-- Grey footer with social icons -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px 24px 12px;">
        <a href="https://instagram.com/eimemeschat" style="margin:0 8px;text-decoration:none;display:inline-block;">
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@9/icons/instagram.svg" alt="Instagram" width="20" height="20" style="display:block;">
        </a>
        <a href="https://x.com/eimemeschat" style="margin:0 8px;text-decoration:none;display:inline-block;">
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@9/icons/x.svg" alt="X" width="20" height="20" style="display:block;">
        </a>
        <a href="https://facebook.com/eimemeschat" style="margin:0 8px;text-decoration:none;display:inline-block;">
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@9/icons/facebook.svg" alt="Facebook" width="20" height="20" style="display:block;">
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 24px 16px;color:#94a3b8;font-size:12px;">
        © 2026 EimemesChat AI
      </td>
    </tr>
  </table>

</body>
</html>`;

    const text = `Dear ${name},

Thank you for signing up for EimemesChat. We're glad to have you here.

EimemesChat helps you write, research, and stay organised — just start a conversation.

Best wishes,
Team EimemesChat

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
