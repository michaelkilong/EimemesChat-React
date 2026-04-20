import React, { useRef, useEffect, useState, useCallback } from 'react';
import { processFile, getFileIcon, formatFileSize } from '../lib/fileReader';
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
  const [value,        setValue]        = useState('');
  const [attachment,   setAttachment]   = useState<Attachment | null>(null);
  const [processing,   setProcessing]   = useState(false);
  const [fileError,    setFileError]    = useState('');
  const [webSearch,    setWebSearch]    = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  useEffect(() => { autoResize(); }, [value]);

  const canSend = (value.trim().length > 0 || attachment !== null) && !isSending && !isStreaming && !dailyLimitReached && !processing;

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
    e.target.value = ''; // reset so same file can be re-selected

    setFileError('');

    if (file.size > MAX_SIZE) {
      setFileError(`File too large (max 20MB)`);
      return;
    }

    setProcessing(true);
    try {
      const att = await processFile(file);
      setAttachment(att);
    } catch (err) {
      setFileError('Could not read file. Try another format.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, []);

  return (
    <div style={{ flexShrink: 0, padding: '10px 18px', paddingBottom: 'calc(12px + var(--sab))', background: 'transparent' }}>
      <div style={{ maxWidth: '740px', margin: '0 auto', position: 'relative' }}>

        {/* File attachment preview */}
        {(attachment || processing) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', marginBottom: '8px',
            background: 'var(--glass-2)', borderRadius: '16px',
            border: '1px solid var(--border)',
          }}>
            {processing
              ? <>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--glass-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Reading file…</span>
                </>
              : attachment && <>
                  {attachment.type === 'image'
                    ? <img src={attachment.content} alt={attachment.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {getFileIcon(attachment.type)}
                      </div>
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
            }
          </div>
        )}

        {/* Error */}
        {fileError && (
          <div style={{ fontSize: '12px', color: '#ff6b6b', marginBottom: '6px', paddingLeft: '4px' }}>{fileError}</div>
        )}

        {/* Input bar */}
        <div style={{
          background: 'var(--input-bg)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border)',
          borderRadius: '40px',
          boxShadow: 'var(--sh-input)',
          display: 'flex', alignItems: 'flex-end',
          position: 'relative',
        }}>
          {/* Paperclip button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isStreaming || processing}
            title="Attach file"
            style={{
              width: '38px', height: '52px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: attachment ? 'var(--accent)' : 'var(--text-3)',
              background: 'transparent', border: 'none',
              cursor: 'pointer', flexShrink: 0,
              paddingLeft: '12px',
              transition: 'color 0.15s',
              opacity: (isSending || isStreaming || processing) ? 0.4 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Web search toggle */}
          <button
            onClick={() => { haptic.light(); setWebSearch(w => !w); }}
            disabled={isSending || isStreaming}
            title={webSearch ? 'Web search on' : 'Web search off'}
            style={{
              width: '34px', height: '52px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: webSearch ? 'var(--accent)' : 'var(--text-3)',
              background: 'transparent', border: 'none',
              cursor: 'pointer', flexShrink: 0,
              transition: 'color 0.15s',
              opacity: (isSending || isStreaming) ? 0.4 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </button>

          {/* Gemini model indicator — non-interactive, shows current AI model */}
          <div
            title="Powered by Gemini 2.0 Flash"
            style={{
              height: '52px', paddingInline: '5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, gap: '4px',
              opacity: (isSending || isStreaming) ? 0.4 : 0.75,
              transition: 'opacity 0.15s',
            }}
          >
            {/* Gemini-style 4-pointed sparkle */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8888DD" />
                  <stop offset="100%" stopColor="#5500BB" />
                </linearGradient>
              </defs>
              {/* 4-pointed star shape */}
              <path
                d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
                fill="url(#gemGrad)"
              />
            </svg>
            <span style={{
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.2px',
              background: 'linear-gradient(135deg, #8888DD, #5500BB)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Flash
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachment ? 'Ask something about this file…' : 'Message Eimemes…'}
            rows={1}
            disabled={dailyLimitReached}
            style={{
              flex: 1, background: 'transparent',
              border: 'none', borderRadius: '0',
              padding: '14px 8px 14px 4px',
              fontSize: '15.5px', color: 'var(--text-1)',
              outline: 'none', resize: 'none',
              minHeight: '52px', maxHeight: '200px',
              lineHeight: 1.5, overflowY: 'auto',
              fontFamily: 'inherit',
            }}
          />

          {/* Stop button */}
          {isStreaming && (
            <button
              onClick={onStop}
              style={{
                width: '38px', height: '38px', margin: '7px 8px 7px 0',
                borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,60,60,0.9)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(255,50,50,0.3)',
                cursor: 'pointer', border: 'none',
              }}
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
                width: '38px', height: '38px', margin: '7px 8px 7px 0',
                borderRadius: '50%', flexShrink: 0,
                background: 'var(--send-bg)', color: 'var(--send-fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: canSend ? '0 4px 14px rgba(0,122,255,0.4)' : 'none',
                cursor: canSend ? 'pointer' : 'default',
                opacity: canSend ? 1 : 0.28,
                border: 'none',
                transition: 'opacity 0.15s, box-shadow 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', marginTop: '8px', pointerEvents: 'none' }}>
          {dailyLimitReached
            ? <span style={{ color: '#ff6b6b', fontWeight: 500 }}>Daily limit reached. Resets tomorrow.</span>
            : 'EimemesChat may make mistakes. Verify important information.'
          }
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
            
