// components/EditProfileView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useProfile } from '../hooks/useProfile';
import { haptic } from '../lib/haptic';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  onBack: () => void;
}

export default function EditProfileView({ onBack }: Props) {
  const { currentUser, showToast } = useApp();
  const { saving, saveProfile } = useProfile();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Load existing custom photo and name from Firestore
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.profilePhoto) setPhotoDataUrl(data.profilePhoto);
        if (data.displayName) setDisplayName(data.displayName);
      }
    });
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!displayName.trim()) { showToast('Please enter a name.'); return; }
    haptic.medium();
    await saveProfile(currentUser, {
      displayName: displayName.trim(),
      photoURL: photoDataUrl,
    });
    showToast('Profile saved!');
    onBack();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => setPhotoDataUrl('');

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
        {/* Photo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            margin: '0 auto 16px',
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
                <circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.69-8 6h16c0-3.31-3.58-6-8-6z"/>
              </svg>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: 'var(--glass-2)', color: 'var(--accent)',
                border: '1px solid var(--border)', fontWeight: 500,
                fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {photoDataUrl ? 'Change Photo' : 'Add Photo'}
            </button>
            {photoDataUrl && (
              <button
                onClick={removePhoto}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'var(--glass-3)', color: '#ff6b6b',
                  border: '1px solid rgba(255,107,107,0.25)', fontWeight: 500,
                  fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {/* Name */}
        <div style={{
          background: 'var(--glass-2)', borderRadius: '16px',
          border: '1px solid var(--border)', padding: '4px',
          marginBottom: '24px',
        }}>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: '12px',
              background: 'var(--glass-1)', border: '1px solid var(--border)',
              color: 'var(--text-1)', fontSize: '16px', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </div>
  );
}
