// useChat.ts — v2.5 — Real‑time daily count update via onMessageSent
// v2.4 — Added isRegeneration flag to request body for backend deduplication
// v2.3 — Added regenerate function to prevent duplicate user messages on regen
import { useState, useRef, useCallback } from 'react';
import { arrayUnion, updateDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { getTime } from '../lib/markdown';
import type { Message, Attachment } from '../types';

const MAX_MSGS   = 100;
const AI_TIMEOUT = 30000;

export function useChat(
  convId: string | null,
  setConvId: (id: string) => void,
  conversations: Array<{ id: string; messages?: Message[] }>,
  createNewChat: () => Promise<string | null>,
  setConvTitle: (t: string) => void,
  isStreamingRef: React.MutableRefObject<boolean>,
  setMessages: (msgs: Message[]) => void,
  onMessageSent?: () => void,   // ← new optional callback
) {
  const { currentUser, showToast } = useApp();

  const [isSending,        setIsSending]        = useState(false);
  const [isStreaming,      setIsStreaming]       = useState(false);
  const [isTyping,         setIsTyping]          = useState(false);
  const [streamText,       setStreamText]        = useState('');
  const [streamDone,       setStreamDone]        = useState(false);
  const [streamModel,      setStreamModel]       = useState('');
  const [streamDisclaimer, setStreamDisclaimer]  = useState<'critical' | 'web' | false>(false);
  const [isSearching,      setIsSearching]        = useState(false);
  const [streamSources,    setStreamSources]      = useState<{ title: string; url: string }[]>([]);
  const [streamThinking,   setStreamThinking]     = useState('');
  const [isThinking,       setIsThinking]          = useState(false);

  const streamController = useRef<AbortController | null>(null);
  const renderQueueRef   = useRef<string[]>([]);
  const displayedRef     = useRef('');
  const renderTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // … (pumpQueue, enqueue, drainQueue, getConvDocRef unchanged)

  const sendMessage = useCallback(async (text: string, chipsUsedSetter: () => void, attachment?: Attachment, useWebSearch?: boolean, modelMode?: string, useThinking?: boolean) => {
    if (!text.trim() || isSending || !currentUser) return;

    setIsSending(true);
    chipsUsedSetter();

    let activeConvId = convId;
    if (!activeConvId) {
      const newId = await createNewChat();
      if (!newId) { setIsSending(false); return; }
      activeConvId = newId;
      setConvId(newId);
    }

    const convRef = getConvDocRef(activeConvId)!;
    const conv    = conversations.find(c => c.id === activeConvId);

    if ((conv?.messages?.length ?? 0) >= MAX_MSGS) {
      showToast(`Max ${MAX_MSGS} messages reached. Start a new chat.`);
      setIsSending(false); return;
    }

    const isFirstMessage = !conv?.messages?.length;

    if (isFirstMessage) {
      const tempTitle = text.slice(0, 50) + (text.length > 50 ? '…' : '');
      updateDoc(convRef, { title: tempTitle }).catch(console.error);
      setConvTitle(tempTitle);
    }

    // Save user message
    const userMsg: Message = {
      role: 'user', content: text, time: getTime(),
      ...(attachment && { attachment: { name: attachment.name, type: attachment.type } }),
    };
    try {
      await updateDoc(convRef, { messages: arrayUnion(userMsg), updatedAt: new Date() });
      onMessageSent?.();   // ← increment the local counter immediately
    } catch (err: any) {
      showToast(err.code === 'permission-denied'
        ? 'Permission denied. Please sign out and back in.'
        : 'Failed to send message. Check your connection.');
      setIsSending(false); return;
    }

    // … (rest of sendMessage: reset stream, fetch, streaming loop, save AI message) unchanged

  }, [isSending, currentUser, convId, conversations, createNewChat, setConvId, setConvTitle,
      isStreamingRef, setMessages, showToast, getConvDocRef, enqueue, onMessageSent]);

  // … (stopStreaming, regenerate unchanged)

  return {
    isSending, isStreaming, isTyping, isSearching,
    streamText, streamDone, streamModel, streamDisclaimer, streamSources,
    streamThinking, isThinking,
    sendMessage, stopStreaming, regenerate,
    setStreamDone,
  };
}
