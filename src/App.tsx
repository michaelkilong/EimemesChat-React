// App.tsx
// v1.1 — Fixed Android Chrome keyboard layout using visualViewport API
// Changelog:
//   v1.1 — visualViewport listener fixes header dimming when keyboard opens on mobile
//   v1.0 — Full React + TypeScript + Tailwind rewrite; feature-parity with HTML v3.4

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useApp } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useChat } from './hooks/useChat';

import LoadingScreen    from './components/LoadingScreen';
import Sidebar          from './components/Sidebar';
import MessageList      from './components/MessageList';
import InputArea        from './components/InputArea';
import SettingsView     from './components/SettingsView';
import ProfileView      from './components/ProfileView';
import LoginModal       from './components/modals/LoginModal';

const DAILY_LIMIT = 150;

function todayStr() { return new Date().toISOString().slice(0, 10); }

// Hook: keeps the app container exactly as tall as the visible viewport
// so the keyboard never pushes or clips the topbar on Android Chrome
function useVisualViewportHeight() {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => setHeight(vv.height);
    update();

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}

export default function App() {
  useAuth();
  useTheme();

  const vpHeight = useVisualViewportHeight();

  const { currentUser, authReady, view, setView, sidebarOpen, setSidebarOpen } = useApp();

  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [chipsUsed, setChipsUsed]         = useState(localStorage.getItem('ec_chips_used') === 'true');
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const { conversations, createNewChat, clearAllChats, getConvRef, getUserConvsRef } = useConversations();
  const { messages, convTitle, setConvTitle, isStreamingRef } = useMessages(currentConvId);

  const handleNewChat = useCallback(async () => {
    const id = await createNewChat();
    if (id) { setCurrentConvId(id); setView('chat'); }
  }, [createNewChat, setView]);

  const {
    isSending, isStreaming, isTyping,
    streamText, streamDone, streamModel, streamDisclaimer,
    sendMessage, stopStreaming,
  } = useChat(
    currentConvId, setCurrentConvId,
    conversations, createNewChat,
    setConvTitle, isStreamingRef,
  );

  // Check daily limit on mount / user change
  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
    import('firebase/firestore').then(({ getDoc }) => {
      getDoc(ref).then(snap => {
        if (!snap.exists()) return;
        const data = snap.data() as { dailyCount?: number; lastDate?: string };
        const { dailyCount = 0, lastDate = '' } = data;
        if (lastDate === todayStr() && dailyCount >= DAILY_LIMIT) setDailyLimitReached(true);
      }).catch(() => {});
    });
  }, [currentUser]);

  const handleSend = useCallback((text: string) => {
    sendMessage(text, () => {
      setChipsUsed(true);
      localStorage.setItem('ec_chips_used', 'true');
    });
  }, [sendMessage]);

  const handleRegen = useCallback(async (originalMsg: string) => {
    if (!currentConvId || isSending || isStreaming) return;
    const { getDoc, updateDoc } = await import('firebase/firestore');
    const convRef = getConvRef(currentConvId);
    if (!convRef) return;
    const snap = await getDoc(convRef);
    if (!snap.exists()) return;
    const msgs = snap.data().messages || [];
    const trimmed = [...msgs];
    while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') trimmed.pop();
    await updateDoc(convRef, { messages: trimmed, updatedAt: new Date() });
    handleSend(originalMsg);
  }, [currentConvId, isSending, isStreaming, getConvRef, handleSend]);

  const handleClearChats = useCallback(async () => {
    await clearAllChats();
    setCurrentConvId(null);
  }, [clearAllChats]);

  // Topbar title
  const topbarTitle = currentConvId
    ? (convTitle || conversations.find(c => c.id === currentConvId)?.title || 'EimemesChat')
    : '✦ EimemesChat';

  if (!authReady) return <LoadingScreen visible />;

  return (
    <div style={{
      display: 'flex',
      height: vpHeight ? `${vpHeight}px` : '100dvh',
      overflow: 'hidden',
      position: 'fixed',
      top: 0, left: 0, right: 0,
    }}>

      <LoadingScreen visible={false} />

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        onNewChat={handleNewChat}
        onSelectConv={id => { setCurrentConvId(id); setView('chat'); }}
        onOpenSettings={() => { setView('settings'); setSidebarOpen(false); }}
      />

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>

        {/* ── CHAT VIEW ── */}
        {view === 'chat' && (
          <>
            {/* Topbar */}
            <header style={{
              flexShrink: 0, display: 'flex', alignItems: 'center',
              height: 'calc(54px + var(--sat))', padding: 'var(--sat) 12px 0',
              background: `linear-gradient(to bottom, var(--fade-top) 0%, var(--fade-top) 60%, transparent 100%)`,
              gap: '8px', position: 'relative', zIndex: 10,
            }}>
              {/* Mobile menu */}
              <button
                className="menu-btn-mobile"
                onClick={() => setSidebarOpen(true)}
                style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'none', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>

              <span style={{ flex: 1, fontSize: '15px', fontWeight: 500, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.1px', textAlign: 'center' }}>
                {topbarTitle}
              </span>

              {/* Mobile new chat */}
              <button
                className="topbar-newchat"
                onClick={handleNewChat}
                style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'none', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </header>

            <MessageList
              messages={messages}
              isTyping={isTyping}
              isStreaming={isStreaming}
              streamText={streamText}
              streamDone={streamDone}
              streamModel={streamModel}
              streamDisclaimer={streamDisclaimer}
              convId={currentConvId}
              chipsUsed={chipsUsed}
              onChipClick={handleSend}
              onRegen={handleRegen}
            />

            <InputArea
              onSend={handleSend}
              onStop={stopStreaming}
              isSending={isSending}
              isStreaming={isStreaming}
              dailyLimitReached={dailyLimitReached}
            />
          </>
        )}

        {/* ── SETTINGS VIEW ── */}
        {view === 'settings' && (
          <SettingsView
            onBack={() => setView('chat')}
            onOpenProfile={() => setView('profile')}
            onClearChats={handleClearChats}
            conversations={conversations}
          />
        )}

        {/* ── PROFILE VIEW ── */}
        {view === 'profile' && (
          <ProfileView
            onBack={() => setView('settings')}
            getUserConvsRef={getUserConvsRef}
          />
        )}
      </div>

      {/* Login modal */}
      <LoginModal visible={!currentUser} />
    </div>
  );
}
