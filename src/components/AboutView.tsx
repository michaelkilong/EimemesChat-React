// AboutView.tsx — v1.5 (robust theme detection, multiple fallbacks)
import React, { useState, useEffect } from 'react';

interface Props {
  onBack: () => void;
  onOpenLicenses: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-b)',
      }}
    >
      <span style={{ fontSize: '15px', color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: '15px', color: 'var(--text-3)' }}>{value}</span>
    </div>
  );
}

/**
 * Determine if dark theme is active.
 * Checks (in order):
 * 1. data-theme attribute on <html>
 * 2. CSS class (common patterns: 'dark', 'theme-dark', 'dark-mode')
 * 3. System preference via matchMedia
 */
function getThemeIsDark(): boolean {
  const html = document.documentElement;

  // Method 1: data-theme attribute
  const themeAttr = html.getAttribute('data-theme');
  if (themeAttr === 'dark') return true;
  if (themeAttr === 'light') return false;

  // Method 2: CSS class (cover many frameworks)
  if (
    html.classList.contains('dark') ||
    html.classList.contains('theme-dark') ||
    html.classList.contains('dark-mode')
  ) {
    return true;
  }

  // Method 3: system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function AboutView({ onBack, onOpenLicenses }: Props) {
  const [isDark, setIsDark] = useState(getThemeIsDark);

  useEffect(() => {
    const html = document.documentElement;

    // Watch for attribute changes (data-theme)
    const attrObserver = new MutationObserver(() => {
      setIsDark(getThemeIsDark());
    });
    attrObserver.observe(html, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Watch for class changes (e.g., toggling 'dark' class)
    const classObserver = new MutationObserver(() => {
      setIsDark(getThemeIsDark());
    });
    classObserver.observe(html, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      attrObserver.disconnect();
      classObserver.disconnect();
    };
  }, []);

  // Dark theme → original logo, Light theme → new light logo
  const logoSrc = isDark ? '/chat-logo.png' : '/chat-logo-light.png';

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
        {/* App identity - theme‑aware logo */}
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

        {/* Info rows */}
        <div
          style={{
            background: 'var(--glass-2)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <Row label="Developer" value="EimemesChat Developers" />
          <Row label="Version" value="4.0.0" />
          <Row label="Platform" value="Web / PWA" />
          <Row label="AI Model" value="Llama 3 via Groq" />
          <Row label="Released" value="2026" />
        </div>

        {/* Description */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--glass-2)',
            marginBottom: '16px',
            fontSize: '14px',
            color: 'var(--text-2)',
            lineHeight: 1.7,
          }}
        >
          EimemesChat AI is an intelligent chat assistant built for everyone, with
          a special focus on the Thadou Kuki community of Northeast India. Powered
          by advanced AI, it supports file reading, personalization, and natural
          conversation.
        </div>

        {/* Open Source Licenses */}
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
