// src/firebase.ts (web app)
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBN2p4Cwovn6uNs_bayDClloRpVdXOzJ3U',
  authDomain: 'chat-eimeme.firebaseapp.com',
  projectId: 'chat-eimeme',
  storageBucket: 'chat-eimeme.firebasestorage.app',
  messagingSenderId: '230417181657',
  appId: '1:230417181657:web:dfa64664a3d9931bf387c8',
  measurementId: 'G-B89BXS66V',
};

const app  = initializeApp(firebaseConfig);
export const auth  = getAuth(app);
export const db    = getFirestore(app);
export const gauth = new GoogleAuthProvider();

// In the native wrapper, Android WebView crashes with browserLocalPersistence.
// Use in-memory persistence there; keep browserLocalPersistence on real browsers.
const isNativeWrapper =
  typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;

setPersistence(auth, isNativeWrapper ? inMemoryPersistence : browserLocalPersistence)
  .catch(console.error);
