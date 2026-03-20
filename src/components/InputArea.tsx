import React, { useRef, useEffect, useState } from 'react';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isSending: boolean;
  isStreaming: boolean;
  dailyLimitReached: boolean;
}

export default function InputArea({ onSend, onStop, isSending, isStreaming, dailyLimitReached }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  useEffect(() => { autoResize(); }, [value]);

  const canSend = value.trim().length > 0 && !isSending && !isStreaming && !dailyLimitReached;

  const handleSend = () => {
    if (!canSend) return;
    const text = value.trim();
    setValue('');
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      flexShrink: 0, padding: '10px 18px',
      paddingBottom: 'calc(12px + var(--sab))',
      background: 'transparent',
    }}>
      <div style={{ maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
        <div style={{
          background: 'var(--input-bg)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border)',
          borderRadius: '40px',
          boxShadow: 'var(--sh-input)',
          position: 'relative',
        }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Eimemes…"
            rows={1}
            disabled={dailyLimitReached}
            style={{
              width: '100%', background: 'transparent',
              border: 'none', borderRadius: '0',
              padding: '14px 54px 14px 20px',
              fontSize: '15.5px', color: 'var(--text-1)',
              outline: 'none', resize: 'none',
              minHeight: '52px', maxHeight: '200px',
              lineHeight: 1.5, overflowY: 'auto',
              WebkitOverflowScrolling: 'touch' as any,
              fontFamily: 'inherit',
            }}
          />

          {/* Stop button */}
          {isStreaming && (
            <button
              onClick={onStop}
              style={{
                position: 'absolute', right: '8px',
                top: '50%', transform: 'translateY(-50%)',
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'rgba(255,60,60,0.9)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(255,50,50,0.3)',
                cursor: 'pointer', border: 'none',
                transition: 'opacity 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            </button>
          )}

          {/* Send button */}
          {!isStreaming && (
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                position: 'absolute', right: '8px',
                top: '50%', transform: 'translateY(-50%)',
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'var(--send-bg)', color: 'var(--send-fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: canSend ? '0 4px 14px rgba(0,122,255,0.4)' : 'none',
                cursor: canSend ? 'pointer' : 'default',
                opacity: canSend ? 1 : 0.28,
                border: 'none',
                transition: 'opacity 0.15s, transform 0.1s, box-shadow 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', marginTop: '8px', letterSpacing: '0.1px', pointerEvents: 'none' }}>
          {dailyLimitReached
            ? <span style={{ color: '#ff6b6b', fontWeight: 500 }}>Daily limit reached. Resets tomorrow.</span>
            : 'EimemesChat may make mistakes. Verify important information.'
          }
        </div>
      </div>
    </div>
  );
}
