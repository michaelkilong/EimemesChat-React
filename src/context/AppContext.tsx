import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { View } from '../types';

interface AppContextType {
  // Auth
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  authReady: boolean;
  setAuthReady: (r: boolean) => void;

  // View
  view: View;
  setView: (v: View) => void;

  // Toast
  showToast: (msg: string, dur?: number) => void;

  // Confirm dialog
  showConfirm: (msg: string, yesLabel?: string, title?: string) => Promise<boolean>;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;

  // Theme
  isDark: boolean;
  setIsDark: (d: boolean) => void;
}

const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady,   setAuthReady]   = useState(false);
  const [view,        setView]        = useState<View>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark,      setIsDark]      = useState(true);

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
      view, setView,
      showToast,
      showConfirm,
      sidebarOpen, setSidebarOpen,
      isDark, setIsDark,
    }}>
      {children}

      {/* Toast */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toastMsg}</div>

      {/* Confirm Dialog */}
      <div
        className={`confirm-overlay ${confirmState.open ? 'show' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) handleConfirmNo(); }}
      >
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
              style={{ flex: 1, padding: '15px 0', fontSize: '15px', fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <div style={{ width: '1px', background: 'var(--border-b)', flexShrink: 0 }} />
            <button
              onClick={handleConfirmYes}
              style={{ flex: 1, padding: '15px 0', fontSize: '15px', fontWeight: 700, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {confirmState.yesLabel}
            </button>
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
}
