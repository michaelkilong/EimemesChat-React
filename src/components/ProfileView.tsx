// components/ProfileView.tsx — v2.3 (refetch after edit)
import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useApp } from '../context/AppContext';
import DeleteAccountModal from './modals/DeleteAccountModal';
import EditProfileView from './EditProfileView';

interface Props {
  onBack: () => void;
  getUserConvsRef: () => any;
}

function SettingsRow({ icon, label, desc, red, onClick }: {
  icon: React.ReactNode; label: string; desc?: string;
  red?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '13px 16px', cursor: 'pointer',
        transition: 'background 0.12s',
        borderBottom: '1px solid var(--border-b)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-3)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      <div className={`settings-row-icon ${red ? 'red' : ''}`}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: red ? '#ff6b6b' : 'var(--text-1)' }}>{label}</div>
        {desc && <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '1px' }}>{desc}</div>}
      </div>
      <div style={{ color: 'var(--text-3)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 4px', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{
        background: 'var(--glass-2)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

export default function ProfileView({ onBack, getUserConvsRef }: Props) {
  const { currentUser, showToast, showConfirm } = useApp();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [customDisplayName, setCustomDisplayName] = useState<string | null>(null);

  // Fetch custom profile data – also runs when returning from edit screen
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.profilePhoto) setCustomPhoto(data.profilePhoto);
        if (data.displayName) setCustomDisplayName(data.displayName);
      }
    });
  }, [currentUser, editingProfile]);   // ← refetch when editingProfile changes

  const handleLogoutAll = async () => {
    if (!currentUser) return;
    const yes = await showConfirm(
      'All active sessions will be signed out. You will need to sign back in.',
      'Logout all', 'Logout all devices?'
    );
    if (!yes) return;
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { revokedAt: new Date().toISOString() }, { merge: true });
      showToast('Signing out from all devices…');
      setTimeout(() => signOut(auth).catch(console.error), 1400);
    } catch {
      showToast('Something went wrong. Please try again.');
    }
  };

  if (editingProfile) {
    return <EditProfileView onBack={() => setEditingProfile(false)} />;
  }

  const displayName = customDisplayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const photoUrl = (customPhoto !== null && customPhoto !== '')
    ? customPhoto
    : (currentUser?.photoURL || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
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
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-1)' }}>Profile</span>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 40px' }}>

        {/* Clean profile identity block – no card */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingBottom: '32px', borderBottom: '1px solid var(--border-b)', marginBottom: '24px',
        }}>
          <div style={{
            width: '88px', height: '88px', borderRadius: '50%',
            marginBottom: '16px',
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="38" height="38" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
                <circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.69-8 6h16c0-3.31-3.58-6-8-6z"/>
              </svg>
            )}
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
            {displayName}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '16px' }}>
            {currentUser?.email}
          </p>
          <button
            onClick={() => setEditingProfile(true)}
            style={{
              padding: '8px 20px', borderRadius: '20px',
              background: 'var(--accent-dim)', color: 'var(--accent)',
              fontWeight: 600, fontSize: '14px', fontFamily: 'inherit',
              border: 'none', cursor: 'pointer',
            }}
          >
            Edit Profile
          </button>
        </div>

        <SettingsSection title="Security">
          <SettingsRow
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>}
            label="Logout all devices" desc="Sign out from all active sessions"
            onClick={handleLogoutAll}
          />
        </SettingsSection>

        <SettingsSection title="Danger Zone">
          <SettingsRow
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
            label="Delete Account" desc="Delete your account and all data"
            red onClick={() => setDeleteVisible(true)}
          />
        </SettingsSection>

        <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', padding: '30px 0 10px' }}>
          EimemesChat AI · 2026
        </div>
      </div>

      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        getUserConvsRef={getUserConvsRef}
      />
    </div>
  );
}
