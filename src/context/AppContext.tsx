// context/AppContext.tsx — v1.4 (single emailVerified state)
//
// ─── Version History ─────────────────────────────────────────────
// v1.0  – Initial: currentUser, authReady, view, toast, confirm,
//         sidebar, theme, font size.
// v1.1  – Persisted isDark + fontSize; applied data-font-size.
// v1.2  – Merged emailVerified from Firebase + Firestore via two
//         separate flags (firebaseVerified || customVerified).
// v1.3  – Fixes: leak across sign-ins, snapshot error handler,
//         setView dedupe, boot URL safety, confirm dialog ARIA,
//         toast cleanup.
// v1.4  – Simplified emailVerified back to ONE state.
//         • Firebase's currentUser.emailVerified sets the base value.
//         • Firestore users/{uid}.emailVerified can only bump it to
//           true (verification is one-way), covering the window
//           between verify-code writing the flag and the ID token
//           refresh landing.
//         • Removed firebaseVerified + customVerified — no more
//           crossover writes from useAuth into the Firestore slot.
//         • setEmailVerified now triggers a currentUser.reload()
//           when flipping to true, so Firebase's record catches up
//           on the client without an app restart.
// ────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { View } from '../types';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  authReady: boolean;
  setAuthReady: (r: boolean) => void;
  emailVerified: boolean;
  setEmailVerified: (v: boolean) => void;
  view: View;
  setView: (v: View) => void;
  showToast: (msg: string, dur?: number) => void;
  showConfirm: (msg: string, yesLabel?: string, title?: string) => Promise<boolean>;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  isDark: boolean;
  setIsDark: (d: boolean) => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (s: 'small' | 'medium' | 'large') => void;
}

