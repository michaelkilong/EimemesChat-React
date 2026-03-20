// App.tsx
// v2.0 — Removed image generation; added file attachment support
// Changelog:
//   v2.0 — File attachments (PDF, images, text, docx); clean state; fixed blank gap
//   v1.2 — Reverted keyboard fix; removed visualViewport
//   v1.0 — Initial React migration

import React, { useState, useCallback, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { db } from './firebase';
import { useApp } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useChat } from './hooks/useChat';

import LoadingScreen  from './components/LoadingScreen';
import Sidebar        from './components/Sidebar';
import MessageList    from './components/MessageList';
import InputArea      from './components/InputArea';
import SettingsView   from './components/SettingsView';
import ProfileView    from './components/ProfileView';
import LoginModal     from './components/modals/LoginModal';
import type { Attachment } from './types';

const DAILY_LIMIT = 150;
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function App() {
  useAuth();
  useTheme();

  const { currentUser, authReady, view, setView, sidebarOpen, setSidebarOpen } = useApp();

  const [currentConvId,      setCurrentConvId]      = useState<string | null>(null);
  const [chipsUsed,          setChipsUsed]          = useState(localStorage.getItem('ec_chips_used') === 'true');
  const [dailyLimitReached,  setDailyLimitReached]  = useState(false);

  const { conversations, createNewChat, clearAllChats, getConvRef, getUserConvsRef } = useConversations();
  const { messages, setMessages, convTitle, setConvTitle, isStreamingRef }           = useMessages(currentConvId);

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
    setMessages,
  );

  // Check daily limit
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

  const handleSend = useCallback((text: string, attachment?: Attachment) => {
    sendMessage(text, () => {
      setChipsUsed(true);
      localStorage.setItem('ec_chips_used', 'true');
    }, attachment);
  }, [sendMessage]);

  const handleRegen = useCallback(async (originalMsg: string) => {
    if (!currentConvId || isSending || isStreaming) return;
    const { getDoc, updateDoc } = await import('firebase/firestore');
    const convRef = getConvRef(currentConvId);
    if (!convRef) return;
    const snap = await getDoc(convRef);
    if (!snap.exists()) return;
    const msgs    = snap.data().messages || [];
    const trimmed = [...msgs];
    while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') trimmed.pop();
    await updateDoc(convRef, { messages: trimmed, updatedAt: new Date() });
    handleSend(originalMsg);
  }, [currentConvId, isSending, isStreaming, getConvRef, handleSend]);

  const handleClearChats = useCallback(async () => {
    await clearAllChats();
    setCurrentConvId(null);
  }, [clearAllChats]);

  const topbarTitle = currentConvId
    ? (convTitle || conversations.find(c => c.id === currentConvId)?.title || 'EimemesChat')
    : '✦ EimemesChat';

  if (!authReady) return <LoadingScreen visible />;

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <LoadingScreen visible={false} />

      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        onNewChat={handleNewChat}
        onSelectConv={id => { setCurrentConvId(id); setView('chat'); }}
        onOpenSettings={() => { setView('settings'); setSidebarOpen(false); }}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── CHAT VIEW ── */}
        {view === 'chat' && (
          <>
            <header style={{
              flexShrink: 0, display: 'flex', alignItems: 'center',
              height: 'calc(54px + var(--sat))', padding: 'var(--sat) 12px 0',
              background: `linear-gradient(to bottom, var(--fade-top) 0%, var(--fade-top) 60%, transparent 100%)`,
              gap: '8px', position: 'relative', zIndex: 10,
            }}>
              <button
                className="menu-btn-mobile"
                onClick={() => setSidebarOpen(true)}
                style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'none', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>

              <span style={{ flex: 1, fontSize: '15px', fontWeight: 500, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                {topbarTitle}
              </span>

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

        {view === 'settings' && (
          <SettingsView
            onBack={() => setView('chat')}
            onOpenProfile={() => setView('profile')}
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
      </div>

      <LoginModal visible={!currentUser} />
    </div>
  );
}
