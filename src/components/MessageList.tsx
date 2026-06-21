// MessageList.tsx — v1.3 — Fixed auto-scroll: ignores programmatic scrolls during streaming
import React, { useEffect, useRef, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import StreamingBubble from './StreamingBubble';
import TypingIndicator from './TypingIndicator';
import { getTime } from '../lib/markdown';
import { haptic } from '../lib/haptic';
import type { Message } from '../types';

const CHIPS = [
  { label: 'Write a poem',             prompt: 'Write me a creative poem' },
  { label: 'Explain quantum computing', prompt: 'Explain quantum computing simply' },
  { label: 'Plan a trip',              prompt: 'Help me plan a trip' },
  { label: 'Debug my code',            prompt: 'Help me debug my code' },
];

const CHIP_ROWS = [
  [CHIPS[0]],
  [CHIPS[1], CHIPS[2]],
  [CHIPS[3]],
];

interface Props {
  messages: Message[];
  isTyping: boolean;
  isSearching: boolean;
  isStreaming: boolean;
  streamText: string;
  streamDone: boolean;
  streamModel: string;
  streamDisclaimer: 'critical' | 'web' | false;
  streamSources: { title: string; url: string }[];
  convId: string | null;
  chipsUsed: boolean;
  onChipClick: (prompt: string) => void;
  onRegen: (originalMsg: string) => void;
  streamThinking: string;
  isThinking: boolean;
}

const INPUT_AREA_HEIGHT = 170;

export default function MessageList({
  messages, isTyping, isSearching, isStreaming,
  streamText, streamDone, streamModel, streamDisclaimer, streamSources,
  convId, chipsUsed, onChipClick, onRegen, streamThinking, isThinking,
}: Props) {
  const bottomRef              = useRef<HTMLDivElement>(null);
  const scrollRef              = useRef<HTMLDivElement>(null);
  const userScrolledUp         = useRef(false);
  const programmaticScroll     = useRef(false); // <-- flag for programmatic scrolls
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Smooth scroll for discrete events (new message sent, typing indicator appears)
  useEffect(() => {
    userScrolledUp.current = false;
    programmaticScroll.current = true;        // mark as programmatic
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  // Auto-scroll during streaming — only if user hasn't scrolled up
  useEffect(() => {
    if (!isStreaming || !scrollRef.current) return;
    if (userScrolledUp.current) return;
    const el = scrollRef.current;
    programmaticScroll.current = true;        // set flag before forcing scroll
    el.scrollTop = el.scrollHeight;
  }, [streamText, isStreaming]);

  // Track whether user has manually scrolled up (ignore programmatic scrolls)
  const handleScroll = useCallback(() => {
    if (programmaticScroll.current) {
      programmaticScroll.current = false;     // ignore this event
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distFromBottom > 80;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  const scrollToBottom = () => {
    haptic.light();
    userScrolledUp.current = false;           // resume following
    programmaticScroll.current = true;        // mark as programmatic
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showWelcome = messages.length === 0 && !isTyping && !isStreaming;

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scroll-thin"
        style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, overscrollBehavior: 'none', background: 'transparent' }}
      >
        <div style={{ maxWidth: '740px', margin: '0 auto', padding: `24px 20px ${INPUT_AREA_HEIGHT}px`, display: 'flex', flexDirection: 'column' }}>

          {showWelcome && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: '48px 16px 32px', gap: '12px',
            }}>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700, fontSize: '42px', letterSpacing: '-1px', lineHeight: 1.1,
                background: 'linear-gradient(135deg, #5e9cff 0%, #c96eff 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                EimemesChat AI
              </div>
              <div style={{ fontSize: '17px', color: 'var(--text-3)', fontWeight: 400 }}>
                How can I help you today?
              </div>
              {!chipsUsed && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px', width: '100%', maxWidth: '480px' }}>
                  {CHIP_ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      {row.map(c => (
                        <button
                          key={c.label}
                          onClick={() => { haptic.light(); onChipClick(c.prompt); }}
                          style={{
                            padding: '12px 22px', borderRadius: '999px',
                            border: '1px solid var(--border)',
                            background: 'var(--glass-2)',
                            color: 'var(--text-1)', fontSize: '15px', fontWeight: 500,
                            cursor: 'pointer', transition: 'background 0.15s',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-2)'; }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1 && msg.role === 'assistant' && !isStreaming;
            let lastUserMsg = '';
            if (isLast) {
              for (let j = i - 1; j >= 0; j--) {
                if (messages[j].role === 'user') { lastUserMsg = messages[j].content; break; }
              }
            }
            const msgKey = `${msg.role}-${msg.time}-${msg.content.slice(0, 32)}`;
            return (
              <MessageBubble
                key={msgKey}
                message={msg}
                isLast={isLast}
                lastUserMsg={lastUserMsg}
                convId={convId || ''}
                onRegen={onRegen}
              />
            );
          })}

          {isTyping && !isSearching && <TypingIndicator />}

          {isSearching && (
            <div className="search-skeleton">
              <div className="search-skeleton-label">
                <div className="search-skeleton-label-dot" />
                Searching the web…
              </div>
              <div className="skeleton-line" style={{ height: '14px', width: '92%' }} />
              <div className="skeleton-line" style={{ height: '14px', width: '78%' }} />
              <div className="skeleton-line" style={{ height: '14px', width: '85%' }} />
              <div className="skeleton-line" style={{ height: '14px', width: '60%' }} />
            </div>
          )}

          {isStreaming && (
            <StreamingBubble
              text={streamText}
              done={streamDone}
              model={streamModel}
              disclaimer={streamDisclaimer}
              time={getTime()}
              sources={streamSources}
              thinking={streamThinking}
              isThinking={isThinking}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: `${INPUT_AREA_HEIGHT + 12}px`,
            left: '50%', transform: 'translateX(-50%)',
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'var(--glass-1)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            boxShadow: 'var(--sh-sm)',
            transition: 'opacity 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}
    </div>
  );
}
