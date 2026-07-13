// ReportBugView.tsx — v2.1 (blue send button, visible in both themes)
import React, { useState } from 'react';
import { haptic } from '../lib/haptic';

interface Props {
  onBack: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '16px',
  border: '1px solid var(--border)',
  background: 'var(--input-bg)',
  color: 'var(--text-1)',
  fontSize: '15px',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
  resize: 'vertical',
  minHeight: '160px',
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.3px',
  color: 'var(--text-2)',
  marginBottom: '8px',
  display: 'block',
};

export default function ReportBugView({ onBack }: Props) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    haptic.success();
    const subject = encodeURIComponent('Bug Report – EimemesChat');
    const body = encodeURIComponent(message);
    window.location.href = `mailto:support.eimemeschat@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: 'calc(16px + var(--sat)) 20px 16px',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-1)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>
          Report a Bug
        </span>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 48px' }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Describe the bug</label>
          <textarea
            style={inputStyle}
            placeholder="What happened? What did you expect? Any steps to reproduce?"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={2000}
            onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent)'}
            onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)'}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px', textAlign: 'right' }}>
            {message.length}/2000
          </div>
        </div>

        {/* Blue Send button — clearly visible in both dark & light themes */}
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          style={{
            width: '100%',
            padding: '14px 0',
            background: message.trim() ? '#3b82f6' : 'rgba(59, 130, 246, 0.25)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: message.trim() ? 'pointer' : 'default',
            opacity: message.trim() ? 1 : 0.7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          Send Report
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
