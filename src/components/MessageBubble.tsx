import React, { useEffect, useRef, useState } from 'react';
import { arrayUnion, updateDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { renderMarkdown, highlightCodeBlocks, getTime } from '../lib/markdown';
import { useApp } from '../context/AppContext';
import type { Message } from '../types';

interface Props {
  message: Message;
  isLast: boolean;
  lastUserMsg: string;
  convId: string;
  onRegen: (originalMsg: string) => void;
}

export default function MessageBubble({ message, isLast, lastUserMsg, convId, onRegen }: Props) {
  const { currentUser, showToast } = useApp();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [thumbUp,   setThumbUp]   = useState(false);
  const [thumbDown, setThumbDown] = useState(false);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (message.role === 'assistant') {
      bodyRef.current.innerHTML = renderMarkdown(message.content);
      highlightCodeBlocks(bodyRef.current, showToast);
    }
  }, [message.content, message.role, showToast]);

  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0 12px' }}>
        <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{
            background: '#2f2f2f',
            borderRadius: '18px',
            padding: '12px 18px',
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

  // AI message
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 0 12px' }}>
      <div style={{ width: '100%' }}>
        <div
          ref={bodyRef}
          className="msg-body"
          style={{ color: 'var(--text-1)', fontSize: '16px', lineHeight: 1.75, padding: '2px 0' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '6px' }}>

        {message.disclaimer && (
          <div style={{
            fontSize: '11.5px', color: 'var(--text-3)', marginTop: '8px',
            padding: '6px 10px', borderLeft: '2px solid var(--border)', lineHeight: 1.5,
          }}>
            ⚠️ For reference only. This is AI-generated content — always verify with a qualified professional or trusted source.
          </div>
        )}

        {isLast && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '8px' }}>
            {/* Regenerate */}
            <button
              className="msg-action-btn regen-btn"
              title="Regenerate"
              onClick={() => onRegen(lastUserMsg)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.54"/>
              </svg>
            </button>
            {/* Thumb up */}
            <button
              className={`msg-action-btn thumb-up ${thumbUp ? 'active' : ''}`}
              title="Good response"
              onClick={() => {
                const was = thumbUp;
                setThumbUp(!was); setThumbDown(false);
                if (!was) showToast('Thanks for the feedback! 👍');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
            </button>
            {/* Thumb down */}
            <button
              className={`msg-action-btn thumb-down ${thumbDown ? 'active' : ''}`}
              title="Bad response"
              onClick={() => {
                const was = thumbDown;
                setThumbDown(!was); setThumbUp(false);
                if (!was) showToast('Thanks for the feedback! We will improve.');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
