// v2 api/verify-code.js
import admin from 'firebase-admin';
import crypto from 'node:crypto';

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

  try {
    // ── Auth: require a Firebase ID token. Ignore any uid sent in the body. ──
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

    let uid;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Missing code' });

    // ── Rate limit: 5 attempts per 10 min per user (atomic) ──
    const counterRef = db.collection('verificationAttempts').doc(uid);
    const now = Date.now();

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(counterRef);
        const data = snap.exists ? snap.data() : {};
        const expired = !data.windowStart || (now - data.windowStart >= 600000);

        if (!expired && (data.count || 0) >= 5) {
          throw new Error('RATE_LIMITED');
        }

        tx.set(counterRef, {
          windowStart: expired ? now : data.windowStart,
          count: expired ? 1 : (data.count || 0) + 1,
        }, { merge: true });
      });
    } catch (e) {
      if (e && e.message === 'RATE_LIMITED') {
        await db.collection('emailVerificationCodes').doc(uid).delete().catch(() => {});
        return res.status(429).json({ error: 'Too many attempts. Please request a new code and try again.' });
      }
      throw e;
    }

    // ── Load the code doc ──
    const tokenRef = db.collection('emailVerificationCodes').doc(uid);
    const tokenDoc = await tokenRef.get();
    if (!tokenDoc.exists) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }

    const tokenData = tokenDoc.data();

    // ── Constant-time code comparison ──
    const stored = String(tokenData.code ?? '');
    const provided = String(code);
    let matches = false;
    if (stored.length > 0 && stored.length === provided.length) {
      matches = crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(provided));
    }
    if (!matches) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // ── Expiry check — tolerant of Timestamp / date-string / ms ──
    const expiresAt = typeof tokenData.expiresAt?.toDate === 'function'
      ? tokenData.expiresAt.toDate()
      : new Date(tokenData.expiresAt);
    if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      await tokenRef.delete().catch(() => {});
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    // ── Mark verified in Firebase Auth first (source of truth) ──
    await admin.auth().updateUser(uid, { emailVerified: true });

    // ── Best-effort cleanup — don't fail the request if these fail ──
    await Promise.allSettled([
      tokenRef.delete(),
      counterRef.delete(),
      db.collection('users').doc(uid).set({ emailVerified: true }, { merge: true }),
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[verify-code] Error:', err?.message || err);
    if (!res.headersSent) return res.status(500).json({ error: 'Verification failed' });
  }
}
