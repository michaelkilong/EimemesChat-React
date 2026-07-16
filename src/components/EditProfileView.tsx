// components/EditProfileView.tsx — v3.0 (timeout safeguard + guaranteed success toast)
// v2.9 — removed token refresh; silent local fallback
// v2.8 — writes displayName + photo to Firestore directly
// v2.7 — callback to update parent instantly
// v2.6 — instant compression + consistent border style
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useProfile } from '../hooks/useProfile';
import { haptic } from '../lib/haptic';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/** Resize a base64 image to max 400×400 and return a compressed JPEG data URL */
function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 400;
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        resolve(dataUrl);
        return;
      }
      if (width > height) { height = Math.round((height / width) * maxSize); width = maxSize; }
      else               { width  = Math.round((width  / height) * maxSize); height = maxSize; }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

interface Props {
  onBack: () => void;
  onSaved?: (name: string, photo: string) => void;
}

const SAVE_TIMEOUT = 8000;   // 8 seconds — resets saving state if stuck

export default function EditProfileView({ onBack, onSaved }: Props) {
  const { currentUser, showToast } = useApp();
  const { saveProfile } = useProfile();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        const photo = data.profilePhoto || currentUser.photoURL || '';
        setPhotoDataUrl(photo);
        setPreviewPhoto(photo);
        if (data.displayName) setDisplayName(data.displayName);
      } else {
        const photo = currentUser.photoURL || '';
        setPhotoDataUrl(photo);
        setPreviewPhoto(photo);
      }
    });
  }, [currentUser]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!displayName.trim()) { showToast('Please enter a name.'); return; }

    haptic.medium();
    setSaving(true);

    // Safety timeout – force saving state off after SAVE_TIMEOUT
    saveTimer.current = setTimeout(() => {
      setSaving(false);
      showToast('Save is taking longer than expected…');
    }, SAVE_TIMEOUT);

    try {
      // Update Auth profile
      await saveProfile(currentUser, {
        displayName: displayName.trim(),
        photoURL: photoDataUrl,
      });

      // Update Firestore directly
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName.trim(),
        profilePhoto: photoDataUrl || null,
      });

      clearTimeout(saveTimer.current);
      onSaved?.(displayName.trim(), photoDataUrl);
      showToast('Profile saved!');
      setSaving(false);
      onBack();
    } catch (err: any) {
      clearTimeout(saveTimer.current);
      console.error('Profile save failed:', err.message);

      // If permission error, try refreshing token and retry once
      if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        try {
          await currentUser.getIdToken(true);
          await updateDoc(doc(db, 'users', currentUser.uid), {
            displayName: displayName.trim(),
            profilePhoto: photoDataUrl || null,
          });
          onSaved?.(displayName.trim(), photoDataUrl);
          showToast('Profile saved!');
          setSaving(false);
          onBack();
          return;
        } catch (retryErr) {
          console.error('Retry also failed:', retryErr.message);
        }
      }

      // Final fallback – save locally
      try {
        localStorage.setItem('ec_profile_pending', JSON.stringify({
          displayName: displayName.trim(),
          profilePhoto: photoDataUrl,
        }));
      } catch {}
      showToast('Saved locally – will sync later.');
      setSaving(false);
      onBack();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const fullSize = reader.result as string;
      try {
        const small = await compressImage(fullSize);
        setPhotoDataUrl(small);
        setPreviewPhoto(small);
      } catch {
        setPhotoDataUrl(fullSize);
        setPreviewPhoto(fullSize);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoDataUrl('');
    setPreviewPhoto('');
  };

  const actionBtnStyle: React.CSSProperties = {
    minWidth: '120px',
    padding: '10px 18px',
    borderRadius: '12px',
    background: 'var(--glass-2)',
    color: 'var(--text-1)',
    border: '1px solid var(--border)',
    fontWeight: 500,
    fontSize: '14px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'background 0.15s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: 'calc(14px + var(--sat)) 20px 14px',
        background: 'var(--glass-1)', backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border-b)', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        <button
          onClick={onBack}
          style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', background: 'var(--glass-3)', border: '1px solid var(--border-b)', cursor: 'pointer' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-1)' }}>Edit Profile</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 18px', borderRadius: '10px',
            background: 'var(--accent-dim)', color: 'var(--accent)',
            fontWeight: 600, fontSize: '14px', fontFamily: 'inherit',
            border: 'none', cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {/* Avatar & photo controls */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            margin: '0 auto 16px',
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            {previewPhoto ? (
              <img src={previewPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
                <circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.69-8 6h16c0-3.31-3.58-6-8-6z"/>
              </svg>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={actionBtnStyle}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-1)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-2)'}
            >
              {previewPhoto ? 'Change Photo' : 'Add Photo'}
            </button>
            {previewPhoto && (
              <button
                onClick={removePhoto}
                style={{
                  ...actionBtnStyle,
                  color: '#ff6b6b',
                  borderColor: 'rgba(255,107,107,0.25)',
                  background: 'rgba(255,107,107,0.08)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,107,107,0.15)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,107,107,0.08)'}
              >
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {/* Name input */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 12px',
          borderRadius: '12px',
          background: 'var(--glass-2)',
          border: '1px solid var(--border-b)',
          marginBottom: '24px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: '8px' }}>
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: 'var(--text-1)',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </div>
  );
}
