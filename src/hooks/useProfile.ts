// hooks/useProfile.ts
import { useState, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

export function useProfile() {
  const [saving, setSaving] = useState(false);

  /** Save display name + photo URL to Firestore (and displayName to Auth) */
  const saveProfile = useCallback(async (
    user: User,
    updates: { displayName?: string; photoURL?: string }
  ) => {
    setSaving(true);
    try {
      // Always update displayName in Firebase Auth
      if (updates.displayName !== undefined) {
        await updateProfile(user, { displayName: updates.displayName });
      }

      // Store custom data in Firestore (profilePhoto + displayName)
      const firestoreData: Record<string, any> = { updatedAt: new Date() };
      if (updates.displayName !== undefined) firestoreData.displayName = updates.displayName;
      if (updates.photoURL !== undefined) firestoreData.profilePhoto = updates.photoURL;

      await setDoc(doc(db, 'users', user.uid), firestoreData, { merge: true });

      // Reload user to reflect new displayName immediately
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
