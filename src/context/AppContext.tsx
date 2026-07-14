// context/AppContext.tsx — v1.2 (custom emailVerified sync from Firestore)
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';   // adjust path if your firebase config file is elsewhere
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

  // Merged emailVerified – from Firebase Auth + our custom Firestore field
  const [firebaseVerified, setFirebaseVerified] = useState(false);
  const [customVerified,   setCustomVerified]   = useState(false);

  // Whenever the user changes, reset and start a Firestore listener
  useEffect(() => {
    if (!currentUser) {
      setFirebaseVerified(false);
      setCustomVerified(false);
      return;
    }
    // If Firebase already marks them verified, use that
    if (currentUser.emailVerified) {
      setFirebaseVerified(true);
    }
    // Listen to our custom field
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      const data = snap.data();
      if (data?.emailVerified === true) {
        setCustomVerified(true);
      }
    });
    return () => unsub();
  }, [currentUser]);

  const emailVerified = firebaseVerified || customVerified;
  const setEmailVerified = useCallback((v: boolean) => {
    setCustomVerified(v);
    if (v && currentUser && !currentUser.emailVerified) {
      currentUser.reload().catch(() => {});
    }
  }, [currentUser]);

  const [view,        setView_]       = useState<View>('chat');
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

  const setView = useCallback((v: View) => {
    setView_(v);
    if (v === 'chat') {
      history.replaceState({ view: 'chat' }, '', '/');
    } else {
      history.pushState({ view: v }, '', '/');
    }
  }, []);

  useEffect(() => {
    history.replaceState({ view: 'chat' }, '', '/');
    const handlePop = (e: PopStateEvent) => {
      const v = (e.state?.view as View) || 'chat';
      setView_(v);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Toast
  const [toastMsg,     setToastMsg]     = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, dur = 3500) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), dur);
  }, []);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    msg: string;
    yesLabel: string;
  }>({ open: false, title: '', msg: '', yesLabel: 'Delete' });
  const confirmResolve = useRef<((v: boolean) => void) | null>(null);

  const showConfirm = useCallback((msg: string, yesLabel = 'Delete', title = 'Are you sure?') => {
    return new Promise<boolean>(resolve => {
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

      {/* Toast */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toastMsg}</div>

      {/* Confirm Dialog */}
      <div className={`confirm-overlay ${confirmState.open ? 'show' : ''}`}>
        <div className="confirm-card">
          <div style={{ padding: '24px 22px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
              {confirmState.title}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5 }}>
              {confirmState.msg}
            </div>
          </div>
          <div style={{ height: '1px', background: 'var(--border-b)' }} />
          <div style={{ display: 'flex' }}>
            <button
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
