import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import StreamingBubble from './StreamingBubble';
import TypingIndicator from './TypingIndicator';
import { getTime } from '../lib/markdown';
import type { Message } from '../types';

const CHIPS = [
  { label: 'Write a professional email',  prompt: 'Help me write a professional email' },
  { label: 'Explain quantum computing',   prompt: 'Explain quantum computing simply' },
  { label: 'Debug my code',               prompt: 'Help me debug my code' },
  { label: 'Plan a trip to Tokyo',        prompt: 'Plan a 5-day trip to Tokyo' },
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
      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '24px 22px 20px', display: 'flex', flexDirection: 'column' }}>

        {showWelcome && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 20px 40px', gap: '10px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '38px', letterSpacing: '-0.6px', background: 'linear-gradient(135deg, #5e9cff, #c96eff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              EimemesChat AI
            </div>
            <div style={{ fontSize: '17px', color: 'var(--text-3)', fontWeight: 400 }}>
              How can I help you today?
            </div>
            {!chipsUsed && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '22px', maxWidth: '560px' }}>
                {CHIPS.map(c => (
                  <button
                    key={c.label}
                    onClick={() => onChipClick(c.prompt)}
                    style={{ padding: '10px 18px', borderRadius: '30px', border: '1px solid var(--border)', background: 'var(--glass-2)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--accent)'; b.style.background = 'var(--accent-dim)'; b.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border)'; b.style.background = 'var(--glass-2)'; b.style.color = 'var(--text-2)'; }}
                  >
                    {c.label}
                  </button>
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
