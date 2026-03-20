import React, { useState } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import SignOutModal from './modals/SignOutModal';
import type { Conversation } from '../types';

interface Props {
  onBack: () => void;
  onOpenProfile: () => void;
  onClearChats: () => void;
  conversations: Conversation[];
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

export default function SettingsView({ onBack, onOpenProfile, onClearChats }: Props) {
  const { currentUser, showToast, showConfirm } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const [signOutVisible, setSignOutVisible] = useState(false);

  const handleClearChats = async () => {
    const yes = await showConfirm("All chats can't be recovered. Clear everything?", 'Delete', 'Clear all chats?');
    if (yes) {
      onClearChats();
      showToast('All chats cleared.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
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
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-1)' }}>Settings</span>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', WebkitOverflowScrolling: 'touch' as any }}>

        {/* Profile card */}
        {currentUser && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'var(--glass-2)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden',
            }}>
              <div
                onClick={onOpenProfile}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '13px 16px', cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-3)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <img
                  src={currentUser.photoURL || ''}
                  alt="Profile"
                  style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', flexShrink: 0 }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 24 24' fill='%23999'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M12 14c-4.42 0-8 2.69-8 6h16c0-3.31-3.58-6-8-6z'/%3E%3C/svg%3E`; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)' }}>{currentUser.displayName || 'User'}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '1px' }}>{currentUser.email}</div>
                </div>
                <div style={{ color: 'var(--text-3)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            label="Sign out" desc="End your session"
            onClick={() => setSignOutVisible(true)}
          />
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="Data">
          <SettingsRow
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
            label="Clear all chats" desc="Permanently erase conversation history"
            red onClick={handleClearChats}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)' }}>Dark Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Override system preference</div>
            </div>
            <button className={`toggle-switch ${isDark ? 'on' : ''}`} onClick={toggleTheme} aria-label="Toggle dark mode">
              <div className="toggle-knob" />
            </button>
          </div>
        </SettingsSection>

        {/* Info */}
        <SettingsSection title="Info">
          <SettingsRow icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>} label="Privacy Policy" desc="How we handle your data" onClick={() => window.open('https://app-eimemeschat.vercel.app/privacy.html','_blank')} />
          <SettingsRow icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} label="Help & Support" desc="FAQ and contact" onClick={() => window.open('https://app-eimemeschat.vercel.app/support.html','_blank')} />
          <SettingsRow icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} label="About" desc="EimemesChat AI · v3.4" onClick={() => window.open('https://app-eimemeschat.vercel.app/about.html','_blank')} />
        </SettingsSection>

        <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', padding: '30px 0 10px' }}>
          EimemesChat AI · 2026
        </div>
      </div>

      <SignOutModal visible={signOutVisible} onClose={() => setSignOutVisible(false)} />
    </div>
  );
}
