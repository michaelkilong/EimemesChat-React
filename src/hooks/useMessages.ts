import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Message } from '../types';
import { useApp } from '../context/AppContext';

export function useMessages(convId: string | null) {
  const { currentUser } = useApp();
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [convTitle, setConvTitle] = useState('');
  // isStreamingRef used by useChat to suppress snapshot during active stream
  const isStreamingRef = useRef(false);

  useEffect(() => {
    if (!convId || !currentUser) { setMessages([]); setConvTitle(''); return; }

    const ref   = doc(db, 'users', currentUser.uid, 'conversations', convId);
    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) { setMessages([]); setConvTitle(''); return; }
      // Only block snapshot updates while actively streaming tokens
      // Once streaming ends we always accept — this prevents the blank gap
      if (!isStreamingRef.current) {
        const data = snap.data();
        setMessages(data.messages || []);
        setConvTitle(data.title || 'New conversation');
      }
    }, err => console.error('Messages snapshot error:', err));

    return unsub;
  }, [convId, currentUser]);

  return { messages, setMessages, convTitle, setConvTitle, isStreamingRef };
}
