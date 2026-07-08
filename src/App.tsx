// App.tsx
// v2.6 — Daily limit 100 + real‑time usage counter
// v2.4.1 — Latched authReady to prevent loading screen flicker on token refresh
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import SettingsView          from './components/SettingsView';
import ProfileView           from './components/ProfileView';
import PersonalizationView   from './components/PersonalizationView';
import AboutView             from './components/AboutView';
import LicensesView          from './components/LicensesView';
import LoginModal            from './components/modals/LoginModal';
import type { Attachment }   from './types';

const DAILY_LIMIT = 100;   // ← reduced from 150
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

  const { currentUser, authReady, view, setView, sidebarOpen, setSidebarOpen } = useApp();
  const [currentConvId,     setCurrentConvId]     = useState<string | null>(null);
  const [chipsUsed,         setChipsUsed]         = useState(localStorage.getItem('ec_chips_used') === 'true');
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [dailyCount,        setDailyCount]        = useState(0);

  // ── Latch authReady so loading screen never reappears ────────
  const authWasReady = useRef(false);
  if (authReady) authWasReady.current = true;
  const showLoading = !authReady && !authWasReady.current;

  const { conversations, createNewChat, clearAllChats, deleteConv, getConvRef, getUserConvsRef } = useConversations();
  const { messages, setMessages, convTitle, setConvTitle, isStreamingRef }           = useMessages(currentConvId);

  const handleNewChat = useCallback(async () => {
    // … unchanged
  }, [createNewChat, setView, currentConvId, conversations]);

  // ── Increment daily counter after each successful send ───────
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
    incrementDailyCount,   // ← new callback
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
    // … unchanged
  }, [currentConvId, isSending, isStreaming, getConvRef, regenerate]);

  const handleDeleteConv = useCallback(async (id: string) => {
    // … unchanged
  }, [deleteConv, currentConvId]);

  const handleClearChats = useCallback(async () => {
    // … unchanged
  }, [clearAllChats]);

  // Keyboard shortcuts
  useEffect(() => {
    // … unchanged
  }, [handleNewChat, sidebarOpen, setSidebarOpen]);

  const topbarTitle = currentConvId
    ? (convTitle || conversations.find(c => c.id === currentConvId)?.title || 'EimemesChat')
    : '';

  if (showLoading) return <LoadingScreen visible />;

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
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
      {/* … rest of the UI unchanged */}
    </div>
  );
}
