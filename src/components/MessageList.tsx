import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import StreamingBubble from './StreamingBubble';
import TypingIndicator from './TypingIndicator';
import { getTime } from '../lib/markdown';
import type { Message } from '../types';

const CHIPS = [
  { label: 'Design an iOS app',        prompt: 'Help me design an iOS app' },
  { label: 'Explain quantum computing', prompt: 'Explain quantum computing simply' },
  { label: 'Write a poem',             prompt: 'Write me a creative poem' },
  { label: 'Plan a trip',              prompt: 'Help me plan a trip' },
  { label: 'Code a website',           prompt: 'Help me code a website' },
  { label: 'Debug my code',            prompt: 'Help me debug my code' },
];

// Staggered chip layout — rows of [1, 2, 2, 1] like proposed design
const CHIP_ROWS = [
  [CHIPS[0]],
  [CHIPS[1], CHIPS[2]],
  [CHIPS[3], CHIPS[4]],
  [CHIPS[5]],
];

interface Props {
  messages: Message[];
  isTyping: boolean;
  isStreaming: boolean;
  streamText: string;
  streamDone: boolean;
  streamModel: string;
  streamDisclaimer: boolean;
  convId: string | null;
  chipsUsed: boolean;
  onChipClick: (prompt: string) => void;
  onRegen: (originalMsg: string) => void;
}

export default function MessageList({
  messages, isTyping, isStreaming,
  streamText, streamDone, streamModel, streamDisclaimer,
  convId, chipsUsed, onChipClick, onRegen,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping, streamText]);

  const showWelcome = messages.length === 0 && !isTyping && !isStreaming;

  return (
    <div
      className="scroll-thin"
      style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, overscrollBehavior: 'none', background: 'transparent' }}
    >
      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '24px 20px 20px', display: 'flex', flexDirection: 'column' }}>

        {showWelcome && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '48px 16px 32px', gap: '12px',
          }}>
            {/* Large gradient title */}
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700, fontSize: '42px', letterSpacing: '-1px',
              lineHeight: 1.1,
              background: 'linear-gradient(135deg, #5e9cff 0%, #c96eff 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              EimemesChat AI
            </div>
            <div style={{ fontSize: '17px', color: 'var(--text-3)', fontWeight: 400, letterSpacing: '0.1px' }}>
              How can I help you today?
            </div>

            {/* Staggered chips */}
            {!chipsUsed && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px', width: '100%', maxWidth: '480px' }}>
                {CHIP_ROWS.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    {row.map(c => (
                      <button
                        key={c.label}
                        onClick={() => onChipClick(c.prompt)}
                        style={{
                          padding: '12px 22px',
                          borderRadius: '999px',
                          border: 'none',
                          background: 'rgba(255,255,255,0.07)',
                          color: 'var(--text-1)',
                          fontSize: '15px', fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'background 0.15s, transform 0.1s',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                        }}
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
          return (
            <MessageBubble
              key={i}
              message={msg}
              isLast={isLast}
              lastUserMsg={lastUserMsg}
              convId={convId || ''}
              onRegen={onRegen}
            />
          );
        })}

        {isTyping && <TypingIndicator />}

        {isStreaming && (
          <StreamingBubble
            text={streamText}
            done={streamDone}
            model={streamModel}
            disclaimer={streamDisclaimer}
            time={getTime()}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
