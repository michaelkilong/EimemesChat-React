// SourcesList.tsx — v1.0
// Renders web search sources at bottom of AI message, like ChatGPT
import React, { useState } from 'react';
import type { Source } from '../types';

interface Props {
  sources: Source[];
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

export default function SourcesList({ sources }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!sources?.length) return null;

  return (
    <div className="sources-list">
      <div className="sources-list-title">Sources</div>
      {sources.map((src, i) => (
        <div key={i}>
          <div
            className="source-item"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <span className="source-num">{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="source-title">{src.title}</div>
              <div className="source-url">{getDomain(src.url)}</div>
            </div>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, transform: expanded === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {/* Expanded — show full URL with open link */}
          {expanded === i && (
            <div style={{
              padding: '8px 12px 10px 26px',
              background: 'var(--glass-3)',
              borderRadius: '10px',
              marginBottom: '4px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {src.url}
              </div>
              <a
                href={src.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  marginTop: '6px', fontSize: '12px', color: 'var(--accent)',
                  fontWeight: 500,
                }}
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
  );
}
