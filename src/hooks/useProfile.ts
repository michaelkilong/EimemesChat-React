// hooks/useProfile.ts
import { useState, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

export function useProfile() {
  const [saving, setSaving] = useState(false);

  /** Save display name + photo URL to Firebase Auth and Firestore */
  const saveProfile = useCallback(async (
    user: User,
    updates: { displayName?: string; photoURL?: string }
  ) => {
    setSaving(true);
    try {
      await updateProfile(user, updates);
      // Persist to Firestore as well
      await setDoc(doc(db, 'users', user.uid), {
        displayName: updates.displayName || user.displayName || '',
        photoURL: updates.photoURL || user.photoURL || '',
        updatedAt: new Date(),
      }, { merge: true });
      // Force refresh the user object in context
      await user.reload();
    } finally {
      setSaving(false);
    }
  }, []);

  /** Auto‑set a display name from email prefix if none exists */
  const ensureDisplayName = useCallback(async (user: User) => {
    if (!user.displayName && user.email) {
      const derived = user.email.split('@')[0].replace(/[._]/g, ' ');
      const formatted = derived.charAt(0).toUpperCase() + derived.slice(1);
      await saveProfile(user, { displayName: formatted });
    }
  }, [saveProfile]);

  return { saving, saveProfile, ensureDisplayName };
}
