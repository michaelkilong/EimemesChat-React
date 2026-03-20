import React, { useState } from 'react';

interface Props {
  imageUrl: string;
  imagePrompt: string;
  time: string;
}

export default function ImageBubble({ imageUrl, imagePrompt, time }: Props) {
  const [loaded,      setLoaded]      = useState(false);
  const [errored,     setErrored]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res  = await fetch(imageUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `eimemeschat-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 0 12px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Skeleton — shows while image is loading from Pollinations */}
        {!loaded && !errored && (
          <div style={{
            width: '100%', aspectRatio: '1 / 1',
            borderRadius: '16px',
            background: 'var(--glass-2)',
            border: '1px solid var(--border)',
            overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.6s ease-in-out infinite',
            }} />
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--text-3)', zIndex: 1 }}>Generating image…</span>
            <div style={{ display: 'flex', gap: '5px', zIndex: 1 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--text-3)',
                  animation: 'tdot 1.3s infinite ease-in-out',
                  animationDelay: `${i * 0.18}s`,
                }} />
              ))}
            </div>
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
              width: '100%', borderRadius: '16px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onClick={() => window.open(imageUrl, '_blank')}
          />
        )}

        {/* Error */}
        {errored && (
          <div style={{
            padding: '20px', borderRadius: '16px',
            border: '1px solid var(--border)', background: 'var(--glass-2)',
            color: 'var(--text-3)', fontSize: '14px', textAlign: 'center',
          }}>
            <div style={{ marginBottom: '8px' }}>⚠️ Image failed to load</div>
            <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '13px' }}>
              Try opening directly ↗
            </a>
          </div>
        )}

        {/* Prompt + time + download */}
        {loaded && !errored && (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "{imagePrompt}"
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{time}</div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download image"
              style={{
                flexShrink: 0, width: '32px', height: '32px',
                borderRadius: '8px', border: '1px solid var(--border)',
                background: 'var(--glass-2)', color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: downloading ? 'default' : 'pointer',
                opacity: downloading ? 0.5 : 1, transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-2)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
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
