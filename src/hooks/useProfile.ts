// hooks/useProfile.ts
import { useState, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

/** Resize a base64 image to max 400×400 and return a compressed base64 data URL */
function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 400;
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        resolve(dataUrl); // already small enough
        return;
      }
      // Scale down proportionally
      if (width > height) { height = Math.round((height / width) * maxSize); width = maxSize; }
      else               { width  = Math.round((width  / height) * maxSize); height = maxSize; }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // JPEG at 80% quality
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export function useProfile() {
  const [saving, setSaving] = useState(false);

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
        } else if (updates.photoURL.startsWith('data:')) {
          // Compress, then upload to Firebase Storage
          const compressed = await compressImage(updates.photoURL);
          const storage = getStorage();
          const filePath = `profile_photos/${user.uid}_${Date.now()}.jpg`;
          const storageRef = ref(storage, filePath);
          await uploadString(storageRef, compressed, 'data_url');
          const downloadURL = await getDownloadURL(storageRef);
          firestoreData.profilePhoto = downloadURL;
        } else {
          // Already a URL (shouldn't happen, but safe fallback)
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

  const ensureDisplayName = useCallback(async (user: User) => {
    if (!user.displayName && user.email) {
      const derived = user.email.split('@')[0].replace(/[._]/g, ' ');
      const formatted = derived.charAt(0).toUpperCase() + derived.slice(1);
      await saveProfile(user, { displayName: formatted });
    }
  }, [saveProfile]);

  return { saving, saveProfile, ensureDisplayName };
}
