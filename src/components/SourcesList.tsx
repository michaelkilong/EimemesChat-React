// SourcesList.tsx — v1.1 — Bubble style like ChatGPT, collapsible
import React, { useState } from 'react';
import type { Source } from '../types';

interface Props { sources: Source[]; msgKey?: string; }

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

// Registry of expand handlers keyed by msgKey — avoids the global overwrite race
// when multiple SourcesLists are mounted simultaneously.
const expandRegistry = new Map<string, (index: number) => void>();

// Global dispatcher — citation buttons call this, it looks up the right handler
if (!(window as any).__expandSource) {
  (window as any).__expandSource = (index: number, msgKey?: string) => {
    if (msgKey && expandRegistry.has(msgKey)) {
      expandRegistry.get(msgKey)!(index);
    } else {
      // Fallback: expand the most recently registered (streaming bubble)
      const last = [...expandRegistry.values()].pop();
      last?.(index);
    }
  };
}

export default function SourcesList({ sources, msgKey }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const selfRef = React.useRef<HTMLDivElement>(null);

  // Register this instance's expand handler in the registry
  React.useEffect(() => {
    const key = msgKey || '__default';
    expandRegistry.set(key, (index: number) => {
      setOpen(true);
      setExpanded(index);
      setTimeout(() => {
        selfRef.current?.querySelector('.sources-pill')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    });
    return () => { expandRegistry.delete(key); };
  }, [msgKey]);

  if (!sources?.length) return null;

  return (
    <div ref={selfRef} style={{ marginTop: '14px' }}>
      {/* Collapsed pill — tap to expand, like ChatGPT */}
      <button
        onClick={() => setOpen(o => !o)}
        className="sources-pill"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', borderRadius: '999px',
          background: 'var(--glass-2)',
          border: '1px solid var(--border)',
          color: 'var(--text-2)', fontSize: '13px', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--glass-2)')}
      >
        {/* Globe icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded bubble — sources list inside a card */}
      {open && (
        <div style={{
          marginTop: '8px',
          background: 'var(--glass-2)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {sources.map((src, i) => (
            <div key={i}>
              <div
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', cursor: 'pointer',
                  borderBottom: i < sources.length - 1 ? '1px solid var(--border-b)' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-3)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                {/* Number badge */}
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {src.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
                    {getDomain(src.url)}
                  </div>
                </div>

                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: expanded === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {/* Expanded URL + open link */}
              {expanded === i && (
                <div style={{
                  padding: '10px 14px 12px 44px',
                  background: 'var(--glass-3)',
                  borderBottom: i < sources.length - 1 ? '1px solid var(--border-b)' : 'none',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {src.url}
                  </div>
                  <a
                    href={src.url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}
                  >
                    Open link
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
