// hooks/useProfile.ts
import { useState, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

export function useProfile() {
  const [saving, setSaving] = useState(false);

  /**
   * Save display name + photo.
   * - displayName → Firebase Auth + Firestore
   * - photoURL    → if it's a base64 data URL, upload to Firebase Storage and save the download URL to Firestore.
   *                 If photoURL is an empty string, remove the custom photo from Firestore (and optionally Storage).
   */
  const saveProfile = useCallback(async (
    user: User,
    updates: { displayName?: string; photoURL?: string }
  ) => {
    setSaving(true);
    try {
      // 1. Update display name in Auth
      if (updates.displayName !== undefined) {
        await updateProfile(user, { displayName: updates.displayName });
      }

      const firestoreData: Record<string, any> = { updatedAt: new Date() };
      if (updates.displayName !== undefined) firestoreData.displayName = updates.displayName;

      // 2. Handle photo
      if (updates.photoURL !== undefined) {
        if (updates.photoURL === '') {
          // Remove custom photo
          firestoreData.profilePhoto = '';
          // Optionally delete old file from Storage – we'll skip for simplicity
        } else if (updates.photoURL.startsWith('data:')) {
          // It's a new base64 image → upload to Firebase Storage
          const storage = getStorage();
          const filePath = `profile_photos/${user.uid}_${Date.now()}.jpg`;
          const storageRef = ref(storage, filePath);
          await uploadString(storageRef, updates.photoURL, 'data_url');
          const downloadURL = await getDownloadURL(storageRef);
          firestoreData.profilePhoto = downloadURL;
        } else {
          // Assume it's already a download URL (shouldn't happen, but keep safe)
          firestoreData.profilePhoto = updates.photoURL;
        }
      }

      // 3. Save to Firestore
      await setDoc(doc(db, 'users', user.uid), firestoreData, { merge: true });

      // 4. Reload user to reflect new displayName immediately
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
