import React from 'react';

export default function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div
      id="loadingScreen"
      style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(145deg, var(--bg-a) 0%, var(--bg-b) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 999,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: '26px', fontWeight: 700,
        background: 'linear-gradient(135deg, #5e9cff, #c96eff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'breathe 1.6s ease-in-out infinite',
      }}>
        ✦ EimemesChat AI
      </div>
    </div>
  );
}
