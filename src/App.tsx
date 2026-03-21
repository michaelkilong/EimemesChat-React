// App.tsx
// v2.1 — Apple-standard UI: circular topbar buttons, clean layout
import React, { useState, useCallback, useEffect } from 'react';
import { doc } from 'firebase/firestore';
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
import SettingsView          from './components/SettingsView';
import ProfileView           from './components/ProfileView';
import PersonalizationView   from './components/PersonalizationView';
import LoginModal            from './components/modals/LoginModal';
import type { Attachment }   from './types';

const DAILY_LIMIT = 150;
function todayStr() { return new Date().toISOString().slice(0, 10); }

// Circular icon button — Apple HIG standard 44pt touch target
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
        background: pressed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
        border: 'none', cursor: 'pointer', flexShrink: 0,
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

  const { currentUser, authReady, view, setView, sidebarOpen, setSidebarOpen } = useApp();
  const [currentConvId,     setCurrentConvId]     = useState<string | null>(null);
  const [chipsUsed,         setChipsUsed]         = useState(localStorage.getItem('ec_chips_used') === 'true');
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const { conversations, createNewChat, clearAllChats, deleteConv, getConvRef, getUserConvsRef } = useConversations();
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
    setConvTitle, isStreamingRef, setMessages,
  );

  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
    import('firebase/firestore').then(({ getDoc }) => {
      getDoc(ref).then(snap => {
        if (!snap.exists()) return;
        const data = snap.data() as { dailyCount?: number; lastDate?: string };
        if (data.lastDate === todayStr() && (data.dailyCount || 0) >= DAILY_LIMIT) setDailyLimitReached(true);
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

  const handleDeleteConv = useCallback(async (id: string) => {
    await deleteConv(id);
    if (currentConvId === id) setCurrentConvId(null);
  }, [deleteConv, currentConvId]);
    await clearAllChats();
    setCurrentConvId(null);
  }, [clearAllChats]);

  const topbarTitle = currentConvId
    ? (convTitle || conversations.find(c => c.id === currentConvId)?.title || 'EimemesChat')
    : '';

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
        onDeleteConv={handleDeleteConv}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── CHAT VIEW ── */}
        {view === 'chat' && (
          <>
            {/* Topbar — circular buttons, Apple style */}
            <header style={{
              flexShrink: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              height: 'calc(60px + var(--sat))',
              padding: 'calc(var(--sat) + 10px) 16px 10px',
              background: `linear-gradient(to bottom, var(--fade-top) 0%, var(--fade-top) 55%, transparent 100%)`,
              position: 'relative', zIndex: 10,
            }}>
              {/* Menu — always visible on mobile, hidden on desktop */}
              <CircleBtn onClick={() => setSidebarOpen(true)} className="menu-btn-mobile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </CircleBtn>

              {/* Title — centered */}
              <span style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                fontSize: '16px', fontWeight: 600, color: 'var(--text-1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 'calc(100% - 120px)',
              }}>
                {topbarTitle}
              </span>

              {/* New chat — always visible on mobile */}
              <CircleBtn onClick={handleNewChat} className="topbar-newchat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </CircleBtn>
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
            onOpenPersonalization={() => setView('personalization')}
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
      </div>

      <LoginModal visible={!currentUser} />
    </div>
  );
}
