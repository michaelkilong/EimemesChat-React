// api/send-verification-code.js — v2.2 (static IP fallback, no UUID bypass)
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

// ── Robust client IP using Vercel's trusted header ──────────────
function getClientIP(req) {
  // Vercel's secure, non‑spoofable IP header
  if (req.headers['x-vercel-ip']) return req.headers['x-vercel-ip'];
  // Fallback to forwarded chain (less trusted, but okay on Vercel)
  const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (fwd) return fwd;
  // Static fallback – all IP‑less requests share the same rate‑limit bucket
  return 'ip-unavailable';
}

// ── Atomic per‑IP rate limit (3 requests / 10 min) ─────────────
async function checkIPRateLimit(ip) {
  const ref = db.collection('ipRateLimits').doc(ip);
  try {
    return await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.exists ? doc.data() : {};
      const now = Date.now();
      const windowStart = data.windowStart || 0;
      const count = (now - windowStart < 600_000) ? (data.count || 0) : 0;

      if (count >= 3) return false;

      tx.set(ref, {
        windowStart: count === 0 ? now : (data.windowStart || now),
        count: count + 1,
        lastRequest: now,
      }, { merge: true });

      return true;
    });
  } catch (err) {
    console.error('[ip-rate] Transaction failed:', err.message);
    return false;
  }
}

// ── Atomic per‑user rate limit + code creation ──────────────────
async function tryCreateVerificationCode(uid) {
  const userRef = db.collection('verificationRateLimits').doc(uid);
  const codeRef = db.collection('emailVerificationCodes').doc(uid);

  const code = String(crypto.randomInt(100000, 1000000));
  const now = Date.now();
  const expiresAt = new Date(now + 10 * 60 * 1000);

  try {
    return await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      const data = userDoc.exists ? userDoc.data() : {};
      const lastSent = data.lastSent || 0;
      const windowStart = data.windowStart || 0;
      const countInWindow = (now - windowStart < 600_000) ? (data.count || 0) : 0;

      // 1‑minute cooldown
      if (now - lastSent < 60_000) return null;
      // 3‑per‑10‑min limit
      if (countInWindow >= 3) return null;

      // Write both rate‑limit counters and verification code in one atomic step
      tx.set(userRef, {
        lastSent: now,
        windowStart: countInWindow === 0 ? now : (data.windowStart || now),
        count: countInWindow + 1,
      }, { merge: true });

      tx.set(codeRef, {
        code,
        expiresAt,
        createdAt: new Date(now),
      });

      return code;
    });
  } catch (err) {
    console.error('[user-rate+code] Transaction failed:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://eimemes-chat-ai.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Per‑IP rate limit
  const ip = getClientIP(req);
  const ipAllowed = await checkIPRateLimit(ip);
  if (!ipAllowed) {
    return res.status(429).json({ error: 'Too many requests from this IP. Try again later.' });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const uid = decoded.uid;
  const email = decoded.email;

  // ── Guard: only accounts with an email can receive codes ────
  if (!email) {
    return res.status(400).json({ error: 'No email address is associated with this account.' });
  }

  // 2. Reject already‑verified users
  if (decoded.email_verified) {
    return res.status(400).json({ error: 'Email is already verified.' });
  }

  // 3. Atomic: rate‑limit check + code creation
  const code = await tryCreateVerificationCode(uid);
  if (!code) {
    return res.status(429).json({ error: 'Wait a moment before requesting another code.' });
  }

  // 4. Send email
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
        <p style="margin:0 0 16px;">Dear <strong>${email.split('@')[0]}</strong>,</p>
        <p style="margin:0 0 24px;">Use the 6‑digit code below to verify your email address and start using EimemesChat.</p>

        <!-- Code box -->
        <div style="text-align:center; margin-bottom:24px;">
          <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;padding:20px 36px;display:inline-block;">
            <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#1e293b;font-family:monospace;">${code}</span>
          </div>
        </div>

        <p style="margin:0;color:#64748b;font-size:13px;">This code expires in 10 minutes.</p>
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
