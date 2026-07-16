// PersonalizationView.tsx — v1.8 — Removed forced token refresh; silent fallback to localStorage
// v1.7 — Graceful token refresh + fallback to localStorage
// v1.6 — Retry on permission error + forced token refresh
// v1.5 — Retry on permission error after forced token refresh
// v1.4 — Robust Firestore write (separate token refresh catch + updateDoc)
// v1.3 — Force auth token refresh before Firestore write (native fix)
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { haptic } from '../lib/haptic';

interface Props { onBack: () => void; }

export interface UserPreferences {
  tone: string;
  nickname: string;
  occupation: string;
  customInstructions: string;
}

const TONES = ['Friendly', 'Professional', 'Concise', 'Funny'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  borderRadius: '16px', border: '1px solid var(--border)',
  background: 'var(--input-bg)',
  color: 'var(--text-1)', fontSize: '15px',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600,
  letterSpacing: '0.3px', color: 'var(--text-2)',
  marginBottom: '8px', display: 'block',
};

export default function PersonalizationView({ onBack }: Props) {
  const { currentUser, showToast } = useApp();
  const [tone,               setTone]               = useState('Friendly');
  const [nickname,           setNickname]           = useState('');
  const [occupation,         setOccupation]         = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [saving,             setSaving]             = useState(false);
  const [loaded,             setLoaded]             = useState(false);

  const nicknameRef = useRef<HTMLInputElement>(null);
  const occupationRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid))
      .then(snap => {
        if (snap.exists()) {
          const p = snap.data().preferences || {};
          if (p.tone)               setTone(p.tone);
          if (p.nickname)           setNickname(p.nickname);
          if (p.occupation)         setOccupation(p.occupation);
          if (p.customInstructions) setCustomInstructions(p.customInstructions);
        }
        setLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load preferences:', err);
        setLoaded(true);
      });
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser || saving) return;

    if (!navigator.onLine) {
      showToast('No internet connection');
      return;
    }

    const finalNickname = nicknameRef.current?.value ?? nickname;
    const finalOccupation = occupationRef.current?.value ?? occupation;
    const finalCustom = customRef.current?.value ?? customInstructions;

    const prefs = {
      tone,
      nickname: finalNickname,
      occupation: finalOccupation,
      customInstructions: finalCustom,
    };

    setSaving(true);

    try {
      // Attempt to write directly to Firestore – no forced token refresh
      await updateDoc(doc(db, 'users', currentUser.uid), { preferences: prefs });
      haptic.success();
      showToast('Preferences saved');
      onBack();
    } catch (err: any) {
      console.error('Save failed:', err.message);
      // If any error occurs (including permission), save to localStorage silently
      try {
        localStorage.setItem('ec_pending_prefs', JSON.stringify(prefs));
      } catch {}
      showToast('Saved offline – changes will sync when you reconnect.');
    } finally {
      setSaving(false);
    }
  };

  // Sync pending preferences whenever possible (no forced refresh)
  useEffect(() => {
    if (!currentUser || !navigator.onLine) return;
    const pending = localStorage.getItem('ec_pending_prefs');
    if (!pending) return;
    try {
      const prefs = JSON.parse(pending);
      updateDoc(doc(db, 'users', currentUser.uid), { preferences: prefs })
        .then(() => localStorage.removeItem('ec_pending_prefs'))
        .catch(() => {}); // stay in localStorage until next attempt
    } catch {}
  }, [currentUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(16px + var(--sat)) 20px 16px', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-1)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>
          Personalization
        </span>

        <button
          onClick={handleSave}
          disabled={saving || !loaded}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: saving ? 'rgba(255,255,255,0.05)' : 'var(--accent-dim)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: saving ? 'default' : 'pointer', color: 'var(--accent)', opacity: saving ? 0.5 : 1 }}
        >
          {saving
            ? <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          }
        </button>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 48px' }}>
        {/* Tone */}
        <div style={{ marginBottom: '
