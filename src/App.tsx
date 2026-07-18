// App.tsx
// v2.20 — Send NAVIGATE message to native wrapper when detected (web fallback unchanged)
// v2.19 — Clear messages instantly on conversation change (prevents lingering old responses)
// v2.18 — Swipe‑from‑left edge to open sidebar
// v2.17 — Skeleton fallback for page transitions (PageSkeleton)
// v2.16 — Local View type ensures navigateTo is type-safe
// v2.15 — Fixed: navigateTo parameter typed as View to satisfy setView
// v2.14 — Fixed: navigateTo defined before use to prevent build error
// v2.13 — Perf: lazy views + page-transitioning class for smooth navigation
// v2.12 — Perf: stable callbacks to enable React.memo in child components
// v2.11 — Added ReportBugView; Settings now opens dedicated bug report page
// v2.10 — Removed landscape desktop mode effect; iOS‑only keyboard lift still present
// v2.9  — iOS‑only keyboard lift (Android/desktop stays at bottom:0)
// v2.7  — Gated authenticated UI behind mandatory email verification (VerificationModal)
// v2.6  — Daily limit 100 + real‑time usage counter + landscape desktop mode
// v2.4.1 — Latched authReady to prevent loading screen flicker on token refresh
import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
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
import PageSkeleton          from './components/PageSkeleton';
import LoginModal            from './components/modals/LoginModal';
import VerificationModal     from './components/modals/VerificationModal';
import type { Attachment }   from './types';

// Lazy‑loaded views
const SettingsView          = lazy(() => import('./components/SettingsView'));
const ProfileView           = lazy(() => import('./components/ProfileView'));
const PersonalizationView   = lazy(() => import('./components/PersonalizationView'));
const AboutView             = lazy(() => import('./components/AboutView'));
const LicensesView          = lazy(() => import('./components/LicensesView'));
const ReportBugView         = lazy(() => import('./components/ReportBugView'));

type View = 'chat' | 'settings' | 'profile' | 'personalization' | 'about' | 'licenses' | 'reportbug';

