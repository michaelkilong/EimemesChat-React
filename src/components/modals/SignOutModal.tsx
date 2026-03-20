import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useApp } from '../../context/AppContext';

interface Props { visible: boolean; onClose: () => void; }

export default function SignOutModal({ visible, onClose }: Props) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    setLoading(true);
    showToast('Signing you out…');
    setTimeout(() => {
      signOut(auth)
        .catch(console.error)
        .finally(() => { setLoading(false); onClose(); });
    }, 1800);
  };

  const btnStyle = (red: boolean): React.CSSProperties => ({
    width: '100%', padding: '14px', borderRadius: '40px', border: 'none',
    background: red ? 'linear-gradient(145deg,#ff4f4f,#cc2c2c)' : 'var(--glass-3)',
    color: red ? 'white' : 'var(--text-2)',
    border: red ? 'none' : '1px solid var(--border)',
    fontSize: '15px', fontWeight: red ? 600 : 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading && red ? 0.45 : 1,
    marginBottom: '10px', fontFamily: 'inherit',
    boxShadow: red ? '0 4px 14px rgba(255,50,50,0.25)' : 'none',
    transition: 'opacity 0.15s',
  } as React.CSSProperties);

  return (
    <div className={`modal-overlay ${visible ? 'show' : ''}`}>
      <div className="modal-card">
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px',
          background: 'rgba(255,75,75,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          border: '1px solid rgba(255,75,75,0.15)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
          Sign out?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: 1.5, marginBottom: '24px' }}>
          You'll need to sign back in to access your conversations.
        </p>
        <button style={btnStyle(true)} disabled={loading} onClick={handleSignOut}>
          {loading ? 'Signing out…' : 'Yes, sign out'}
        </button>
        <button style={btnStyle(false)} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
