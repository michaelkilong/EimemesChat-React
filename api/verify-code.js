// api/verify-code.js
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

  const { uid, code } = req.body;
  if (!uid || !code) return res.status(400).json({ error: 'Missing uid or code' });

  // Rate limit: 5 attempts per 10 min per user
  const counterRef = db.collection('verificationAttempts').doc(uid);
  const now = Date.now();
  const snap = await counterRef.get();
  const data = snap.exists ? snap.data() : {};
  const windowStart = data.windowStart || 0;
  const attempts = (now - windowStart < 600000) ? (data.count || 0) : 0;

  if (attempts >= 5) {
    return res.status(429).json({ error: 'Too many attempts. Please request a new code and try again.' });
  }

  await counterRef.set({
    windowStart: attempts === 0 ? now : (data.windowStart || now),
    count: attempts + 1,
  }, { merge: true });

  try {
    const tokenDoc = await db.collection('emailVerificationCodes').doc(uid).get();
    if (!tokenDoc.exists) return res.status(400).json({ error: 'No verification code found. Please request a new one.' });

    const tokenData = tokenDoc.data();
    if (tokenData.code !== code) return res.status(400).json({ error: 'Invalid code' });

    if (tokenData.expiresAt.toDate() < new Date()) {
      await tokenDoc.ref.delete();
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    await db.collection('users').doc(uid).set({ emailVerified: true }, { merge: true });
    await admin.auth().updateUser(uid, { emailVerified: true });

    await tokenDoc.ref.delete();
    await counterRef.delete();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[verify-code] Error:', err.message);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
