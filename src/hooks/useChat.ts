// useChat.ts — v1.1 — Fixed: pendingImage order, AI_TIMEOUT for images, no-gap streaming end
import { useState, useRef, useCallback } from 'react';
import { arrayUnion, updateDoc, getDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { getTime } from '../lib/markdown';
import type { Message } from '../types';

const MAX_MSGS    = 100;
const DAILY_LIMIT = 150;
const AI_TIMEOUT  = 65000; // 65s — covers image generation (up to 60s)

const IMAGE_INTENT = /\b(generate|create|make|draw|design|paint|produce|show|give me|can you make|i want)\b.{0,40}\b(image|photo|picture|illustration|artwork|painting|drawing|portrait|wallpaper|logo|icon|poster|banner|sketch|render|scene|landscape|avatar)\b|\b(image|photo|picture|illustration|artwork|painting|drawing)\b.{0,20}\b(of|for|showing|depicting|with)\b/i;

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function useChat(
  convId: string | null,
  setConvId: (id: string) => void,
  conversations: Array<{ id: string; messages?: Message[] }>,
  createNewChat: () => Promise<string | null>,
  setConvTitle: (t: string) => void,
  isStreamingRef: React.MutableRefObject<boolean>,
  setMessages: (msgs: Message[]) => void,
) {
  const { currentUser, showToast } = useApp();

  const [isSending,        setIsSending]        = useState(false);
  const [isStreaming,      setIsStreaming]       = useState(false);
  const [isTyping,         setIsTyping]          = useState(false);
  const [streamText,       setStreamText]        = useState('');
  const [streamDone,       setStreamDone]        = useState(false);
  const [streamModel,      setStreamModel]       = useState('');
  const [streamDisclaimer, setStreamDisclaimer]  = useState(false);
  const [pendingImage,     setPendingImage]      = useState<{ url: string; prompt: string } | null>(null);

  const imageUrlRef    = useRef('');
  const imagePromptRef = useRef('');

  const streamController = useRef<AbortController | null>(null);
  const renderQueueRef   = useRef<string[]>([]);
  const displayedRef     = useRef('');
  const renderTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pumpQueue = useCallback(() => {
    if (renderQueueRef.current.length === 0) { renderTimerRef.current = null; return; }
    displayedRef.current += renderQueueRef.current.shift()!;
    setStreamText(displayedRef.current);
    renderTimerRef.current = setTimeout(pumpQueue, 18);
  }, []);

  const enqueue = useCallback((token: string) => {
    renderQueueRef.current.push(token);
    if (!renderTimerRef.current) pumpQueue();
  }, [pumpQueue]);

  const drainQueue = () => new Promise<void>(resolve => {
    function check() {
      if (renderQueueRef.current.length === 0 && !renderTimerRef.current) { resolve(); return; }
      setTimeout(check, 25);
    }
    check();
  });

  const getUserMetaRef = useCallback(() =>
    currentUser ? doc(db, 'users', currentUser.uid) : null,
  [currentUser]);

  const checkAndIncrementDailyCount = useCallback(async (): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const ref  = getUserMetaRef()!;
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const today      = todayStr();
      const lastDate   = data.lastDate || '';
      const dailyCount = lastDate === today ? (data.dailyCount || 0) : 0;
      if (dailyCount >= DAILY_LIMIT) return false;
      await setDoc(ref, { dailyCount: dailyCount + 1, lastDate: today }, { merge: true });
      return true;
    } catch { return true; }
  }, [currentUser, getUserMetaRef]);

  const getConvDocRef = useCallback((id: string) =>
    currentUser ? doc(db, 'users', currentUser.uid, 'conversations', id) : null,
  [currentUser]);

  const sendMessage = useCallback(async (text: string, chipsUsedSetter: () => void) => {
    if (!text.trim() || isSending || !currentUser) return;

    const allowed = await checkAndIncrementDailyCount();
    if (!allowed) {
      showToast(`Daily limit of ${DAILY_LIMIT} messages reached. Resets tomorrow!`);
      return;
    }

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
    const userMsg: Message = { role: 'user', content: text, time: getTime() };
    try {
      await updateDoc(convRef, { messages: arrayUnion(userMsg), updatedAt: new Date() });
    } catch (err: any) {
      showToast(err.code === 'permission-denied'
        ? 'Permission denied. Please sign out and back in.'
        : 'Failed to send message. Check your connection.');
      setIsSending(false); return;
    }

    // ── Reset ALL stream state first ──────────────────────────────
    renderQueueRef.current = [];
    displayedRef.current   = '';
    if (renderTimerRef.current) { clearTimeout(renderTimerRef.current); renderTimerRef.current = null; }
    setStreamText('');
    setStreamDone(false);
    setStreamModel('');
    setStreamDisclaimer(false);
    imageUrlRef.current    = '';
    imagePromptRef.current = '';

    // ── Detect image intent — set skeleton AFTER reset, not before ─
    const isImageRequest = IMAGE_INTENT.test(text);
    if (isImageRequest) {
      setPendingImage({ url: '', prompt: text });
    } else {
      setPendingImage(null);
    }

    setIsTyping(true);

    streamController.current = new AbortController();
    const controller = streamController.current;
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);

    try {
      const snap    = await getDoc(convRef);
      const history = snap.exists() ? (snap.data().messages || []).slice(-20) : [];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`,
        },
        signal: controller.signal,
        body: JSON.stringify({ message: text, history, isFirstMessage }),
      });

      clearTimeout(timer);
      setIsTyping(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errMsg = body.error || `Server error (${res.status}). Please try again.`;
        await updateDoc(convRef, {
          messages: arrayUnion({ role: 'assistant', content: errMsg, time: getTime(), model: '' }),
          updatedAt: new Date(),
        });
        setPendingImage(null);
        setIsSending(false); return;
      }

      // Start streaming — block Firestore snapshots during active token stream
      isStreamingRef.current = true;
      setIsStreaming(true);

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf        = '';
      let fullText   = '';
      let model      = '';
      let disclaimer = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop()!;

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          try {
            const parsed = JSON.parse(raw);

            if (parsed.error) { enqueue(parsed.error); }
            if (parsed.token) { fullText += parsed.token; enqueue(parsed.token); }

            if (parsed.imageUrl) {
              imageUrlRef.current    = parsed.imageUrl;
              imagePromptRef.current = parsed.imagePrompt || '';
              // Update pendingImage with real URL — skeleton becomes actual image
              setPendingImage({ url: parsed.imageUrl, prompt: parsed.imagePrompt || '' });
            }

            if (parsed.outputBlocked && parsed.safeReply) {
              fullText = parsed.safeReply;
              renderQueueRef.current = [];
              displayedRef.current   = fullText;
              setStreamText(fullText);
            }

            if (parsed.done) {
              model      = parsed.model      || '';
              disclaimer = parsed.disclaimer || false;
              if (parsed.outputBlocked && parsed.reply) fullText = parsed.reply;
            }

            if (parsed.title) {
              const aiTitle = parsed.title as string;
              updateDoc(convRef, { title: aiTitle }).catch(console.error);
              setConvTitle(aiTitle);
            }
          } catch { /* malformed chunk */ }
        }
      }

      await drainQueue();

      setStreamModel(model);
      setStreamDisclaimer(disclaimer);
      setStreamDone(true);

      // Save AI message to Firestore
      const aiMsg: Message = {
        role: 'assistant',
        content: imageUrlRef.current || fullText,
        time: getTime(), model, disclaimer,
        ...(imageUrlRef.current && {
          imageUrl:    imageUrlRef.current,
          imagePrompt: imagePromptRef.current,
        }),
      };
      await updateDoc(convRef, { messages: arrayUnion(aiMsg), updatedAt: new Date() });

      // ── Force-update messages from Firestore before clearing streaming ──
      // This eliminates the blank gap — messages are ready before StreamingBubble disappears
      try {
        const freshSnap = await getDoc(convRef);
        if (freshSnap.exists()) {
          const freshData = freshSnap.data();
          setMessages(freshData.messages || []);
          setConvTitle(freshData.title || '');
        }
      } catch { /* fallback to snapshot */ }

      // Now safe to release streaming — messages already updated above
      isStreamingRef.current = false;
      setIsStreaming(false);
      setStreamDone(false);
      streamController.current = null;
      setPendingImage(null);

    } catch (err: any) {
      clearTimeout(timer);
      setIsTyping(false);
      isStreamingRef.current = false;
      setIsStreaming(false);
      streamController.current = null;
      setPendingImage(null);

      if (err.name === 'AbortError') { setIsSending(false); return; }

      const errorMsg = err.code === 'permission-denied'
        ? 'Permission denied. Please sign out and back in.'
        : 'I\'m sorry, all AI providers are currently unavailable. Please try again in a moment.';
      try {
        await updateDoc(getConvDocRef(activeConvId)!, {
          messages: arrayUnion({ role: 'assistant', content: errorMsg, time: getTime(), model: '' }),
          updatedAt: new Date(),
        });
      } catch { /* ignore */ }
    } finally {
      setIsSending(false);
    }
  }, [isSending, currentUser, convId, conversations, createNewChat, setConvId, setConvTitle,
      isStreamingRef, setMessages, checkAndIncrementDailyCount, showToast, getConvDocRef, enqueue]);

  const stopStreaming = useCallback(() => {
    streamController.current?.abort();
    streamController.current = null;
  }, []);

  return {
    isSending, isStreaming, isTyping,
    streamText, streamDone, streamModel, streamDisclaimer,
    pendingImage,
    sendMessage, stopStreaming,
    setStreamDone,
  };
}
