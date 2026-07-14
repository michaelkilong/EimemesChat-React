// StreamingBubble.tsx — v1.6 — Smooth throttled text updates (rAF-batched)
// v1.5 — Incremental text update for WebView performance
// v1.4 — Font size via CSS variable
import React, { useEffect, useRef, useState } from 'react';
import { renderMarkdown, highlightCodeBlocks } from '../lib/markdown';
import { useApp } from '../context/AppContext';
import Disclaimer from './Disclaimer';
import SourcesList from './SourcesList';
import type { Source } from '../types';

interface Props {
  text: string;
  done: boolean;
  model: string;
  disclaimer: 'critical' | 'web' | false;
  time: string;
  sources?: Source[];
  thinking: string;
  isThinking: boolean;
}

const StreamingBubble = React.memo(function StreamingBubble({
  text, done, model, disclaimer, time, sources, thinking, isThinking,
}: Props) {
  const { showToast } = useApp();
  const bodyRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const textNodeRef = useRef<Text | null>(null);
  const pendingText = useRef<string>('');
  const rafId = useRef<number>(0);

  const [thinkExpanded, setThinkExpanded] = useState(false);
  const thinkStartRef = useRef<number>(Date.now());
  const [thinkSeconds, setThinkSeconds] = useState(0);

  // ── Thinking timer ──────────────────────────────────────────
  useEffect(() => {
    if (isThinking) thinkStartRef.current = Date.now();
    if (!isThinking && thinking) {
      setThinkSeconds(Math.round((Date.now() - thinkStartRef.current) / 1000));
    }
  }, [isThinking, thinking]);

  // ── Smooth throttled text rendering ─────────────────────────
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    if (done) {
      // Final render: full markdown + highlight
      cancelAnimationFrame(rafId.current);
      el.innerHTML = renderMarkdown(text, '__streaming');
      highlightCodeBlocks(el, showToast);
      cursorRef.current = null;
      textNodeRef.current = null;
      return;
    }

    if (text) {
      // Store the latest text and request an animation frame
      pendingText.current = text;
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          if (!bodyRef.current) return;

          // Set up the text node + cursor on first frame
          if (!textNodeRef.current) {
            bodyRef.current.textContent = '';
            const tn = document.createTextNode(pendingText.current);
            const cursor = document.createElement('span');
            cursor.className = 'stream-cursor';
            bodyRef.current.appendChild(tn);
            bodyRef.current.appendChild(cursor);
            textNodeRef.current = tn;
            cursorRef.current = cursor;
          } else {
            // Just update the text node with the latest value
            textNodeRef.current.nodeValue = pendingText.current;
          }
          rafId.current = 0;
        });
      }
    } else {
      // No text yet → clean up
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
      el.textContent = '';
      cursorRef.current = null;
      textNodeRef.current = null;
    }
  }, [text, done, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafId.current);
      cursorRef.current = null;
      textNodeRef.current = null;
    };
  }, []);

  const showThinkingSkeleton = isThinking && !text;
  const showThinkingPill     = thinking && !isThinking;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '8px 0' }}>
      <div style={{ width: '100%' }}>
        {(showThinkingSkeleton || showThinkingPill) && (
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={() => showThinkingPill && setThinkExpanded(e => !e)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', padding: '2px 0',
                cursor: showThinkingPill ? 'pointer' : 'default',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '15px', color: 'var(--text-3)', fontWeight: 400 }}>
                {showThinkingSkeleton ? 'Thinking' : `Thought for ${thinkSeconds > 0 ? `${thinkSeconds}s` : 'a moment'}`}
              </span>
              {showThinkingSkeleton && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingTop: '2px' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: '4px', height: '4px', borderRadius: '50%',
                      background: 'var(--text-3)', display: 'inline-block',
                      animation: `think-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </span>
              )}
              {showThinkingPill && (
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: thinkExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>
            <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0', opacity: 0.5 }} />
            {(showThinkingSkeleton || thinkExpanded) && thinking && (
              <div style={{
                fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.7, fontStyle: 'italic',
                maxHeight: showThinkingSkeleton ? '100px' : '220px', overflowY: 'auto',
                transition: 'max-height 0.3s ease', paddingBottom: '4px',
              }}>
                {thinking}
              </div>
            )}
          </div>
        )}

        <div
          ref={bodyRef}
          className="msg-body"
          style={{ color: 'var(--text-1)', fontSize: 'var(--msg-font-size)', lineHeight: 1.75, padding: '2px 0' }}
        />

        {done && (
          <>
            <Disclaimer type={disclaimer} />
            {sources?.length ? <SourcesList sources={sources} msgKey="__streaming" /> : null}
          </>
        )}
      </div>
      <style>{`
        @keyframes think-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});

export default StreamingBubble;
