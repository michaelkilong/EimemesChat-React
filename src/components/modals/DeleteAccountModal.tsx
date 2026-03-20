import React, { useState } from 'react';
import { deleteUser } from 'firebase/auth';
import { writeBatch, getDocs, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useApp } from '../../context/AppContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  getUserConvsRef: () => ReturnType<typeof import('firebase/firestore').collection> | null;
}

export default function DeleteAccountModal({ visible, onClose, getUserConvsRef }: Props) {
  const { currentUser, showToast } = useApp();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const convsRef = getUserConvsRef();
      if (convsRef) {
        const snap  = await getDocs(convsRef);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(doc(db, 'users', currentUser.uid));
        await batch.commit();
      }
      await deleteUser(currentUser);
      onClose();
      showToast('Account deleted. Goodbye 👋');
    } catch (err: any) {
      setLoading(false);
      onClose();
      if (err.code === 'auth/requires-recent-login') {
        showToast('Please sign out and sign back in first, then try again.');
      } else {
        showToast('Deletion failed. Please try again.');
      }
    }
  };

  return (
    <div className={`modal-overlay ${visible ? 'show' : ''}`} style={{ border: '1px solid rgba(255,75,75,0.22)' }}>
      <div className="modal-card" style={{ border: '1px solid rgba(255,75,75,0.22)' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px',
          background: 'rgba(255,75,75,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', border: '1px solid rgba(255,75,75,0.2)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
          Delete account?
        </h3>
        <p style={{ fontSize: '13.5px', color: 'var(--text-3)', lineHeight: 1.55, marginBottom: '20px' }}>
          This action is permanent and cannot be undone. All your conversations and data will be erased forever.
        </p>
        <div style={{
          fontSize: '12.5px', color: '#ff6b6b',
          background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.15)',
          borderRadius: '12px', padding: '10px 14px', marginBottom: '20px',
          textAlign: 'left', lineHeight: 1.5,
        }}>
          ⚠️ You will be immediately signed out and your account will be deleted. This cannot be reversed.
        </div>
        <button
          onClick={handleDelete}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '40px', border: 'none',
            background: 'linear-gradient(145deg,#ff4f4f,#cc2c2c)', color: 'white',
            fontSize: '15px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.4 : 1, marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(255,50,50,0.28)',
            fontFamily: 'inherit', transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Deleting…' : 'Yes, delete my account'}
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', borderRadius: '40px',
            border: '1px solid var(--border)', background: 'var(--glass-3)',
            color: 'var(--text-2)', fontSize: '15px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
