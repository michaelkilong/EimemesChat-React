// api/welcome-email.js — v1.3 — Gmail via dynamic nodemailer import
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

    const userName = displayName || email.split('@')[0];

    await transporter.sendMail({
      from: `"EimemesChat AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `You're in, ${userName}.`,
      html: `
        <div style="background:#f4f5f7; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table role="presentation" width="100%" style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e8eaed;">
            <tr>
              <td style="background:#111827; padding:28px 32px;">
                <span style="color:#ffffff; font-size:18px; font-weight:600; letter-spacing:-0.02em;">EimemesChat AI</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px; font-size:22px; color:#111827; font-weight:700;">Welcome, ${userName}</h1>
                <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#4b5563;">
                  Your account is ready. EimemesChat AI is built to be fast, useful, and straightforward — no clutter, just a good place to think out loud.
                </p>

                <table role="presentation" width="100%" style="margin:20px 0; border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 0; border-bottom:1px solid #f0f1f3; font-size:14px; color:#374151;">💬 &nbsp; Real conversations, real-time replies</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; border-bottom:1px solid #f0f1f3; font-size:14px; color:#374151;">🔍 &nbsp; Live web search built in</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; border-bottom:1px solid #f0f1f3; font-size:14px; color:#374151;">📎 &nbsp; Upload and analyze files</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; border-bottom:1px solid #f0f1f3; font-size:14px; color:#374151;">🎤 &nbsp; Talk to it, out loud</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; font-size:14px; color:#374151;">📱 &nbsp; Install it as an app on your phone</td>
                  </tr>
                </table>

                <a href="https://eimemes-chat-ai.vercel.app" style="display:inline-block; margin-top:12px; background:#111827; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:12px 24px; border-radius:8px;">
                  Start chatting →
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background:#fafafa; border-top:1px solid #f0f1f3;">
                <p style="margin:0; font-size:12px; color:#9ca3af;">
                  Questions? Just reply to this email, or visit our <a href="https://app-eimemeschat.vercel.app/support.html" style="color:#6b7280;">support page</a>.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[welcome-email] Error:', err.message);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
}
