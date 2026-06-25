// hooks/useAuth.ts
import { useEffect, useRef } from 'react';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';
import { useProfile } from './useProfile';

export function useAuth() {
  const { setCurrentUser, setAuthReady } = useApp();
  const { ensureDisplayName } = useProfile();
  const ensuredRef = useRef<string | null>(null);

  useEffect(() => {
    // Catch Google redirect result when returning from auth
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthReady(true);

      // Auto‑set display name for email/password users (once per UID)
      if (
        user &&
        !user.displayName &&
        user.providerData?.some(p => p.providerId === 'password') &&
        user.uid !== ensuredRef.current
      ) {
        ensuredRef.current = user.uid;
        ensureDisplayName(user);
      }
    });
    return unsub;
  }, [setCurrentUser, setAuthReady, ensureDisplayName]);
}
