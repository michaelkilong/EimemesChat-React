import React, { useEffect, useRef } from 'react';
import { renderMarkdown, highlightCodeBlocks } from '../lib/markdown';
import { useApp } from '../context/AppContext';

interface Props {
  text: string;
  done: boolean;
  model: string;
  disclaimer: boolean;
  time: string;
}

export default function StreamingBubble({ text, done, model, disclaimer, time }: Props) {
  const { showToast } = useApp();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (done) {
      bodyRef.current.innerHTML = renderMarkdown(text);
      highlightCodeBlocks(bodyRef.current, showToast);
    } else {
      bodyRef.current.innerHTML = renderMarkdown(text) + '<span class="stream-cursor"></span>';
    }
  }, [text, done, showToast]);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '8px 0' }}>
      <div style={{ width: '100%' }}>
        <div
          ref={bodyRef}
          className="msg-body"
          style={{ color: 'var(--text-1)', fontSize: '15.5px', lineHeight: 1.72, padding: '2px 0' }}
        />
        {done && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{time}</span>
            </div>
            {disclaimer && (
              <div style={{
                fontSize: '11.5px', color: 'var(--text-3)', marginTop: '8px',
                padding: '6px 10px', borderLeft: '2px solid var(--border)', lineHeight: 1.5,
              }}>
                ⚠️ For reference only. This is AI-generated content — always verify with a qualified professional or trusted source.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
