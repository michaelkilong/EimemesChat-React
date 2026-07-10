// components/modals/LoginModal.tsx — v1.5 (uses shared friendlyAuthError from utils/authErrors)
import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth, gauth } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { friendlyAuthError } from '../../utils/authErrors';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

function isWebView(): boolean {
  const ua = navigator.userAgent;
  return /wv|WebView/.test(ua) ||
    (ua.includes('Android') && !ua.includes('Chrome/'));
}

/** Evaluate password strength: returns a score 0–4 and a label */
function evaluatePasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'var(--text-3)' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const map = [
    { label: 'Weak',   color: '#ff6b6b' },
    { label: 'Fair',   color: '#ff9f0a' },
    { label: 'Good',   color: '#ffd60a' },
    { label: 'Strong', color: '#30d158' },
  ];
  return score === 0
    ? { score: 0, label: '', color: 'var(--text-3)' }
    : { score, ...map[score - 1] };
}

interface Props { visible: boolean; }

export default function LoginModal({ visible }: Props) {
  const { showToast } = useApp();
  const [isSignUp,      setIsSignUp]      = useState(true);
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [agreed,        setAgreed]        = useState(false);
  const [error,         setError]         = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail,  setLoadingEmail]  = useState(false);

  const disabled = !agreed;
  const anyLoading = loadingGoogle || loadingEmail;
  const strength = isSignUp ? evaluatePasswordStrength(password) : { score: 0, label: '', color: 'var(--text-3)' };

  const handleGoogle = async () => {
    if (!agreed) { setError('Please agree to the terms first.'); return; }
    setLoadingGoogle(true);
    try {
      if (isWebView() && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'GOOGLE_AUTH',
          url: `https://chat-eimeme.firebaseapp.com/__/auth/handler?` +
            `providerId=google.com&` +
            `redirectUrl=${encodeURIComponent('https://eimemes-chat-ai.vercel.app')}`
        }));
      } else {
        await signInWithPopup(auth, gauth);
      }
    } catch (e: any) {
      setError(friendlyAuthError(e.code));
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmail = async () => {
    if (!agreed) { setError('Please agree to the terms first.'); return; }
    if (!email || !password) { setError('Please enter your email and password.'); return; }

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email.trim());
      if (methods.includes('google.com') && !methods.includes('password')) {
        setError('This email uses Google Sign‑In. Please continue with Google.');
        return;
      }
    } catch (e: any) {
      setError(friendlyAuthError(e.code));
      return;
    }

    setLoadingEmail(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(friendlyAuthError(e.code));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleSignup = async () => {
    if (!agreed) { setError('Please agree to the terms first.'); return; }
    if (!email)              { setError('Please enter your email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email.trim());
      if (methods.length > 0) {
        setError('An account with this email already exists. Please sign in instead.');
        return;
      }
    } catch (e: any) {
      setError(friendlyAuthError(e.code));
      return;
    }

    setLoadingEmail(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);
      showToast('Account created! Check your email to verify your address.');
    } catch (e: any) {
      setError(friendlyAuthError(e.code));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast('Password reset link sent! Check your inbox.');
      setError('');
    } catch (e: any) {
      setError(friendlyAuthError(e.code));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 48px 14px 18px', margin: '6px 0',
    borderRadius: '40px', border: '1px solid var(--border)',
    background: 'var(--glass-3)', color: 'var(--text-1)',
    fontSize: '16px', outline: 'none', display: 'block',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    fontFamily: 'inherit', transition: 'border-color .2s, background .2s',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '14px', margin: '8px 0',
    borderRadius: '40px', border: 'none',
    background: 'var(--send-bg)', color: 'white',
    fontSize: '16px', fontWeight: 600, cursor: disabled || anyLoading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    boxShadow: '0 4px 16px rgba(0,122,255,0.3)',
    opacity: disabled || anyLoading ? 0.45 : 1, fontFamily: 'inherit',
    transition: 'opacity .15s, filter .15s',
  };

  const btnSecondary: React.CSSProperties = {
    width: '100%', padding: '14px', margin: '8px 0',
    borderRadius: '40px', border: '1px solid var(--border)',
    background: 'var(--glass-2)', color: 'var(--text-1)',
    fontSize: '16px', fontWeight: 500, cursor: disabled || anyLoading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    opacity: disabled || anyLoading ? 0.45 : 1, fontFamily: 'inherit',
    transition: 'opacity .15s, background .15s, filter .15s',
  };

  const spinner = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

  const linkBlue = '#0a84ff';

  return (
    <div className={`login-overlay ${visible ? 'show' : ''}`}>
      <div className="login-card">
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '26px', marginBottom: '4px',
          background: 'linear-gradient(135deg, #5e9cff, #c96eff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          EimemesChat AI
        </h2>
        <div style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '22px' }}>
          {isSignUp ? 'Create your account to get started' : 'Welcome back, sign in to continue'}
        </div>

        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />

        {/* Password field with eye toggle */}
        <div style={{ position: 'relative' }}>
          <input
            style={inputStyle}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
          />
          {/* Eye toggle */}
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
              padding: '6px', display: 'flex',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              /* Eye off */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              /* Eye */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {/* Password strength bar (only in sign‑up mode) */}
        {isSignUp && password && (
          <div style={{ marginBottom: '8px', padding: '0 4px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: '3px', borderRadius: '999px',
                    background: i <= strength.score ? strength.color : 'var(--border)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: strength.color, fontWeight: 500 }}>
              {strength.label}
            </span>
          </div>
        )}

        {/* Forgot password link (only in sign‑in mode) */}
        {!isSignUp && (
          <div style={{ textAlign: 'right', marginBottom: '8px' }}>
            <span
              onClick={handleForgotPassword}
              style={{
                color: linkBlue,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Forgot password?
            </span>
          </div>
        )}

        {isSignUp ? (
          <button
            style={btnPrimary}
            disabled={disabled || anyLoading}
            onClick={handleSignup}
            onMouseEnter={e => { if (!disabled && !anyLoading) e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {loadingEmail ? spinner : 'Create Account'}
          </button>
        ) : (
          <button
            style={btnPrimary}
            disabled={disabled || anyLoading}
            onClick={handleEmail}
            onMouseEnter={e => { if (!disabled && !anyLoading) e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {loadingEmail ? spinner : 'Sign In'}
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0', color: 'var(--text-3)', fontSize: '14px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          or
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <button
          style={btnSecondary}
          disabled={disabled || anyLoading}
          onClick={handleGoogle}
          onMouseEnter={e => { if (!disabled && !anyLoading) { e.currentTarget.style.background = 'var(--glass-1)'; e.currentTarget.style.filter = 'brightness(1.05)'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-2)'; e.currentTarget.style.filter = 'none'; }}
        >
          {loadingGoogle ? spinner : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M24 9.5c3.19 0 5.38 1.38 6.62 2.53l4.88-4.76C32.48 4.1 28.58 2 24 2 14.82 2 7.07 7.71 4.04 15.53l5.68 4.41C11.36 13.77 17.18 9.5 24 9.5z"/>
              <path fill="#34A853" d="M46 24.5c0-1.57-.14-2.73-.43-3.91H24v7.38h12.72C36.19 31.31 33.68 34 30.36 35.62l5.52 4.28C40.93 36.08 46 30.86 46 24.5z"/>
              <path fill="#FBBC05" d="M9.72 28.63A14.5 14.5 0 0 1 9.5 24c0-1.61.28-3.17.78-4.62l-5.68-4.41A23.96 23.96 0 0 0 2 24c0 3.87.93 7.53 2.57 10.76l5.15-6.13z"/>
              <path fill="#EA4335" d="M24 46c4.97 0 9.15-1.64 12.21-4.46l-5.52-4.28C28.93 38.68 26.65 39.5 24 39.5c-6.82 0-12.64-4.27-14.28-10.87l-5.15 6.13C7.07 42.29 14.82 46 24 46z"/>
            </svg>
          )}
          {loadingGoogle ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', margin: '16px 0', textAlign: 'left' }}>
          <input
            type="checkbox" checked={agreed}
            onChange={e => { setAgreed(e.target.checked); setError(''); }}
            style={{ marginTop: '3px', accentColor: linkBlue, flexShrink: 0 }}
          />
          <label style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.4 }}>
            I agree to the{' '}
            <a href="https://app-eimemeschat.vercel.app/terms.html" target="_blank" rel="noreferrer" style={{ color: linkBlue, textDecoration: 'none' }}>Terms</a>
            {' '}and{' '}
            <a href="https://app-eimemeschat.vercel.app/privacy.html" target="_blank" rel="noreferrer" style={{ color: linkBlue, textDecoration: 'none' }}>Privacy Policy</a>
          </label>
        </div>

        <span
          onClick={() => { if (!anyLoading) { setIsSignUp(!isSignUp); setError(''); } }}
          style={{ display: 'inline-block', color: linkBlue, cursor: anyLoading ? 'default' : 'pointer', marginTop: '12px', fontSize: '14px', fontWeight: 500, opacity: anyLoading ? 0.5 : 1 }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </span>

        {error && <div style={{ color: '#ff6b6b', fontSize: '13.5px', marginTop: '10px', minHeight: '20px' }}>{error}</div>}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}