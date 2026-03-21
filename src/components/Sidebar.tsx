import React, { useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { haptic } from '../lib/haptic';
import type { Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  currentConvId: string | null;
  onNewChat: () => void;
  onSelectConv: (id: string) => void;
  onOpenSettings: () => void;
  onDeleteConv: (id: string) => void;
}

export default function Sidebar({ conversations, currentConvId, onNewChat, onSelectConv, onOpenSettings, onDeleteConv }: Props) {
  const { sidebarOpen, setSidebarOpen, showConfirm } = useApp();

  // Long press logic — 500ms hold triggers delete confirm
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startPress = useCallback((convId: string, title: string) => {
    didLongPress.current = false;
    pressTimer.current = setTimeout(async () => {
      didLongPress.current = true;
      haptic.heavy(); // buzz on long press trigger
      const yes = await showConfirm(
        `"${(title || 'This conversation').slice(0, 40)}" will be permanently deleted.`,
        'Delete',
        'Delete conversation?'
      );
      if (yes) { haptic.heavy(); onDeleteConv(convId); }
    }, 500);
  }, [showConfirm, onDeleteConv]);

  const endPress = useCallback((convId: string) => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);

  const handleClick = useCallback((convId: string) => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    onSelectConv(convId);
    setSidebarOpen(false);
  }, [onSelectConv, setSidebarOpen]);

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-mask show"
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'block', position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)', zIndex: 29,
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}

      <aside style={{
        width: '260px', flexShrink: 0,
        background: 'var(--bg-a)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        ...(typeof window !== 'undefined' && window.innerWidth <= 768 ? {
          position: 'fixed' as const, top: 0, left: 0, bottom: 0,
          zIndex: 30,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        } : {}),
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'calc(18px + var(--sat)) 16px 14px',
          borderBottom: '1px solid var(--border-b)', flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '19px', fontWeight: 700,
            background: 'linear-gradient(135deg, #5e9cff, #c96eff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            letterSpacing: '-0.3px', userSelect: 'none',
          }}>
            ✦ EimemesChat AI
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="menu-btn-mobile"
            style={{
              width: '34px', height: '34px', borderRadius: '10px',
              display: 'none', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2)', background: 'var(--glass-3)',
              border: '1px solid var(--border-b)', cursor: 'pointer',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* New chat */}
        <button
          onClick={onNewChat}
          style={{
            margin: '12px 12px 0', padding: '11px 14px', borderRadius: '14px',
            border: '1px solid var(--border)', background: 'var(--glass-3)',
            color: 'var(--text-2)', fontSize: '14.5px', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s, border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--accent-dim)'; b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'var(--glass-3)'; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-2)'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New chat
        </button>

        {/* Hint */}
        <div style={{ padding: '8px 16px 2px', fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic' }}>
          Hold to delete a conversation
        </div>

        {/* History */}
        <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '6px 10px 4px' }}>
            Recents
          </div>
          {conversations.length === 0
            ? <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-3)' }}>No conversations yet</div>
            : conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => handleClick(conv.id)}
                onMouseDown={() => startPress(conv.id, conv.title)}
                onMouseUp={() => endPress(conv.id)}
                onTouchStart={() => startPress(conv.id, conv.title)}
                onTouchEnd={() => endPress(conv.id)}
                onContextMenu={e => e.preventDefault()}
                style={{
                  padding: '9px 12px', borderRadius: '10px',
                  color: conv.id === currentConvId ? 'var(--accent)' : 'var(--text-2)',
                  background: conv.id === currentConvId ? 'var(--accent-dim)' : 'transparent',
                  fontWeight: conv.id === currentConvId ? 500 : 400,
                  fontSize: '14.5px', cursor: 'pointer',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  transition: 'background 0.12s, color 0.12s',
                  userSelect: 'none', WebkitUserSelect: 'none',
                }}
                onMouseEnter={e => { if (conv.id !== currentConvId) { (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-3)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--text-1)'; } }}
                onMouseLeave={e => { endPress(conv.id); if (conv.id !== currentConvId) { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = 'var(--text-2)'; } }}
              >
                {conv.title || 'New conversation'}
              </div>
            ))
          }
        </div>

        {/* Footer — Settings */}
        <div style={{ borderTop: '1px solid var(--border-b)', padding: '10px', paddingBottom: 'calc(10px + var(--sab))', flexShrink: 0 }}>
          <button
            onClick={onOpenSettings}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: '14px',
              color: 'var(--text-2)', fontSize: '14.5px',
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--glass-3)', border: '1px solid transparent',
              cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--glass-2)'; b.style.color = 'var(--text-1)'; b.style.borderColor = 'var(--border-b)'; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'var(--glass-3)'; b.style.color = 'var(--text-2)'; b.style.borderColor = 'transparent'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
