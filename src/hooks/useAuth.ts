// hooks/useAuth.ts — v1.2 (always reload before trusting emailVerified, per
// spec; force ID-token refresh once verified so Firestore's
// token.email_verified rule check never lags behind local app state)
import { useEffect, useRef } from 'react';
import { onAuthStateChanged, getRedirectResult, reload } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';
import { useProfile } from './useProfile';

export function useAuth() {
  const { setCurrentUser, setAuthReady, setEmailVerified } = useApp();
  const { ensureDisplayName } = useProfile();
  const ensuredRef = useRef<string | null>(null);

  useEffect(() => {
    // Catch Google redirect result when returning from auth
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async user => {
      if (user) {
        // Always reload before trusting emailVerified — the cached user
        // object can be stale (verified in another tab/browser/device,
        // or in rare cases revoked). Falls back to the cached value if
        // offline; the verification screen's own poll/manual check and
        // the Firestore rules are the real backstops either way.
        try {
          await reload(user);
        } catch {
          // offline or transient network error — proceed with cached value
        }

        if (user.emailVerified) {
          // reload() refreshes profile fields but NOT the cached ID token.
          // Firestore rules check request.auth.token.email_verified, which
          // comes from the token itself — force a fresh one now so a
          // just-verified user isn't rejected by Firestore for up to an
          // hour while the stale token would otherwise still be in use.
          try {
            await user.getIdToken(true);
          } catch {
            // If this fails (e.g. offline), Firestore calls keep using
            // the stale token until a later refresh succeeds.
          }
        }
      }

      setCurrentUser(user);
      setEmailVerified(user?.emailVerified ?? false);
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
  }, [setCurrentUser, setAuthReady, setEmailVerified, ensureDisplayName]);
}