// Sidebar.tsx — v2.4 — Settings button now matches search bar style (solid grey)
import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
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
  dailyCount?: number;
  dailyLimit?: number;
}

// ── Time grouping helper ──────────────────────────────────────
function getRelativeDateLabel(date: Date | { seconds: number; nanoseconds: number } | string | undefined): string {
  if (!date) return 'Earlier';

  let jsDate: Date;
  if (date instanceof Date) {
    jsDate = date;
  } else if (typeof date === 'object' && 'seconds' in date) {
    jsDate = new Date(date.seconds * 1000);
  } else if (typeof date === 'string') {
    jsDate = new Date(date);
  } else {
    return 'Earlier';
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 86400000);

  if (jsDate >= todayStart) return 'Today';
  if (jsDate >= yesterdayStart) return 'Yesterday';
  if (jsDate >= thirtyDaysAgo) return 'Last 30 Days';
  return 'Earlier';
}

export default function Sidebar({ conversations, currentConvId, onNewChat, onSelectConv, onOpenSettings, onDeleteConv, dailyCount = 0, dailyLimit = 150 }: Props) {
  const { sidebarOpen, setSidebarOpen, showConfirm } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onFocus = () => setTimeout(() => searchRef.current?.focus(), 100);
    window.addEventListener('focus-search', onFocus);
    return () => window.removeEventListener('focus-search', onFocus);
  }, []);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startPress = useCallback((convId: string, title: string) => {
    didLongPress.current = false;
    pressTimer.current = setTimeout(async () => {
      didLongPress.current = true;
      haptic.heavy();
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

  const groupedConversations = useMemo(() => {
    const filtered = searchQuery
      ? conversations.filter(c => (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
      : conversations;

    if (searchQuery) {
      return { 'Results': filtered };
    }

    const groups: Record<string, Conversation[]> = {
      'Today': [],
      'Yesterday': [],
      'Last 30 Days': [],
      'Earlier': [],
    };

    const sorted = [...filtered].sort((a, b) => {
      const aTime = (a.updatedAt as any)?.seconds || 0;
      const bTime = (b.updatedAt as any)?.seconds || 0;
      return bTime - aTime;
    });

    for (const conv of sorted) {
      const label = getRelativeDateLabel(conv.updatedAt);
      if (groups[label]) {
        groups[label].push(conv);
      } else {
        groups['Earlier'].push(conv);
      }
    }

    return Object.fromEntries(
      Object.entries(groups).filter(([_, convs]) => convs.length > 0)
    );
  }, [conversations, searchQuery]);

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-mask show"
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'block', position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)', zIndex: 29,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
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
        ...(isMobile ? {
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

        {/* Search — grey background */}
        <div style={{ padding: '10px 12px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: '12px',
            background: 'var(--glass-2)',
            border: '1px solid var(--border-b)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: '13px', color: 'var(--text-1)', fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{
                width: '16px', height: '16px', borderRadius: '50%', background: 'var(--glass-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-3)', cursor: 'pointer', flexShrink: 0, border: 'none',
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Hint */}
        <div style={{ padding: '8px 16px 2px', fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic' }}>
          Hold to delete a conversation
        </div>

        {/* History — grouped by time */}
        <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {Object.entries(groupedConversations).map(([section, convs]) => (
            <div key={section} style={{ marginBottom: '4px' }}>
              <div style={{
                fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.7px',
                textTransform: 'uppercase', color: 'var(--text-3)',
                padding: '6px 10px 4px',
              }}>
                {section}
              </div>
              {convs.map(conv => (
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
                    color: conv.id === currentConvId ? 'var(--accent)' : 'var(--text-1)',
                    background: conv.id === currentConvId ? 'var(--accent-dim)' : 'transparent',
                    fontWeight: 500,
                    fontSize: '14.5px', cursor: 'pointer',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    transition: 'background 0.12s, color 0.12s',
                    userSelect: 'none', WebkitUserSelect: 'none',
                  }}
                  onMouseEnter={e => { if (conv.id !== currentConvId) { (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-3)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--text-1)'; } }}
                  onMouseLeave={e => { endPress(conv.id); if (conv.id !== currentConvId) { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = 'var(--text-1)'; } }}
                >
                  {conv.title || 'New conversation'}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer — Usage + Settings */}
        <div style={{ borderTop: '1px solid var(--border-b)', padding: '10px', paddingBottom: 'calc(10px + var(--sab))', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px 10px', fontSize: '12px', color: 'var(--text-3)',
          }}>
            <span>Today's usage</span>
            <span style={{
              fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              color: dailyCount >= dailyLimit ? '#ff6b6b' : dailyCount >= dailyLimit * 0.8 ? '#ffb340' : 'var(--text-2)',
            }}>
              {dailyCount}/{dailyLimit}
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: '14px',
              color: 'var(--text-2)', fontSize: '14.5px',
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--glass-2)',                      // same solid grey as search
              border: '1px solid var(--border-b)',                // matching border
              cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--glass-1)'; b.style.color = 'var(--text-1)'; b.style.borderColor = 'var(--border)'; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'var(--glass-2)'; b.style.color = 'var(--text-2)'; b.style.borderColor = 'var(--border-b)'; }}
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
