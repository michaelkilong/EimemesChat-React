// AboutView.tsx — v2.3 — iOS-style inset separators, white labels/values, description white
// v2.2 — Uses AppContext for theme, correct import
// v2.1 — (previous history) …
// v1.3 — Larger logo, removed duplicate brand name

import React from 'react';
import { useApp } from '../context/AppContext';

interface Props {
  onBack: () => void;
  onOpenLicenses: () => void;
}

/** A thin horizontal line, inset to align with the row's text (like iOS). */
function Separator() {
  return (
    <div
      style={{
        height: '1px',
        background: 'var(--border-b)',
        marginLeft: '16px',
      }}
    />
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
        }}
      >
        <span style={{ fontSize: '15px', color: 'var(--text-1)' }}>{label}</span>
        <span style={{ fontSize: '15px', color: 'var(--text-1)' }}>{value}</span>
      </div>
      {!last && <Separator />}
    </>
  );
}

export default function AboutView({ onBack, onOpenLicenses }: Props) {
  const { isDark } = useApp();

  // Dark theme → original logo, Light theme → new light logo
  const logoSrc = isDark ? '/chat-logo.png' : '/chat-logo-light.png';

  const infoRows = [
    { label: 'Developer', value: 'EimemesChat Developers' },
    { label: 'Version', value: '4.0.0' },
    { label: 'Platform', value: 'Web / PWA' },
    { label: 'AI Model', value: 'Llama 3 via Groq' },
    { label: 'Released', value: '2026' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: 'calc(16px + var(--sat)) 20px 16px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-1)',
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-1)',
          }}
        >
          About
        </span>
      </header>

      <div
        className="scroll-thin"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 48px' }}
      >
        {/* App identity – theme‑aware logo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 16px',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <img
            src={logoSrc}
            alt="App logo"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '0px',
              objectFit: 'contain',
              marginBottom: '4px',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div style={{ fontSize: '14px', color: 'var(--text-3)' }}>
            Version 4.0
          </div>
        </div>

        {/* Info rows – iOS grouped card with inset separators */}
        <div
          style={{
            background: 'var(--glass-2)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          {infoRows.map((row, i) => (
            <InfoRow
              key={row.label}
              label={row.label}
              value={row.value}
              last={i === infoRows.length - 1}
            />
          ))}
        </div>

        {/* Description – now white text */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--glass-2)',
            marginBottom: '16px',
            fontSize: '14px',
            color: 'var(--text-1)',
            lineHeight: 1.7,
          }}
        >
          EimemesChat AI is an intelligent chat assistant built for everyone, with
          a special focus on the Thadou Kuki community of Northeast India. Powered
          by advanced AI, it supports file reading, personalization, and natural
          conversation.
        </div>

        {/* Open Source Licenses – unchanged */}
        <div
          onClick={onOpenLicenses}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--glass-2)',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-1)',
              }}
            >
              Open Source Licenses
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-3)',
                marginTop: '2px',
              }}
            >
              Third-party libraries used in this app
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-3)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Copyright */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-3)',
            padding: '8px 0',
          }}
        >
          © 2026 Michael Kilong · MIT License
        </div>
      </div>
    </div>
  );
}
