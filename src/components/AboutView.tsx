// AboutView.tsx — v1.0
import React from 'react';

interface Props {
  onBack: () => void;
  onOpenLicenses: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 16px',
      borderBottom: '1px solid var(--border-b)',
    }}>
      <span style={{ fontSize: '15px', color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: '15px', color: 'var(--text-3)' }}>{value}</span>
    </div>
  );
}

export default function AboutView({ onBack, onOpenLicenses }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: 'calc(16px + var(--sat)) 20px 16px', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-1)', flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>
          About
        </span>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 48px' }}>

        {/* App identity */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '32px 16px', gap: '10px', textAlign: 'center',
        }}>
          {/* App icon placeholder */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #1a1040, #0d0820)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '4px',
          }}>
            <span style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700, fontSize: '42px',
              background: 'linear-gradient(135deg, #5e9cff, #c96eff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>E</span>
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-1)' }}>
            EimemesChat AI
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-3)' }}>
            Version 4.0 · Built by Eimemes AI Team
          </div>
        </div>

        {/* Info rows */}
        <div style={{ background: 'var(--glass-2)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
          <Row label="Developer" value="Michael Kilong" />
          <Row label="Version" value="4.0.0" />
          <Row label="Platform" value="Web / PWA" />
          <Row label="AI Model" value="Llama 3 via Groq" />
          <Row label="Released" value="2026" />
        </div>

        {/* Description */}
        <div style={{
          padding: '16px', borderRadius: '16px',
          background: 'var(--glass-2)', marginBottom: '16px',
          fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7,
        }}>
          EimemesChat AI is an intelligent chat assistant built for everyone, with a special focus on the Thadou Kuki community of Northeast India. Powered by advanced AI, it supports file reading, personalization, and natural conversation.
        </div>

        {/* Open Source Licenses */}
        <div
          onClick={onOpenLicenses}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px', borderRadius: '16px',
            background: 'var(--glass-2)', cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)' }}>Open Source Licenses</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Third-party libraries used in this app</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>

        {/* Copyright */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-3)', padding: '8px 0' }}>
          © 2026 Michael Kilong · MIT License
        </div>
      </div>
    </div>
  );
}
