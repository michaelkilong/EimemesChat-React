// components/modals/VerificationModal.tsx — v2.0 (custom 6-digit code)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { signOut, reload } from 'firebase/auth';
import { auth } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { friendlyAuthError } from '../../utils/authErrors';

const RESEND_COOLDOWN_SECONDS = 60;
const POLL_INTERVAL_MS = 5000;
const COOLDOWN_KEY_PREFIX = 'ec_verify_resend_';

interface Props { visible: boolean; }

export default function VerificationModal({ visible }: Props) {
  const { currentUser, setEmailVerified, showToast } = useApp();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [autoSent, setAutoSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const anyLoading = verifying || resending || signingOut;

  useEffect(() => {
    if (!visible || !currentUser || autoSent) return;
    sendCode();
  }, [visible, currentUser?.uid]);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || !visible) return;
    const last = Number(localStorage.getItem(COOLDOWN_KEY_PREFIX + uid) || 0);
    const elapsedSec = Math.floor((Date.now() - last) / 1000);
    if (elapsedSec < RESEND_COOLDOWN_SECONDS) {
      setCooldown(RESEND_COOLDOWN_SECONDS - elapsedSec);
    }
  }, [currentUser?.uid, visible]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(async () => {
      if (!auth.currentUser) return;
      try {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          setEmailVerified(true);
          showToast("You're verified! Welcome in.");
        }
      } catch { /* silent */ }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible, setEmailVerified, showToast]);

  const sendCode = async () => {
    if (!currentUser) return;
    setError('');
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to send code');
      showToast('Verification code sent to your email.');
      localStorage.setItem(COOLDOWN_KEY_PREFIX + currentUser.uid, String(Date.now()));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setAutoSent(true);
    } catch (e: any) {
      setError(e.message || 'Could not send code. Try again later.');
    }
  };

  const handleVerify = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 6 || !currentUser) return;
    setError('');
    setVerifying(true);
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, code: codeStr }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailVerified(true);
        showToast("You're verified! Welcome in.");
      } else {
        setError(data.error || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Code resent! Check your inbox.');
        localStorage.setItem(COOLDOWN_KEY_PREFIX + currentUser!.uid, String(Date.now()));
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to resend code.');
      }
    } catch {
      setError('Could not resend code. Try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = async () => {
    if (anyLoading) return;
    setSigningOut(true);
    try { await signOut(auth); } catch {}
    setSigningOut(false);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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
          We sent a 6‑digit code to
        </div>
        <div style={{ fontSize: '15px', color: 'var(--text-1)', fontWeight: 600, marginBottom: '20px', textAlign: 'center', wordBreak: 'break-all' }}>
          {currentUser?.email || 'your email address'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={el => inputRefs.current[idx] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleCodeChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              style={{
                width: '46px', height: '54px',
                borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--input-bg)', color: 'var(--text-1)',
                fontSize: '24px', fontWeight: 600, textAlign: 'center',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          ))}
        </div>

        <button
          style={btnPrimary}
          disabled={anyLoading || code.join('').length !== 6}
          aria-busy={verifying}
          onClick={handleVerify}
          onMouseEnter={e => { if (!anyLoading && code.join('').length === 6) e.currentTarget.style.filter = 'brightness(1.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
        >
          {verifying ? spinner : 'Verify Code'}
        </button>

        <button
          style={btnSecondary}
          disabled={anyLoading || cooldown > 0}
          aria-busy={resending}
          onClick={handleResend}
          onMouseEnter={e => { if (!anyLoading && cooldown === 0) e.currentTarget.style.background = 'var(--glass-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-2)'; }}
        >
          {resending ? spinner : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Code'}
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
