import React, { useEffect, useRef, useState } from 'react';
import { renderMarkdown, highlightCodeBlocks } from '../lib/markdown';
import { useApp } from '../context/AppContext';
import { getFileIcon } from '../lib/fileReader';
import type { Message } from '../types';

interface Props {
  message: Message;
  isLast: boolean;
  lastUserMsg: string;
  convId: string;
  onRegen: (originalMsg: string) => void;
}

function ActionBtn({ title, onClick, active, activeColor, children }: {
  title: string; onClick: () => void;
  active?: boolean; activeColor?: string; children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title} onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '32px', height: '32px', borderRadius: '6px', border: 'none',
        background: hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
        color: active ? (activeColor || 'var(--accent)') : 'rgba(255,255,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
      }}
    >
      {children}
    </button>
  );
}

export default function MessageBubble({ message, isLast, lastUserMsg, convId, onRegen }: Props) {
  const { showToast } = useApp();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [thumbUp,   setThumbUp]   = useState(false);
  const [thumbDown, setThumbDown] = useState(false);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (message.role === 'assistant') {
      bodyRef.current.innerHTML = renderMarkdown(message.content);
      highlightCodeBlocks(bodyRef.current, showToast);
    }
  }, [message.content, message.role, showToast]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
      .then(() => { setCopied(true); showToast('Copied!'); setTimeout(() => setCopied(false), 2000); })
      .catch(() => showToast('Could not copy'));
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ text: message.content }).catch(() => {});
    else handleCopy();
  };

  const isUser = message.role === 'user';

  /* ── User bubble ── */
  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0 10px' }}>
        <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
          {message.attachment && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '6px 14px', borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              fontSize: '12px', color: 'rgba(255,255,255,0.55)',
            }}>
              <span style={{ fontSize: '14px' }}>{getFileIcon(message.attachment.type)}</span>
              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.attachment.name}
              </span>
            </div>
          )}
          {/* Soft fully-rounded bubble — ChatGPT style */}
          <div style={{
            background: '#2f2f2f',
            borderRadius: '999px',
            padding: '12px 20px',
            color: 'rgba(255,255,255,0.92)',
            fontSize: '16px',
            lineHeight: 1.6,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}>
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  /* ── AI message ── */
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 0 4px' }}>
      <div style={{ width: '100%' }}>
        {/* Plain text — no bubble */}
        <div
          ref={bodyRef}
          className="msg-body"
          style={{ color: 'var(--text-1)', fontSize: '16px', lineHeight: 1.75, padding: '2px 0' }}
        />

        {message.disclaimer && (
          <div style={{
            fontSize: '11.5px', color: 'var(--text-3)', marginTop: '8px',
            padding: '6px 10px', borderLeft: '2px solid var(--border)', lineHeight: 1.5,
          }}>
            ⚠️ For reference only — always verify with a qualified professional.
          </div>
        )}

        {/* Action icons — ChatGPT style, always visible on last, hover on others */}
        {isLast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0px', marginTop: '6px' }}>

            {/* Copy */}
            <ActionBtn title={copied ? 'Copied!' : 'Copy'} onClick={handleCopy} active={copied} activeColor="#30d158">
              {copied
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              }
            </ActionBtn>

            {/* Regenerate */}
            <ActionBtn title="Regenerate" onClick={() => onRegen(lastUserMsg)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.54"/>
              </svg>
            </ActionBtn>

            {/* Thumb up */}
            <ActionBtn title="Good response" onClick={() => { const was = thumbUp; setThumbUp(!was); setThumbDown(false); if (!was) showToast('Thanks! 👍'); }} active={thumbUp} activeColor="#30d158">
              <svg width="15" height="15" viewBox="0 0 24 24" fill={thumbUp ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
            </ActionBtn>

            {/* Thumb down */}
            <ActionBtn title="Bad response" onClick={() => { const was = thumbDown; setThumbDown(!was); setThumbUp(false); if (!was) showToast('Thanks for the feedback!'); }} active={thumbDown} activeColor="#ff6b6b">
              <svg width="15" height="15" viewBox="0 0 24 24" fill={thumbDown ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
            </ActionBtn>

            {/* Share */}
            <ActionBtn title="Share" onClick={handleShare}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </ActionBtn>

          </div>
        )}
      </div>
    </div>
  );
}
