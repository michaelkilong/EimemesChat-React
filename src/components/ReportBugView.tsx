// ReportBugView.tsx — v5.0 (sends reporter info with bug report)
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
  const { currentUser } = useApp();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      // Include reporter details from the logged‑in user
      const body = {
        message: message.trim(),
        reporterName: currentUser?.displayName || 'Anonymous',
        reporterEmail: currentUser?.email || 'unknown@email',
        reporterUid: currentUser?.uid || 'unknown',
      };

      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to send report');
      haptic.success();
      setSent(true);
    } catch (error) {
      console.error('Bug report failed:', error);
    } finally {
      setSending(false);
    }
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

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              style={{
                width: '100%',
                padding: '14px 0',
                background: message.trim() && !sending ? '#3b82f6' : 'rgba(59, 130, 246, 0.25)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: message.trim() && !sending ? 'pointer' : 'default',
                opacity: message.trim() && !sending ? 1 : 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.2s, opacity 0.2s',
              }}
            >
              {sending ? (
                <>
                  <div style={{
                    width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Sending…
                </>
              ) : (
                <>
                  Send Report
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </>
              )}
            </button>
          </>
        ) : (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: 'var(--text-2)', fontSize: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Thanks for your report!</p>
            <p>We'll review it as soon as possible.</p>
            <button
              onClick={onBack}
              style={{
                marginTop: '24px',
                padding: '10px 24px',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Settings
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
