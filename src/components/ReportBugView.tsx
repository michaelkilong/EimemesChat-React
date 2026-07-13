// ReportBugView.tsx — v1.0
// Dedicated bug-report page – opens a pre-filled email to support.eimemeschat@gmail.com
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
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    haptic.success();
    const subject = encodeURIComponent('Bug Report – EimemesChat');
    const body = encodeURIComponent(message);
    window.location.href = `mailto:support.eimemeschat@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Header — identical style to PersonalizationView */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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

        <button
          onClick={handleSend}
          disabled={!message.trim()}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: message.trim() ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: message.trim() ? 'pointer' : 'default',
            color: 'var(--accent)',
            opacity: message.trim() ? 1 : 0.5,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 48px' }}>
        {!sent ? (
          <>
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

            <div style={{
              background: 'var(--glass-2)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                When you submit, your email app will open with the report pre‑filled.
                You can also attach screenshots there.
              </p>
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: 'var(--text-2)', fontSize: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Report sent!</p>
            <p>Open your email app to finish sending.</p>
          </div>
        )}
      </div>
    </div>
  );
}