const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady,   setAuthReady]   = useState(false);

  // ── emailVerified ───────────────────────────────────────────────
  // One state. Firebase is the base value; Firestore can bump to true.
  const [emailVerified, setEmailVerifiedState] = useState(false);

  useEffect(() => {
    // Reset to Firebase's value on every user change. Prevents a
    // previous user's verified state from leaking into the next one.
    setEmailVerifiedState(currentUser?.emailVerified ?? false);

    if (!currentUser) return;

    const unsub = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        // Only flip to true — never back to false. Verification is
        // one-way, and this covers the window between verify-code
        // writing the Firestore flag and the ID token refresh landing.
        if (snap.data()?.emailVerified === true) {
          setEmailVerifiedState(true);
        }
      },
      (err) => {
        console.warn('[AppContext] user doc listener error:', err.message);
      },
    );
    return () => unsub();
  }, [currentUser]);

  // Public setter. Used by:
  //  • useAuth — sets from Firebase's user.emailVerified on every
  //    auth state change.
  //  • VerificationModal — sets true optimistically after
  //    /api/verify-code succeeds.
  // When flipping to true, kick off a reload so the Firebase Auth
  // record catches up on the client without needing an app restart.
  const setEmailVerified = useCallback((v: boolean) => {
    setEmailVerifiedState(v);
    if (v && currentUser && !currentUser.emailVerified) {
      currentUser.reload()
        .then(() => {
          if (currentUser.emailVerified) setEmailVerifiedState(true);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // ── View / routing ──────────────────────────────────────────────
  const [view, setView_] = useState<View>('chat');
  const viewRef = useRef<View>('chat');

  const setView = useCallback((v: View) => {
    // No-op if we're already on this view — prevents stacking
    // duplicate history entries.
    if (viewRef.current === v) return;
    viewRef.current = v;
    setView_(v);

    if (v === 'chat') {
      history.replaceState({ view: 'chat' }, '', '/');
    } else {
      history.pushState({ view: v }, '', '/');
    }
  }, []);

  useEffect(() => {
    // Seed from history on first mount without clobbering a
    // meaningful URL (deep-link / refresh).
    const initialState = history.state as { view?: View } | null;
    const initialView: View = initialState?.view || 'chat';
    viewRef.current = initialView;
    setView_(initialView);

    if (!initialState?.view) {
      history.replaceState({ view: 'chat' }, '', '/');
    }

    const handlePop = (e: PopStateEvent) => {
      const v = ((e.state as { view?: View } | null)?.view) || 'chat';
      viewRef.current = v;
      setView_(v);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // ── Sidebar, theme, font ────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark,      setIsDark]      = useState(true);
  const [fontSize,     setFontSizeState] = useState<'small' | 'medium' | 'large'>(
    (localStorage.getItem('ec_font_size') as 'small' | 'medium' | 'large') || 'medium'
  );

  const setFontSize = useCallback((s: 'small' | 'medium' | 'large') => {
    setFontSizeState(s);
    localStorage.setItem('ec_font_size', s);
    document.documentElement.setAttribute('data-font-size', s);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  // ── Toast ───────────────────────────────────────────────────────
  const [toastMsg,     setToastMsg]     = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, dur = 3500) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), dur);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = null;
    };
  }, []);

  // ── Confirm dialog ──────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    msg: string;
    yesLabel: string;
  }>({ open: false, title: '', msg: '', yesLabel: 'Delete' });

  const confirmResolve   = useRef<((v: boolean) => void) | null>(null);
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);

  const showConfirm = useCallback((msg: string, yesLabel = 'Delete', title = 'Are you sure?') => {
    return new Promise<boolean>(resolve => {
      if (confirmResolve.current) {
        confirmResolve.current(false);
        confirmResolve.current = null;
      }
      confirmResolve.current = resolve;
      setConfirmState({ open: true, title, msg, yesLabel });
    });
  }, []);

  const handleConfirmYes = useCallback(() => {
    setConfirmState(s => ({ ...s, open: false }));
    confirmResolve.current?.(true);
    confirmResolve.current = null;
  }, []);

  const handleConfirmNo = useCallback(() => {
    setConfirmState(s => ({ ...s, open: false }));
    confirmResolve.current?.(false);
    confirmResolve.current = null;
  }, []);

  useEffect(() => {
    if (!confirmState.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleConfirmNo(); }
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => confirmCancelRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [confirmState.open, handleConfirmNo]);

  useEffect(() => {
    return () => {
      confirmResolve.current?.(false);
      confirmResolve.current = null;
    };
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      authReady, setAuthReady,
      emailVerified, setEmailVerified,
      view, setView,
      showToast,
      showConfirm,
      sidebarOpen, setSidebarOpen,
      isDark, setIsDark,
      fontSize, setFontSize,
    }}>
      {children}

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toastMsg}</div>

      <div className={`confirm-overlay ${confirmState.open ? 'show' : ''}`}>
        <div
          className="confirm-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-confirm-title"
          aria-describedby="app-confirm-msg"
          aria-hidden={!confirmState.open}
        >
          <div style={{ padding: '24px 22px 18px', textAlign: 'center' }}>
            <div
              id="app-confirm-title"
              style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}
            >
              {confirmState.title}
            </div>
            <div
              id="app-confirm-msg"
              style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5 }}
            >
              {confirmState.msg}
            </div>
          </div>
          <div style={{ height: '1px', background: 'var(--border-b)' }} />
          <div style={{ display: 'flex' }}>
            <button
              ref={confirmCancelRef}
              onClick={handleConfirmNo}
              onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--glass-3)'; b.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'none'; b.style.color = 'var(--text-2)'; }}
              style={{ flex: 1, padding: '15px 0', fontSize: '15px', fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s, color 0.12s' }}
            >
              Cancel
            </button>
            <div style={{ width: '1px', background: 'var(--border-b)', flexShrink: 0 }} />
            <button
              onClick={handleConfirmYes}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              style={{ flex: 1, padding: '15px 0', fontSize: '15px', fontWeight: 700, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s' }}
            >
              {confirmState.yesLabel}
            </button>
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
}
