// components/modals/VerificationModal.tsx — v1.1 (force ID-token refresh after
// verification is detected, so Firestore rules checking token.email_verified
// don't reject the newly-verified user with a stale cached claim)
import React, { useState, useEffect, useCallback } from 'react';
import { sendEmailVerification, signOut, reload } from 'firebase/auth';
import { auth } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { friendlyAuthError } from '../../utils/authErrors';

const RESEND_COOLDOWN_SECONDS = 60;
const POLL_INTERVAL_MS = 5000;
const COOLDOWN_KEY_PREFIX = 'ec_verify_resend_';

interface Props { visible: boolean; }

export default function VerificationModal({ visible }: Props) {
  const { currentUser, setEmailVerified, showToast } = useApp();
  const [checking,   setChecking]   = useState(false);
  const [resending,  setResending]  = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cooldown,   setCooldown]   = useState(0);
  const [error,      setError]      = useState('');

  const anyLoading = checking || resending || signingOut;

  // Restore any in-progress cooldown after a page refresh, per uid
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || !visible) return;
    const last = Number(localStorage.getItem(COOLDOWN_KEY_PREFIX + uid) || 0);
    const elapsedSec = Math.floor((Date.now() - last) / 1000);
    if (elapsedSec < RESEND_COOLDOWN_SECONDS) {
      setCooldown(RESEND_COOLDOWN_SECONDS - elapsedSec);
    }
  }, [currentUser?.uid, visible]);

  // Countdown ticker for the resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Marks the user verified in app state AND forces a fresh ID token so
  // Firestore requests immediately carry the updated email_verified claim
  // (calling reload() alone only updates the local user object, not the
  // token the SDK attaches to requests).
  const markVerified = useCallback(async () => {
    try {
      await auth.currentUser?.getIdToken(true);
    } catch {
      // If the token refresh fails (e.g. offline), Firestore calls will
      // still use the stale token and get rejected until it succeeds —
      // the app-level gate below still keeps the UI itself locked out.
    }
    setEmailVerified(true);
    showToast("You're verified! Welcome in.");
  }, [setEmailVerified, showToast]);

  // Background poll — catches the case where the user verifies their email
  // in another tab, browser, or device while sitting on this screen.
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(async () => {
      if (!auth.currentUser) return;
      try {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          await markVerified();
        }
      } catch {
        // Silent — background check. Manual actions below still surface errors.
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible, markVerified]);

  const handleResend = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || resending || cooldown > 0) return;
    setError('');
    setResending(true);
    try {
      await sendEmailVerification(user);
      showToast('Verification email sent! Check your inbox.');
      localStorage.setItem(COOLDOWN_KEY_PREFIX + user.uid, String(Date.now()));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e: any) {
      setError(friendlyAuthError(e.code));
      if (e.code === 'auth/too-many-requests') setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setResending(false);
    }
  }, [resending, cooldown, showToast]);

  const handleCheckVerified = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || checking) return;
    setError('');
    setChecking(true);
    try {
      await reload(user);
      if (user.emailVerified) {
        await markVerified();
      } else {
        setError("Still not verified. Check your inbox (and spam folder) for the link, then try again.");
      }
    } catch (e: any) {
      if (e.code === 'auth/user-token-expired' || e.code === 'auth/invalid-user-token') {
        setError('Your session has expired. Please sign in again.');
        await signOut(auth).catch(() => {});
      } else {
        setError(friendlyAuthError(e.code));
      }
    } finally {
      setChecking(false);
    }
  }, [checking, markVerified]);

  const handleBackToLogin = useCallback(async () => {
    if (anyLoading) return;
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch {
      // If sign-out fails offline, the local session clears once connectivity
      // returns via the normal auth listener — nothing else useful to do here.
    } finally {
      setSigningOut(false);
    }
  }, [anyLoading]);

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '14px', margin: '8px 0',
    borderRadius: '40px', border: 'none',
    background: 'var(--send-bg)', color: 'white',
    fontSize: '16px', fontWeight: 600,
    cursor: anyLoading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    boxShadow: '0 4px 16px rgba(0,122,255,0.3)',
    opacity: anyLoading ? 0.55 : 1, fontFamily: 'inherit',
    transition: 'opacity .15s, filter .15s',
  };

  const btnSecondary: React.CSSProperties = {
    width: '100%', padding: '14px', margin: '8px 0',
    borderRadius: '40px', border: '1px solid var(--border)',
    background: 'var(--glass-2)', color: 'var(--text-1)',
    fontSize: '15px', fontWeight: 500,
    cursor: (anyLoading || cooldown > 0) ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    opacity: (anyLoading || cooldown > 0) ? 0.55 : 1, fontFamily: 'inherit',
    transition: 'opacity .15s, background .15s',
  };

  const btnGhost: React.CSSProperties = {
    width: '100%', padding: '12px', margin: '4px 0 0',
    borderRadius: '40px', border: 'none',
    background: 'none', color: 'var(--text-3)',
    fontSize: '14px', fontWeight: 500,
    cursor: anyLoading ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    opacity: anyLoading ? 0.6 : 1,
  };

  const spinner = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

  return (
    <div className={`login-overlay ${visible ? 'show' : ''}`}>
      <div className="login-card">
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--glass-3)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>

        <h2 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', marginBottom: '8px',
          color: 'var(--text-1)', textAlign: 'center',
        }}>
          Verify your email
        </h2>

        <div style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '4px', textAlign: 'center', lineHeight: 1.5 }}>
          We sent a verification link to
        </div>
        <div style={{ fontSize: '15px', color: 'var(--text-1)', fontWeight: 600, marginBottom: '18px', textAlign: 'center', wordBreak: 'break-all' }}>
          {currentUser?.email || 'your email address'}
        </div>
        <div style={{ fontSize: '13.5px', color: 'var(--text-3)', marginBottom: '20px', textAlign: 'center', lineHeight: 1.5 }}>
          Click the link in that email, then tap "I've Verified My Email" below. You'll need to verify before you can use EimemesChat.
        </div>

        <button
          style={btnPrimary}
          disabled={anyLoading}
          aria-busy={checking}
          onClick={handleCheckVerified}
          onMouseEnter={e => { if (!anyLoading) e.currentTarget.style.filter = 'brightness(1.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
        >
          {checking ? spinner : "I've Verified My Email"}
        </button>

        <button
          style={btnSecondary}
          disabled={anyLoading || cooldown > 0}
          aria-busy={resending}
          onClick={handleResend}
          onMouseEnter={e => { if (!anyLoading && cooldown === 0) e.currentTarget.style.background = 'var(--glass-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-2)'; }}
        >
          {resending ? spinner : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Verification Email'}
        </button>

        <button
          style={btnGhost}
          disabled={anyLoading}
          onClick={handleBackToLogin}
        >
          {signingOut ? 'Signing out…' : 'Back to Login'}
        </button>

        {error && (
          <div role="alert" aria-live="polite" style={{ color: '#ff6b6b', fontSize: '13.5px', marginTop: '14px', textAlign: 'center', lineHeight: 1.4 }}>
            {error}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}