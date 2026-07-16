// api/reset-password.js
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

  const { uid, token, newPassword } = req.body;
  if (!uid || !token || !newPassword) return res.status(400).json({ error: 'Missing parameters' });

  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  // Rate limit per UID: 5 attempts per 10 minutes
  const attemptRef = db.collection('passwordResetAttempts').doc(uid);
  const now = Date.now();

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(attemptRef);
      const data = doc.exists ? doc.data() : {};
      const windowStart = data.windowStart || 0;
      const attempts = (now - windowStart < 600_000) ? (data.count || 0) : 0;
      if (attempts >= 5) throw new Error('TOO_MANY_ATTEMPTS');
      tx.set(attemptRef, {
        windowStart: attempts === 0 ? now : (data.windowStart || now),
        count: attempts + 1,
      }, { merge: true });
    });
  } catch (err) {
    if (err.message === 'TOO_MANY_ATTEMPTS') {
      return res.status(429).json({ error: 'Too many attempts. Please request a new reset link.' });
    }
    return res.status(500).json({ error: 'Service unavailable' });
  }

  try {
    const tokenDoc = await db.collection('passwordResetTokens').doc(uid).get();
    if (!tokenDoc.exists) return res.status(400).json({ error: 'Invalid or expired token.' });

    const data = tokenDoc.data();
    if (data.token !== token) return res.status(400).json({ error: 'Invalid token.' });
    if (data.used) return res.status(400).json({ error: 'Token already used.' });
    if (data.expiresAt.toDate() < new Date()) {
      await tokenDoc.ref.delete();
      return res.status(400).json({ error: 'Token expired.' });
    }

    await admin.auth().updateUser(uid, { password: newPassword });
    await tokenDoc.ref.update({ used: true });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[reset-password] Error:', err.message);
    return res.status(500).json({ error: 'Password reset failed.' });
  }
}
