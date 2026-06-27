import React from 'react';

export default function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at center, #1a1a1d 0%, #000000 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        zIndex: 999,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Star + Brand name together */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '24px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #5e9cff 0%, #c96eff 50%, #5e9cff 100%)',
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'shimmer 3s ease-in-out infinite',
          filter: 'drop-shadow(0 0 20px rgba(94,156,255,0.4))',
        }}
      >
        <span style={{ fontSize: '28px', display: 'inline-block', animation: 'pulseStar 2s ease-in-out infinite' }}>✦</span>
        <span>EimemesChat AI</span>
      </div>

      {/* Breathing dots */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              opacity: 0.4,
              animation: `breatheDot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulseStar {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes breatheDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
