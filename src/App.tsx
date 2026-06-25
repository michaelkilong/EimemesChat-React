// App.tsx
// v2.10 — Reload user before showing verification gate (fixes reappearing gate)
// v2.9 — Timestamp‑based cooldown + troubleshooting hints + Google fallback
// v2.8 — Fixed resend countdown (uses ref for interval)
// v2.7 — Enforced email verification for password sign-ups + resend cooldown
// v2.6 — Clean email verification gate + auto‑dismiss
// v2.4 — Fixed regen doubling bug by using regenerate from useChat instead of handleSend
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { sendEmailVerification, reload, signOut } from 'firebase/auth';
import { useApp } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useChat } from './hooks/useChat';

import LoadingScreen         from './components/LoadingScreen';
import Sidebar               from './components/Sidebar';
import MessageList           from './components/MessageList';
import InputArea             from './components/InputArea';
import SettingsView          from './components/SettingsView';
import ProfileView           from './components/ProfileView';
import PersonalizationView   from './components/PersonalizationView';
import AboutView             from './components/AboutView';
import LicensesView          from './components/LicensesView';
import LoginModal            from './components/modals/LoginModal';
import type { Attachment }   from './types';

const DAILY_LIMIT = 150;
function todayStr() { return new Date().toISOString().slice(0, 10); }

