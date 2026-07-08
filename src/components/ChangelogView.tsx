// components/ChangelogView.tsx — v1.0 — Developer changelog
import React from 'react';

interface Props {
  onBack: () => void;
}

interface ChangeEntry {
  version: string;
  date: string;
  changes: string[];
}

const CHANGELOG: ChangeEntry[] = [
  {
    version: 'v2.6',
    date: 'July 8, 2026',
    changes: [
      'Reduced daily message limit from 150 to 100 to manage API costs.',
      'Real‑time usage counter in the sidebar – updates instantly after each message.',
      'Input area completely disabled when daily limit is reached, with a clear warning.',
    ],
  },
  {
    version: 'v2.5',
    date: 'July 8, 2026',
    changes: [
      'Fixed typing indicator not stopping when the prompt shield blocks a message.',
      'Typing indicator now also stops immediately when the AI stream ends.',
    ],
  },
  {
    version: 'v2.4',
    date: 'July 8, 2026',
    changes: [
      'Improved disclaimer styling – removed harsh orange colour, now subtle grey italic.',
      'Added layout‑stable favicon containers in search results (prevents content shifting).',
    ],
  },
  {
    version: 'v2.3',
    date: 'July 7, 2026',
    changes: [
      'Fixed regenerate button duplicating the user message (backend now strips duplicates).',
      'Added `isRegeneration` flag to API requests for accurate history handling.',
    ],
  },
  {
    version: 'v2.2',
    date: 'July 6, 2026',
    changes: [
      'Email verification gate for password sign‑ups (prevents fake accounts).',
      'Verification resend cooldown with live countdown.',
      'Google fallback button on verification screen.',
    ],
  },
  {
    version: 'v2.1',
    date: 'July 5, 2026',
    changes: [
      'Brighter accent colours for better contrast in dark mode.',
      'iOS‑style grouped settings with inset separators.',
      'Sidebar conversation time‑grouping (Today, Yesterday, etc.).',
    ],
  },
  {
    version: 'v2.0',
    date: 'July 4, 2026',
    changes: [
      'ChatGPT‑style black & grey dark theme.',
      'New animated loading screen with shimmering brand text.',
      'Auto‑scroll improvements – no longer fights manual scrolling.',
    ],
  },
  {
    version: 'v1.x',
    date: 'June 2026',
    changes: [
      'Initial release with Google & email/password authentication.',
      'Streaming AI responses via Groq and Gemini.',
      'Web search, file upload, voice input/output, and code syntax highlighting.',
    ],
  },
];

export default function ChangelogView({ onBack }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: 'calc(16px + var(--sat)) 20px 16px', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-1)', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>
          What's New
        </span>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 48px' }}>
        {CHANGELOG.map((entry, i) => (
          <div key={i} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)' }}>{entry.version}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>{entry.date}</span>
            </div>
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              {entry.changes.map((change, j) => (
                <li key={j} style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '4px', lineHeight: 1.5 }}>{change}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
