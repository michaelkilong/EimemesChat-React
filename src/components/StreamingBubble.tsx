import React, { useEffect, useRef } from 'react';
import { renderMarkdown, highlightCodeBlocks } from '../lib/markdown';
import { useApp } from '../context/AppContext';
import SourcesList from './SourcesList';
import type { Source } from '../types';

interface Props {
  text: string;
  done: boolean;
  model: string;
  disclaimer: boolean;
  time: string;
  sources?: Source[];
}

export default function StreamingBubble({ text, done, model, disclaimer, time, sources }: Props) {
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
          style={{ color: 'var(--text-1)', fontSize: '16px', lineHeight: 1.75, padding: '2px 0' }}
        />
        {done && (
          <>
            {disclaimer && (
              <div style={{
                fontSize: '11.5px', color: 'var(--text-3)', marginTop: '8px',
                padding: '6px 10px', borderLeft: '2px solid var(--border)', lineHeight: 1.5,
              }}>
                ⚠️ For reference only. AI can make mistakes — always verify with a qualified professional or trusted source.
              </div>
            )}
            {sources?.length ? <SourcesList sources={sources} /> : null}
          </>
        )}
      </div>
    </div>
  );
}
