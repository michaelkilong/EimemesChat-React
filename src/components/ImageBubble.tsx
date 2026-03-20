import React, { useState } from 'react';

interface Props {
  imageUrl: string;
  imagePrompt: string;
  time: string;
}

export default function ImageBubble({ imageUrl, imagePrompt, time }: Props) {
  const [loaded,  setLoaded]  = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 0 12px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Loading skeleton */}
        {!loaded && !errored && (
          <div style={{
            width: '100%', aspectRatio: '1 / 1',
            borderRadius: '16px',
            background: 'linear-gradient(90deg, var(--glass-2) 25%, var(--glass-3) 50%, var(--glass-2) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '10px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Generating image…</span>
          </div>
        )}

        {/* Generated image */}
        {!errored && (
          <img
            src={imageUrl}
            alt={imagePrompt}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(true); setErrored(true); }}
            style={{
              display: loaded ? 'block' : 'none',
              width: '100%', maxWidth: '480px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--sh-sm)',
              cursor: 'pointer',
            }}
            onClick={() => window.open(imageUrl, '_blank')}
          />
        )}

        {/* Error state */}
        {errored && (
          <div style={{
            padding: '16px', borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--glass-2)',
            color: 'var(--text-3)', fontSize: '14px',
          }}>
            ⚠️ Couldn't load image. <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Open directly</a>
          </div>
        )}

        {/* Prompt label + time */}
        {loaded && !errored && (
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic', marginBottom: '2px' }}>
              "{imagePrompt}"
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{time}</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}
