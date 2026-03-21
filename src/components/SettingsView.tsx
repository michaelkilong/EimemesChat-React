import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import SignOutModal from './modals/SignOutModal';
import type { Conversation } from '../types';

interface Props {
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenPersonalization: () => void;
  onClearChats: () => void;
  conversations: Conversation[];
}

// Circular icon container — matches proposed design
function RoundIcon({ color, circle, children }: { color?: string; circle?: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      width: '36px', height: '36px',
      borderRadius: circle ? '50%' : '10px',
      flexShrink: 0,
      background: color || 'var(--accent-dim)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

// Standalone card row — no grouping, each row is its own card
function SettingsCard({
  icon, iconColor, label, desc, red, value, toggle, toggleOn, onToggle, onClick, nochevron,
}: {
  icon: React.ReactNode; iconColor?: string; label: string; desc?: string;
  red?: boolean; value?: string; toggle?: boolean; toggleOn?: boolean;
  onToggle?: () => void; onClick?: () => void; nochevron?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onClick={toggle ? onToggle : onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px',
        background: pressed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'background 0.12s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <RoundIcon color={red ? 'rgba(255,75,75,0.25)' : iconColor}>{icon}</RoundIcon>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: 500, color: red ? '#ff6b6b' : 'var(--text-1)' }}>{label}</div>
        {desc && <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '1px' }}>{desc}</div>}
      </div>

      {/* Value label e.g. "Dark" */}
      {value && !toggle && (
        <span style={{ fontSize: '15px', color: 'var(--text-3)', marginRight: '4px' }}>{value}</span>
      )}

      {/* Toggle switch */}
      {toggle && (
        <div
          onClick={e => { e.stopPropagation(); onToggle?.(); }}
          style={{
            width: '51px', height: '31px', borderRadius: '999px', flexShrink: 0,
            background: toggleOn ? '#30d158' : 'rgba(255,255,255,0.2)',
            position: 'relative', cursor: 'pointer',
            transition: 'background 0.22s',
          }}
        >
          <div style={{
            position: 'absolute', top: '2px',
            left: toggleOn ? '22px' : '2px',
            width: '27px', height: '27px', borderRadius: '50%',
            background: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'left 0.22s',
          }} />
        </div>
      )}

      {/* Chevron */}
      {!toggle && !nochevron && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </div>
  );
}

export default function SettingsView({ onBack, onOpenProfile, onOpenPersonalization, onClearChats }: Props) {
  const { currentUser, showToast, showConfirm } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const [signOutVisible, setSignOutVisible] = useState(false);

  const handleClearChats = async () => {
    const yes = await showConfirm("All chats can't be recovered. Clear everything?", 'Delete', 'Clear all chats?');
    if (yes) { onClearChats(); showToast('All chats cleared.'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Header — large bold title, circular back button */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: 'calc(16px + var(--sat)) 20px 16px',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.08)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-1)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '26px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>
          Settings
        </span>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 40px' }}>

        {/* Profile card */}
        {currentUser && (
          <SettingsCard
            onClick={onOpenProfile}
            iconColor="var(--accent-dim)"
            icon={
              currentUser.photoURL
                ? <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={currentUser.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.69-8 6h16c0-3.31-3.58-6-8-6z"/></svg>
            }
            label={currentUser.displayName || 'User'}
            desc={currentUser.email || ''}
          />
        )}

        {/* Section label */}
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '4px 4px 8px' }}>Personalization</div>

        <SettingsCard
          onClick={onOpenPersonalization}
          iconColor="var(--accent-dim)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M17 11l1.5 1.5L21 10"/></svg>}
          label="Personalization"
          desc="Tone, nickname, custom instructions"
        />

        {/* Section label */}
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '4px 4px 8px' }}>Account</div>

        <SettingsCard
          onClick={() => setSignOutVisible(true)}
          iconColor="var(--accent-dim)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
          label="Sign out"
          desc="End your session"
        />

        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '4px 4px 8px' }}>Data</div>

        <SettingsCard
          onClick={handleClearChats}
          red
          iconColor="rgba(255,75,75,0.25)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
          label="Clear all chats"
          desc="Permanently erase conversation history"
        />

        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '4px 4px 8px' }}>Appearance</div>

        <SettingsCard
          iconColor="rgba(255,255,255,0.1)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
          label="Dark Mode"
          desc="Override system preference"
          toggle
          toggleOn={isDark}
          onToggle={toggleTheme}
        />

        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '4px 4px 8px' }}>Info</div>

        <SettingsCard
          onClick={() => window.open('https://app-eimemeschat.vercel.app/privacy.html', '_blank')}
          iconColor="var(--accent-dim)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
          label="Privacy Policy"
          desc="How we handle your data"
        />

        <SettingsCard
          onClick={() => window.open('https://app-eimemeschat.vercel.app/support.html', '_blank')}
          iconColor="var(--accent-dim)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          label="Help & Support"
          desc="FAQ and contact"
        />

        <SettingsCard
          onClick={() => window.open('https://app-eimemeschat.vercel.app/about.html', '_blank')}
          iconColor="var(--accent-dim)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          label="About"
          desc="EimemesChat AI · v3.4"
        />

        <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', padding: '24px 0 10px' }}>
          EimemesChat AI · 2026
        </div>
      </div>

      <SignOutModal visible={signOutVisible} onClose={() => setSignOutVisible(false)} />
    </div>
  );
}