// Circular icon button (unchanged)
function CircleBtn({ onClick, children, className }: { onClick: () => void; children: React.ReactNode; className?: string }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      className={className}
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: pressed ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.35)',
        cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-1)',
        transition: 'background 0.12s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  useAuth();
  useTheme();

  const { currentUser, authReady, view, setView, sidebarOpen, setSidebarOpen, showToast } = useApp();
  const [currentConvId,     setCurrentConvId]     = useState<string | null>(null);
  const [chipsUsed,         setChipsUsed]         = useState(localStorage.getItem('ec_chips_used') === 'true');
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [dailyCount,        setDailyCount]        = useState(0);
  const [verifying,         setVerifying]         = useState(false);

  // ── Timestamp‑based cooldown (survives backgrounding) ────────
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    const stored = localStorage.getItem('ec_verify_cooldown');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [resendCooldown, setResendCooldown] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recalculate remaining cooldown every second
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setResendCooldown(remaining);
      if (remaining <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        localStorage.removeItem('ec_verify_cooldown');
      }
    };
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [cooldownUntil]);

  // ── Verification check state ──────────────────────────────────
  const [verificationChecked, setVerificationChecked] = useState(false);

  const { conversations, createNewChat, clearAllChats, deleteConv, getConvRef, getUserConvsRef } = useConversations();
  const { messages, setMessages, convTitle, setConvTitle, isStreamingRef }           = useMessages(currentConvId);

  // Reload user when window gains focus – auto-dismisses verification gate once verified
  useEffect(() => {
    const onFocus = () => {
      if (currentUser && !currentUser.emailVerified) {
        reload(currentUser).catch(() => {});
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [currentUser]);

  // ── Reload user on first detection to get accurate emailVerified ──
  useEffect(() => {
    if (!currentUser) {
      setVerificationChecked(false);
      return;
    }
    // Only check for password users (Google users skip the gate)
    if (!currentUser.providerData?.some(p => p.providerId === 'password')) {
      setVerificationChecked(true);
      return;
    }
    // Reload user to get the latest emailVerified status
    reload(currentUser)
      .then(() => setVerificationChecked(true))
      .catch(() => setVerificationChecked(true));
  }, [currentUser]);

  const handleNewChat = useCallback(async () => {
    if (currentConvId) {
      const currentConv = conversations.find(c => c.id === currentConvId);
      if (!currentConv?.messages?.length) {
        setView('chat');
        return;
      }
    }
    const id = await createNewChat();
    if (id) { setCurrentConvId(id); setView('chat'); }
  }, [createNewChat, setView, currentConvId, conversations]);

  const {
    isSending, isStreaming, isTyping, isSearching,
    streamText, streamDone, streamModel, streamDisclaimer, streamSources,
    streamThinking, isThinking,
    sendMessage, stopStreaming, regenerate,
  } = useChat(
    currentConvId, setCurrentConvId,
    conversations, createNewChat,
    setConvTitle, isStreamingRef, setMessages,
  );

  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
    getDoc(ref).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data() as { dailyCount?: number; lastDate?: string };
      const count = data.lastDate === todayStr() ? (data.dailyCount || 0) : 0;
      setDailyCount(count);
      if (count >= DAILY_LIMIT) setDailyLimitReached(true);
    }).catch(() => {});
  }, [currentUser]);

  const handleSend = useCallback((text: string, attachment?: Attachment, useWebSearch?: boolean, useThinking?: boolean) => {
    sendMessage(text, () => {
      setChipsUsed(true);
      localStorage.setItem('ec_chips_used', 'true');
    }, attachment, useWebSearch, undefined, useThinking);
  }, [sendMessage]);

  const handleRegen = useCallback(async (originalMsg: string) => {
    if (!currentConvId || isSending || isStreaming) return;
    const convRef = getConvRef(currentConvId);
    if (!convRef) return;
    const snap = await getDoc(convRef);
    if (!snap.exists()) return;
    const msgs    = snap.data().messages || [];
    const trimmed = [...msgs];
    while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') trimmed.pop();
    await updateDoc(convRef, { messages: trimmed, updatedAt: new Date() });
    regenerate(originalMsg);
  }, [currentConvId, isSending, isStreaming, getConvRef, regenerate]);

  const handleDeleteConv = useCallback(async (id: string) => {
    await deleteConv(id);
    if (currentConvId === id) setCurrentConvId(null);
  }, [deleteConv, currentConvId]);

  const handleClearChats = useCallback(async () => {
    await clearAllChats();
    setCurrentConvId(null);
  }, [clearAllChats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') { e.preventDefault(); handleNewChat(); }
      if (mod && e.key === 'k') { e.preventDefault(); setSidebarOpen(true); window.dispatchEvent(new CustomEvent('focus-search')); }
      if (e.key === 'Escape' && sidebarOpen) { setSidebarOpen(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat, sidebarOpen, setSidebarOpen]);

  const topbarTitle = currentConvId
    ? (convTitle || conversations.find(c => c.id === currentConvId)?.title || 'EimemesChat')
    : '';

  // ── Email verification gate (password accounts only) ─────────
  const needsVerification = currentUser
    && !currentUser.emailVerified
    && currentUser.providerData?.some(p => p.providerId === 'password');

  const resendVerification = async () => {
    if (!currentUser || verifying || resendCooldown > 0) return;
    setVerifying(true);
    try {
      await reload(currentUser);
      if (currentUser.emailVerified) return;
      await sendEmailVerification(currentUser);
      showToast('Verification email sent! Check your inbox.');

      const until = Date.now() + 60000;
      setCooldownUntil(until);
      localStorage.setItem('ec_verify_cooldown', until.toString());
      setResendCooldown(60);
    } catch {
      showToast('Failed to send. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (!authReady || !verificationChecked) return <LoadingScreen visible />;

  if (needsVerification) {
    return (
      <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-a)', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          {/* Mail icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #0a84ff22, #0a84ff0a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 4-10 8L2 4"/>
            </svg>
          </div>

          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '24px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
            Check your email
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '8px' }}>
            We sent a verification link to
          </p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '24px', wordBreak: 'break-all' }}>
            {currentUser?.email}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: 1.5, marginBottom: '28px' }}>
            Click the link in the email to verify your account.
            This page will update automatically once verified.
          </p>

          <button
            onClick={resendVerification}
            disabled={verifying || resendCooldown > 0}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'var(--glass-2)', color: 'var(--text-1)',
              fontSize: '15px', fontWeight: 500, fontFamily: 'inherit',
              border: '1px solid var(--border)',
              cursor: (verifying || resendCooldown > 0) ? 'default' : 'pointer',
              opacity: (verifying || resendCooldown > 0) ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!verifying && resendCooldown === 0) e.currentTarget.style.background = 'var(--glass-1)'; }}
            onMouseLeave={e => { if (!verifying && resendCooldown === 0) e.currentTarget.style.background = 'var(--glass-2)'; }}
          >
            {verifying ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
          </button>

          {/* ── Troubleshooting tips ────────────────────────────── */}
          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--glass-2)', borderRadius: '14px', textAlign: 'left' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>
              Not seeing the email?
            </p>
            <ul style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
              <li>Check your <strong style={{ color: 'var(--text-2)' }}>spam / junk folder</strong></li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes — some providers are slow</li>
              <li>If all else fails, use Google Sign‑In below</li>
            </ul>
          </div>

          {/* ── Google fallback ─────────────────────────────────── */}
          <button
            onClick={async () => {
              if (currentUser) {
                try { await signOut(auth); } catch {}
              }
            }}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'var(--glass-1)', color: 'var(--text-1)',
              fontSize: '15px', fontWeight: 500, fontFamily: 'inherit',
              border: '1px solid var(--border)',
              cursor: 'pointer', marginTop: '12px',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-1)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M24 9.5c3.19 0 5.38 1.38 6.62 2.53l4.88-4.76C32.48 4.1 28.58 2 24 2 14.82 2 7.07 7.71 4.04 15.53l5.68 4.41C11.36 13.77 17.18 9.5 24 9.5z"/>
              <path fill="#34A853" d="M46 24.5c0-1.57-.14-2.73-.43-3.91H24v7.38h12.72C36.19 31.31 33.68 34 30.36 35.62l5.52 4.28C40.93 36.08 46 30.86 46 24.5z"/>
              <path fill="#FBBC05" d="M9.72 28.63A14.5 14.5 0 0 1 9.5 24c0-1.61.28-3.17.78-4.62l-5.68-4.41A23.96 23.96 0 0 0 2 24c0 3.87.93 7.53 2.57 10.76l5.15-6.13z"/>
              <path fill="#EA4335" d="M24 46c4.97 0 9.15-1.64 12.21-4.46l-5.52-4.28C28.93 38.68 26.65 39.5 24 39.5c-6.82 0-12.64-4.27-14.28-10.87l-5.15 6.13C7.07 42.29 14.82 46 24 46z"/>
            </svg>
            Try Google Sign‑In instead
          </button>

          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '20px' }}>
            Wrong email?{' '}
            <span
              onClick={async () => {
                if (currentUser) {
                  try { await signOut(auth); } catch {}
                }
              }}
              style={{ color: '#0a84ff', cursor: 'pointer', fontWeight: 500 }}
            >
              Sign out and start over
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── Main app (verified or Google user) ───────────────────────
  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <LoadingScreen visible={false} />

      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        onNewChat={handleNewChat}
        onSelectConv={id => { setCurrentConvId(id); setView('chat'); }}
        onOpenSettings={() => { setView('settings'); setSidebarOpen(false); }}
        onDeleteConv={handleDeleteConv}
        dailyCount={dailyCount}
        dailyLimit={DAILY_LIMIT}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── CHAT VIEW ── */}
        {view === 'chat' && (
          <>
            {/* Topbar */}
            <header style={{
              flexShrink: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              height: 'calc(60px + var(--sat))',
              padding: 'calc(var(--sat) + 10px) 16px 10px',
              background: `linear-gradient(to bottom, var(--fade-top) 0%, var(--fade-top) 55%, transparent 100%)`,
              position: 'relative', zIndex: 10,
            }}>
              <CircleBtn onClick={() => setSidebarOpen(true)} className="menu-btn-mobile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </CircleBtn>

              <span style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                fontSize: '16px', fontWeight: 600, color: 'var(--text-1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 'calc(100% - 120px)',
              }}>
                {topbarTitle}
              </span>

              <CircleBtn onClick={handleNewChat} className="topbar-newchat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </CircleBtn>
            </header>

            {/* MessageList fills remaining space; InputArea floats over it */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <MessageList
                messages={messages}
                isTyping={isTyping}
                isSearching={isSearching}
                isStreaming={isStreaming}
                streamText={streamText}
                streamDone={streamDone}
                streamModel={streamModel}
                streamDisclaimer={streamDisclaimer}
                streamSources={streamSources}
                streamThinking={streamThinking}
                isThinking={isThinking}
                convId={currentConvId}
                chipsUsed={chipsUsed}
                onChipClick={handleSend}
                onRegen={handleRegen}
              />
              {/* InputArea positioned absolutely so messages scroll underneath it */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5 }}>
                <InputArea
                  onSend={handleSend}
                  onStop={stopStreaming}
                  isSending={isSending}
                  isStreaming={isStreaming}
                  dailyLimitReached={dailyLimitReached}
                />
              </div>
            </div>
          </>
        )}

        {view === 'settings' && (
          <SettingsView
            onBack={() => setView('chat')}
            onOpenProfile={() => setView('profile')}
            onOpenPersonalization={() => setView('personalization')}
            onOpenAbout={() => setView('about')}
            onClearChats={handleClearChats}
            conversations={conversations}
          />
        )}

        {view === 'profile' && (
          <ProfileView
            onBack={() => setView('settings')}
            getUserConvsRef={getUserConvsRef}
          />
        )}

        {view === 'personalization' && (
          <PersonalizationView
            onBack={() => setView('settings')}
          />
        )}

        {view === 'about' && (
          <AboutView
            onBack={() => setView('settings')}
            onOpenLicenses={() => setView('licenses')}
          />
        )}

        {view === 'licenses' && (
          <LicensesView
            onBack={() => setView('about')}
          />
        )}
      </div>

      <LoginModal visible={!currentUser} />
    </div>
  );
}
