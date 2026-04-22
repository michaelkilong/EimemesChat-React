
// InputArea.tsx — v2.1 — Floating ChatGPT-style layout; gradient fade above; no model selector
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { processFile, getFileIcon } from '../lib/fileReader';
import { haptic } from '../lib/haptic';
import type { Attachment } from '../types';

const ACCEPTED = '.pdf,.txt,.md,.csv,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*';
const MAX_SIZE  = 20 * 1024 * 1024; // 20MB

interface Props {
  onSend: (text: string, attachment?: Attachment, useWebSearch?: boolean) => void;
  onStop: () => void;
  isSending: boolean;
  isStreaming: boolean;
  dailyLimitReached: boolean;
}

export default function InputArea({ onSend, onStop, isSending, isStreaming, dailyLimitReached }: Props) {
  const [value,      setValue]      = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fileError,  setFileError]  = useState('');
  const [webSearch,  setWebSearch]  = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  useEffect(() => { autoResize(); }, [value]);

  const canSend = (value.trim().length > 0 || attachment !== null)
    && !isSending && !isStreaming && !dailyLimitReached && !processing;

  const handleSend = () => {
    if (!canSend) return;
    haptic.medium();
    const text = value.trim();
    const att  = attachment ?? undefined;
    const ws   = webSearch;
    setValue('');
    setAttachment(null);
    setFileError('');
    setWebSearch(false);
    onSend(text || 'Please analyze this file.', att, ws);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setFileError('');
    if (file.size > MAX_SIZE) { setFileError('File too large (max 20MB)'); return; }
    setProcessing(true);
    try {
      setAttachment(await processFile(file));
    } catch (err) {
      setFileError('Could not read file. Try another format.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, []);

  const busy = isSending || isStreaming;

  return (
    /* Floating wrapper — transparent bg, gradient fade masks messages above */
    <div style={{
      position: 'relative',
      flexShrink: 0,
      paddingTop: '32px',
      paddingInline: '16px',
      paddingBottom: 'calc(12px + var(--sab))',
      background: 'transparent',
      maskImage: 'linear-gradient(to bottom, transparent 0%, black 28px)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 28px)',
    }}>
      <div style={{ maxWidth: '740px', margin: '0 auto' }}>

        {/* ── Attachment preview ── */}
        {(attachment || processing) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', marginBottom: '8px',
            background: 'var(--glass-2)', borderRadius: '16px',
            border: '1px solid var(--border)',
          }}>
            {processing ? (
              <>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--glass-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Reading file…</span>
              </>
            ) : attachment && (
              <>
                {attachment.type === 'image'
                  ? <img src={attachment.content} alt={attachment.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{getFileIcon(attachment.type)}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{attachment.type}</div>
                </div>
                <button
                  onClick={() => setAttachment(null)}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--glass-3)', border: '1px solid var(--border)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        )}

        {/* ── File error ── */}
        {fileError && (
          <div style={{ fontSize: '12px', color: '#ff6b6b', marginBottom: '6px', paddingLeft: '2px' }}>
            {fileError}
          </div>
        )}

        {/* ── Floating input box ── */}
        <div style={{
          background: 'var(--input-bg)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.06) inset',
          padding: '12px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachment ? 'Ask something about this file…' : 'Message Eimemes…'}
            rows={1}
            disabled={dailyLimitReached}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '15.5px',
              color: 'var(--text-1)',
              lineHeight: 1.55,
              minHeight: '26px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontFamily: 'inherit',
              padding: 0,
            }}
          />

          {/* ── Toolbar row ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Left: attach + web search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>

              {/* Paperclip */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || processing}
                title="Attach file"
                style={{
                  width: '34px', height: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '10px', background: 'transparent', border: 'none',
                  color: attachment ? 'var(--accent)' : 'var(--text-3)',
                  cursor: (busy || processing) ? 'default' : 'pointer',
                  opacity: (busy || processing) ? 0.4 : 1,
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { if (!busy && !processing) (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>

              {/* Web search */}
              <button
                onClick={() => { haptic.light(); setWebSearch(w => !w); }}
                disabled={busy}
                title={webSearch ? 'Web search on' : 'Web search off'}
                style={{
                  height: '34px', paddingInline: '10px',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  borderRadius: '10px',
                  background: webSearch ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  color: webSearch ? 'var(--accent)' : 'var(--text-3)',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.4 : 1,
                  fontSize: '12.5px', fontWeight: 500,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!busy && !webSearch) (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-3)'; }}
                onMouseLeave={e => { if (!webSearch) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span>{webSearch ? 'Search on' : 'Search'}</span>
              </button>

            </div>

            {/* Right: send / stop */}
            {isStreaming ? (
              <button
                onClick={onStop}
                title="Stop generating"
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'rgba(255,60,60,0.9)', border: 'none', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 10px rgba(255,50,50,0.35)', flexShrink: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2.5"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                title="Send message"
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: canSend ? 'var(--send-bg)' : 'var(--glass-3)',
                  border: 'none',
                  color: canSend ? 'var(--send-fg)' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canSend ? 'pointer' : 'default',
                  boxShadow: canSend ? '0 2px 12px rgba(0,122,255,0.4)' : 'none',
                  flexShrink: 0,
                  transition: 'background 0.15s, box-shadow 0.15s, color 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', marginTop: '7px', pointerEvents: 'none' }}>
          {dailyLimitReached
            ? <span style={{ color: '#ff6b6b', fontWeight: 500 }}>Daily limit reached. Resets tomorrow.</span>
            : 'EimemesChat may make mistakes. Verify important information.'
          }
        </div>

        <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
