// MessageBubble.tsx — v1.3 — Added Mermaid diagram rendering after message content
import React, { useEffect, useRef, useState } from 'react';
import { renderMarkdown, highlightCodeBlocks, renderMermaidBlocks } from '../lib/markdown';
import { useApp } from '../context/AppContext';
import { getFileIcon } from '../lib/fileReader';
import { haptic } from '../lib/haptic';
import Disclaimer from './Disclaimer';
import SourcesList from './SourcesList';
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
        background: hovered ? 'var(--glass-3)' : 'transparent',
        color: active ? (activeColor || 'var(--accent)') : 'var(--text-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
      }}
    >
      {children}
    </button>
  );
}

// Strip markdown syntax so speech sounds natural
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'code block')   // code blocks
    .replace(/`[^`]+`/g, '')                      // inline code
    .replace(/#{1,6}\s+/g, '')                    // headings
    .replace(/\*\*(.*?)\*\*/g, '$1')              // bold
    .replace(/\*(.*?)\*/g, '$1')                  // italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')           // links
    .replace(/!\[.*?\]\(.*?\)/g, '')              // images
    .replace(/[-*+]\s+/g, '')                     // list bullets
    .replace(/\d+\.\s+/g, '')                     // numbered lists
    .replace(/>\s+/g, '')                         // blockquotes
    .replace(/\n{2,}/g, '. ')                     // paragraph breaks
    .replace(/\n/g, ' ')                          // line breaks
    .replace(/\s{2,}/g, ' ')                      // extra spaces
    .trim();
}

export default function MessageBubble({ message, isLast, lastUserMsg, convId, onRegen }: Props) {
  const { showToast } = useApp();
  const bodyRef    = useRef<HTMLDivElement>(null);
  const uttRef     = useRef<SpeechSynthesisUtterance | null>(null);
  const [thumbUp,   setThumbUp]   = useState(false);
  const [thumbDown, setThumbDown] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [speaking,  setSpeaking]  = useState(false);

  const msgKey = `${message.role}-${message.time}-${message.content.slice(0, 32)}`;

  useEffect(() => {
    if (!bodyRef.current) return;
    if (message.role === 'assistant') {
      bodyRef.current.innerHTML = renderMarkdown(message.content, msgKey);
      highlightCodeBlocks(bodyRef.current, showToast);
      // Render Mermaid diagrams (async, non-blocking)
      renderMermaidBlocks(bodyRef.current);
    }
  }, [message.content, message.role, showToast, msgKey]);

  // Cancel speech when component unmounts
  useEffect(() => {
    return () => {
      if (uttRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  const handleSpeak = () => {
    if (!window.speechSynthesis) { showToast('Voice not supported on this browser'); return; }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    haptic.light();
    const clean = stripMarkdown(message.content);
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.rate    = 1.05;
    utt.pitch   = 1;
    utt.volume  = 1;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;

    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);

    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
    setSpeaking(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
      .then(() => { haptic.success(); setCopied(true); showToast('Copied!'); setTimeout(() => setCopied(false), 2000); })
      .catch(() => showToast('Could not copy'));
  };

  const handleShare = () => {
    haptic.light();
    if (navigator.share) navigator.share({ text: message.content }).catch(() => {});
    else handleCopy();
  };

  const isUser  = message.role === 'user';
  const isError = !isUser && message.model === '' && message.content.includes('error')
    || (!isUser && message.model === '' && (message.content.includes('try again') || message.content.includes('Permission denied')));

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
          <div style={{
            background: '#2f2f2f', borderRadius: '22px', padding: '12px 20px',
            color: 'rgba(255,255,255,0.92)', fontSize: '16px',
            lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
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

        {isError ? (
          <div style={{
            display: 'inline-flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 16px', borderRadius: '16px',
            background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.2)',
            maxWidth: '100%',
          }}>
            <div style={{ flexShrink: 0, marginTop: '1px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#ff6b6b', fontWeight: 500, marginBottom: lastUserMsg ? '8px' : '0' }}>
                {message.content}
              </div>
              {lastUserMsg && (
                <button
                  onClick={() => { haptic.medium(); onRegen(lastUserMsg); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '999px',
                    background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.25)',
                    color: '#ff6b6b', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.12)')}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.54"/>
                  </svg>
                  Retry
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            ref={bodyRef}
            className="msg-body"
            style={{ color: 'var(--text-1)', fontSize: '16px', lineHeight: 1.75, padding: '2px 0' }}
          />
        )}

        <Disclaimer type={message.disclaimer || false} />

        {message.sources?.length ? <SourcesList sources={message.sources} msgKey={msgKey} /> : null}

        {/* Action bar — all actions except regenerate always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0px', marginTop: '6px' }}>

          {/* Copy */}
          <ActionBtn
            title={copied ? 'Copied!' : 'Copy'}
            onClick={handleCopy}
            active={copied}
            activeColor="#30d158"
          >
            {copied
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            }
          </ActionBtn>

          {/* Voice */}
          <ActionBtn title={speaking ? 'Stop' : 'Read aloud'} onClick={handleSpeak} active={speaking} activeColor="var(--accent)">
            {speaking ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="4" y2="18" style={{ animation: 'bar1 0.8s ease-in-out infinite alternate' }}/>
                <line x1="9" y1="3" x2="9" y2="21" style={{ animation: 'bar2 0.8s ease-in-out infinite alternate' }}/>
                <line x1="14" y1="8" x2="14" y2="16" style={{ animation: 'bar3 0.8s ease-in-out infinite alternate' }}/>
                <line x1="19" y1="5" x2="19" y2="19" style={{ animation: 'bar4 0.8s ease-in-out infinite alternate' }}/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            )}
          </ActionBtn>

          {/* Thumb up */}
          <ActionBtn title="Good response" onClick={() => { const was = thumbUp; haptic.success(); setThumbUp(!was); setThumbDown(false); if (!was) showToast('Thanks! 👍'); }} active={thumbUp} activeColor="#30d158">
            <svg width="15" height="15" viewBox="0 0 24 24" fill={thumbUp ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </ActionBtn>

          {/* Thumb down */}
          <ActionBtn title="Bad response" onClick={() => { const was = thumbDown; haptic.medium(); setThumbDown(!was); setThumbUp(false); if (!was) showToast('Thanks for the feedback!'); }} active={thumbDown} activeColor="#ff6b6b">
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

          {/* Regenerate (retry) — only on the latest assistant response */}
          {isLast && (
            <ActionBtn title="Regenerate" onClick={() => { haptic.medium(); onRegen(lastUserMsg); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.54"/>
              </svg>
            </ActionBtn>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bar1 { from { transform: scaleY(0.4); } to { transform: scaleY(1.0); } }
        @keyframes bar2 { from { transform: scaleY(1.0); } to { transform: scaleY(0.3); } }
        @keyframes bar3 { from { transform: scaleY(0.6); } to { transform: scaleY(1.0); } }
        @keyframes bar4 { from { transform: scaleY(0.3); } to { transform: scaleY(0.8); } }
      `}</style>
    </div>
  );
}
