// App.tsx
// v2.7 — Enforced email verification for password sign-ups + resend cooldown
// v2.6 — Clean email verification gate + auto‑dismiss
// v2.4 — Fixed regen doubling bug by using regenerate from useChat instead of handleSend
import React, { useState, useCallback, useEffect } from 'react';
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
  const [resendCooldown,    setResendCooldown]    = useState(0);

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
    // Use regenerate to avoid duplicating the user message
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
      // Reload user to ensure latest state before sending
      await reload(currentUser);
      if (currentUser.emailVerified) return; // already verified, gate will auto-dismiss
      await sendEmailVerification(currentUser);
      showToast('Verification email sent! Check your inbox.');
      // Start cooldown (60 seconds)
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      showToast('Failed to send. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (!authReady) return <LoadingScreen visible />;

  // Block access until email is verified for password sign‑ups
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
