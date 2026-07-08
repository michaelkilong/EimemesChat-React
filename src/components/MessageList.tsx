// MessageList.tsx — v1.5 (dynamic, randomized chips every session)
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import MessageBubble from './MessageBubble';
import StreamingBubble from './StreamingBubble';
import TypingIndicator from './TypingIndicator';
import { getTime } from '../lib/markdown';
import { haptic } from '../lib/haptic';
import type { Message } from '../types';

// ── Fallback chips (shown when no conversation history exists) ──
const FALLBACK_CHIPS = [
  { label: 'Write a poem',             prompt: 'Write me a creative poem' },
  { label: 'Explain quantum computing', prompt: 'Explain quantum computing simply' },
  { label: 'Plan a trip',              prompt: 'Help me plan a trip' },
  { label: 'Debug my code',            prompt: 'Help me debug my code' },
  { label: 'Tell a joke',              prompt: 'Tell me a funny joke' },
  { label: 'Summarise an article',     prompt: 'Summarise this article for me' },
  { label: 'Cook something new',       prompt: 'Give me an easy dinner recipe' },
  { label: 'Learn a new skill',        prompt: 'Teach me the basics of photography' },
];

// ── Topic‑to‑chip mapper ──────────────────────────────────────
function generateChipsFromHistory(conversations: Array<{ messages?: Message[] }>) {
  const topics: string[] = [];
  const allMessages = conversations.flatMap(c => c.messages || []);
  const userMessages = allMessages.filter(m => m.role === 'user').map(m => m.content);

  if (userMessages.length === 0) return null; // no history → use fallback

  // Simple keyword detection (extensible)
  const keywordMap: Record<string, { label: string; prompt: string }> = {
    code:   { label: 'Review my code',       prompt: 'Help me review this code' },
    poem:   { label: 'Write a poem',         prompt: 'Write me a creative poem' },
    trip:   { label: 'Plan a trip',          prompt: 'Help me plan a trip' },
    recipe: { label: 'Cook something new',   prompt: 'Give me a dinner recipe' },
    debug:  { label: 'Debug my code',        prompt: 'Help me debug my code' },
    joke:   { label: 'Tell a joke',          prompt: 'Tell me a funny joke' },
    article:{ label: 'Summarise something',  prompt: 'Summarise this for me' },
    learn:  { label: 'Learn a new skill',    prompt: 'Teach me something new' },
    photo:  { label: 'Photography tips',     prompt: 'Give me photography tips' },
    music:  { label: 'Music recommendations', prompt: 'Recommend me some music' },
    movie:  { label: 'Movie suggestions',    prompt: 'Suggest a good movie to watch' },
    health: { label: 'Health tips',          prompt: 'Give me some health tips' },
    travel: { label: 'Travel ideas',         prompt: 'Suggest a travel destination' },
  };

  const seenLabels = new Set<string>();
  const chips: Array<{ label: string; prompt: string }> = [];

  for (const msg of userMessages) {
    for (const [key, chip] of Object.entries(keywordMap)) {
      if (msg.toLowerCase().includes(key) && !seenLabels.has(chip.label)) {
        chips.push(chip);
        seenLabels.add(chip.label);
        if (chips.length >= 4) break; // max 4 chips
      }
    }
    if (chips.length >= 4) break;
  }

  // Fill up to 4 with random fallback chips not already used
  const unusedFallback = FALLBACK_CHIPS.filter(c => !seenLabels.has(c.label));
  while (chips.length < 4 && unusedFallback.length > 0) {
    const idx = Math.floor(Math.random() * unusedFallback.length);
    chips.push(unusedFallback[idx]);
    unusedFallback.splice(idx, 1);
  }

  return chips.length > 0 ? chips : null;
}

// ── Shuffle helper ─────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  chipsUsed: boolean;                    // ignored – chips always show
  conversations: Array<{ id: string; messages?: Message[] }>;  // for contextual chips
  onChipClick: (prompt: string) => void;
  onRegen: (originalMsg: string) => void;
  streamThinking: string;
  isThinking: boolean;
}

const INPUT_AREA_HEIGHT = 170;
const PROGRAMMATIC_GRACE_MS = 200;

export default function MessageList({
  messages, isTyping, isSearching, isStreaming,
  streamText, streamDone, streamModel, streamDisclaimer, streamSources,
  convId, chipsUsed, conversations, onChipClick, onRegen, streamThinking, isThinking,
}: Props) {
  const bottomRef              = useRef<HTMLDivElement>(null);
  const scrollRef              = useRef<HTMLDivElement>(null);
  const userScrolledUp         = useRef(false);
  const lastProgrammaticScroll = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // ── Generate fresh chips every time the welcome screen appears ──
  const displayChips = useMemo(() => {
    const contextual = generateChipsFromHistory(conversations);
    const source = contextual || FALLBACK_CHIPS;
    return shuffle(source).slice(0, 4);   // always 4 random chips
  }, [conversations]);

  useEffect(() => {
    userScrolledUp.current = false;
    lastProgrammaticScroll.current = Date.now();
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  useEffect(() => {
    if (!isStreaming || !scrollRef.current) return;
    if (userScrolledUp.current) return;
    const el = scrollRef.current;
    lastProgrammaticScroll.current = Date.now();
    el.scrollTop = el.scrollHeight;
  }, [streamText, isStreaming]);

  const handleScroll = useCallback(() => {
    if (Date.now() - lastProgrammaticScroll.current < PROGRAMMATIC_GRACE_MS) return;
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distFromBottom > 80;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  const scrollToBottom = () => {
    haptic.light();
    userScrolledUp.current = false;
    lastProgrammaticScroll.current = Date.now();
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showWelcome = messages.length === 0 && !isTyping && !isStreaming;

  // ── Build chip rows (each row contains 1–2 chips) ────────────
  const chipRows: Array<Array<{ label: string; prompt: string }>> = [];
  for (let i = 0; i < displayChips.length; i += 2) {
    chipRows.push(displayChips.slice(i, i + 2));
  }

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
            <div style={{ /* … same welcome layout … */ }}>
              <div style={{ /* gradient title */ }}>EimemesChat AI</div>
              <div style={{ /* subtitle */ }}>How can I help you today?</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px', width: '100%', maxWidth: '480px' }}>
                {chipRows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    {row.map(c => (
                      <button
                        key={c.label}
                        onClick={() => { haptic.light(); onChipClick(c.prompt); }}
                        style={{ /* same chip button styles */ }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* … rest of MessageList (message bubbles, typing indicator, streaming bubble) unchanged … */}
        </div>
      </div>

      {showScrollBtn && (
        <button onClick={scrollToBottom} style={{ /* same scroll button */ }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}
    </div>
  );
}
