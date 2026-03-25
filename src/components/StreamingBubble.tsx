import React, { useEffect, useRef } from 'react';
import { renderMarkdown, highlightCodeBlocks, escHtml } from '../lib/markdown';
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
}

export default function StreamingBubble({ text, done, model, disclaimer, time, sources }: Props) {
  const { showToast } = useApp();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (done) {
      // Full markdown parse only once when streaming finishes
      bodyRef.current.innerHTML = renderMarkdown(text, '__streaming');
      highlightCodeBlocks(bodyRef.current, showToast);
    } else {
      // During streaming: lightweight render — escape HTML, preserve line breaks.
      // Avoids calling the full marked parser + KaTeX + regex 55x/sec.
      bodyRef.current.innerHTML = escHtml(text).replace(/\n/g, '<br>') + '<span class="stream-cursor"></span>';
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
            <Disclaimer type={disclaimer} />
            {sources?.length ? <SourcesList sources={sources} msgKey="__streaming" /> : null}
          </>
        )}
      </div>
    </div>
  );
}