const DAILY_LIMIT = 100;
function todayStr() { return new Date().toISOString().slice(0, 10); }

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

  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    if (!isIOS) return;
    const handle = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const offset = window.innerHeight - viewport.height;
      setKbOffset(offset > 0 ? offset : 0);
    };
    window.visualViewport?.addEventListener('resize', handle);
    window.visualViewport?.addEventListener('scroll', handle);
    handle();
    return () => {
      window.visualViewport?.removeEventListener('resize', handle);
      window.visualViewport?.removeEventListener('scroll', handle);
    };
  }, [isIOS]);

  const { currentUser, authReady, emailVerified, view, setView, sidebarOpen, setSidebarOpen } = useApp();
  const [currentConvId,     setCurrentConvId]     = useState<string | null>(null);
  const [chipsUsed,         setChipsUsed]         = useState(localStorage.getItem('ec_chips_used') === 'true');
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [dailyCount,        setDailyCount]        = useState(0);

  const authWasReady = useRef(false);
  if (authReady) authWasReady.current = true;
  const showLoading = !authReady && !authWasReady.current;

  const showApp = !!currentUser && emailVerified;

  const { conversations, createNewChat, clearAllChats, deleteConv, getConvRef, getUserConvsRef } = useConversations();
  const { messages, setMessages, convTitle, setConvTitle, isStreamingRef }           = useMessages(currentConvId);

  const incrementDailyCount = useCallback(() => {
    setDailyCount(prev => {
      const next = prev + 1;
      if (next >= DAILY_LIMIT) setDailyLimitReached(true);
      return next;
    });
  }, []);

  const {
    isSending, isStreaming, isTyping, isSearching,
    streamText, streamDone, streamModel, streamDisclaimer, streamSources,
    streamThinking, isThinking,
    sendMessage, stopStreaming, regenerate,
  } = useChat(
    currentConvId, setCurrentConvId,
    conversations, createNewChat,
    setConvTitle, isStreamingRef, setMessages,
    incrementDailyCount,
  );

  // ── Clear messages & stop streaming when conversation changes ──
  useEffect(() => {
    setMessages([]);
    stopStreaming(); // abort any active AI response
  }, [currentConvId, setMessages, stopStreaming]);

  // ── Navigation helper (supports native wrapper) ──
  const isNativeWrapper = typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;

  const navigateTo = useCallback((newView: View) => {
    if (isNativeWrapper) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'NAVIGATE',
        screen: newView,
      }));
    } else {
      document.body.classList.add('page-transitioning');
      setView(newView);
      setTimeout(() => document.body.classList.remove('page-transitioning'), 100);
    }
  }, [setView]);

  // ── Stable refs ──
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  const regenerateRef = useRef(regenerate);
  regenerateRef.current = regenerate;
  const getConvRefRef = useRef(getConvRef);
  getConvRefRef.current = getConvRef;
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;
  const isStreamingRef2 = useRef(isStreaming);
  isStreamingRef2.current = isStreaming;
  const currentConvIdRef = useRef(currentConvId);
  currentConvIdRef.current = currentConvId;

  // ── Stable callbacks ──
  const handleSend = useCallback((text: string, attachment?: Attachment, useWebSearch?: boolean, useThinking?: boolean) => {
    sendMessageRef.current(text, () => {
      setChipsUsed(true);
      localStorage.setItem('ec_chips_used', 'true');
    }, attachment, useWebSearch, undefined, useThinking);
  }, []);

  const handleRegen = useCallback(async (originalMsg: string) => {
    if (isSendingRef.current || isStreamingRef2.current) return;
    const cid = currentConvIdRef.current;
    if (!cid) return;
    const convRef = getConvRefRef.current(cid);
    if (!convRef) return;
    const snap = await getDoc(convRef);
    if (!snap.exists()) return;
    const msgs    = snap.data().messages || [];
    const trimmed = [...msgs];
    while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') trimmed.pop();
    await updateDoc(convRef, { messages: trimmed, updatedAt: new Date() });
    regenerateRef.current(originalMsg);
  }, []);

  const handleNewChat = useCallback(async () => {
    if (currentConvId) {
      const currentConv = conversations.find(c => c.id === currentConvId);
      if (!currentConv?.messages?.length) {
        navigateTo('chat');
        return;
      }
    }
    const id = await createNewChat();
    if (id) { setCurrentConvId(id); navigateTo('chat'); }
  }, [createNewChat, currentConvId, conversations, navigateTo]);

  const handleDeleteConv = useCallback(async (id: string) => {
    await deleteConv(id);
    if (currentConvId === id) setCurrentConvId(null);
  }, [deleteConv, currentConvId]);

  const handleClearChats = useCallback(async () => {
    await clearAllChats();
    setCurrentConvId(null);
  }, [clearAllChats]);

  // ── Daily limit init ──
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

  useEffect(() => {
    if (!showApp) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') { e.preventDefault(); handleNewChat(); }
      if (mod && e.key === 'k') { e.preventDefault(); setSidebarOpen(true); window.dispatchEvent(new CustomEvent('focus-search')); }
      if (e.key === 'Escape' && sidebarOpen) { setSidebarOpen(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat, sidebarOpen, setSidebarOpen, showApp]);

  // ── Swipe‑from‑left gesture (open sidebar) ──
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchTracking = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchTracking.current = touch.clientX <= 20 && !sidebarOpen;
  }, [sidebarOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchTracking.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;
    if (Math.abs(dy) > 30) {
      touchTracking.current = false;
      return;
    }
    if (dx > 50) {
      touchTracking.current = false;
      setSidebarOpen(true);
    }
  }, [setSidebarOpen]);

  const handleTouchEnd = useCallback(() => {
    touchTracking.current = false;
  }, []);

  const topbarTitle = currentConvId
    ? (convTitle || conversations.find(c => c.id === currentConvId)?.title || 'EimemesChat')
    : '';

  if (showLoading) return <LoadingScreen visible />;

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      {showApp && (
        <>
          <Sidebar
            conversations={conversations}
            currentConvId={currentConvId}
            onNewChat={handleNewChat}
            onSelectConv={id => { setCurrentConvId(id); navigateTo('chat'); }}
            onOpenSettings={() => { navigateTo('settings'); setSidebarOpen(false); }}
            onDeleteConv={handleDeleteConv}
            dailyCount={dailyCount}
            dailyLimit={DAILY_LIMIT}
          />
          <div
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Suspense fallback={<PageSkeleton />}>
              {view === 'chat' && (
                <>
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
                    <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'calc(100% - 120px)' }}>{topbarTitle}</span>
                    <CircleBtn onClick={handleNewChat} className="topbar-newchat">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </CircleBtn>
                  </header>
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
                    <div style={{
                      position: 'absolute',
                      bottom: isIOS ? kbOffset : 0,
                      left: 0, right: 0, zIndex: 5,
                      transition: isIOS ? 'bottom 0.15s ease-out' : 'none',
                    }}>
                      <InputArea onSend={handleSend} onStop={stopStreaming} isSending={isSending} isStreaming={isStreaming} dailyLimitReached={dailyLimitReached} />
                    </div>
                  </div>
                </>
              )}

              {view === 'settings' && (
                <SettingsView
                  onBack={() => navigateTo('chat')}
                  onOpenProfile={() => navigateTo('profile')}
                  onOpenPersonalization={() => navigateTo('personalization')}
                  onOpenAbout={() => navigateTo('about')}
                  onClearChats={handleClearChats}
                  conversations={conversations}
                  onOpenReportBug={() => navigateTo('reportbug')}
                />
              )}
              {view === 'profile' && <ProfileView onBack={() => navigateTo('settings')} getUserConvsRef={getUserConvsRef} />}
              {view === 'personalization' && <PersonalizationView onBack={() => navigateTo('settings')} />}
              {view === 'about' && <AboutView onBack={() => navigateTo('settings')} onOpenLicenses={() => navigateTo('licenses')} />}
              {view === 'licenses' && <LicensesView onBack={() => navigateTo('about')} />}
              {view === 'reportbug' && <ReportBugView onBack={() => navigateTo('settings')} />}
            </Suspense>
          </div>
        </>
      )}
      <LoginModal visible={!currentUser} />
      <VerificationModal visible={!!currentUser && !emailVerified} />
    </div>
  );
}
