import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, getDocs, writeBatch, doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Conversation } from '../types';
import { useApp } from '../context/AppContext';

const MAX_CONVS = 50;

export function useConversations() {
  const { currentUser, showToast } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const getUserConvsRef = useCallback(() =>
    currentUser ? collection(db, 'users', currentUser.uid, 'conversations') : null,
    [currentUser]
  );

  // Subscribe to conversations list
  useEffect(() => {
    if (!currentUser) { setConversations([]); return; }
    const ref = getUserConvsRef();
    if (!ref) return;

    const q = query(ref, orderBy('updatedAt', 'desc'), limit(MAX_CONVS));
    const unsub = onSnapshot(q, snap => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
    }, err => console.error('Conversations snapshot error:', err));

    return unsub;
  }, [currentUser, getUserConvsRef]);

  const createNewChat = useCallback(async (): Promise<string | null> => {
    if (!currentUser) return null;
    if (conversations.length >= MAX_CONVS) {
      showToast(`Maximum ${MAX_CONVS} conversations reached.`);
      return null;
    }
    try {
      const ref = await addDoc(getUserConvsRef()!, {
        title: 'New conversation',
        createdAt: new Date(), updatedAt: new Date(), messages: [],
      });
      return ref.id;
    } catch (err) {
      console.error('createNewChat:', err);
      showToast('Could not create conversation. Try again.');
      return null;
    }
  }, [currentUser, conversations.length, getUserConvsRef, showToast]);

  const clearAllChats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap  = await getDocs(getUserConvsRef()!);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.error('clearAllChats:', err);
      showToast('Failed to clear chats. Try again.');
    }
  }, [currentUser, getUserConvsRef, showToast]);

  const getConvRef = useCallback((convId: string) =>
    currentUser ? doc(db, 'users', currentUser.uid, 'conversations', convId) : null,
    [currentUser]
  );

  const deleteConv = useCallback(async (convId: string) => {
    if (!currentUser) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', currentUser.uid, 'conversations', convId));
    } catch (err) {
      console.error('deleteConv:', err);
      showToast('Failed to delete. Try again.');
    }
  }, [currentUser, showToast]);

  return { conversations, createNewChat, clearAllChats, deleteConv, getConvRef, getUserConvsRef };
}
