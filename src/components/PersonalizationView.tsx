// PersonalizationView.tsx — v1.3 — Force auth token refresh before Firestore write (native fix)
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

    // 1. Quick network check
    if (!navigator.onLine) {
      showToast('No internet connection');
      return;
    }

    const finalNickname = nicknameRef.current?.value ?? nickname;
    const finalOccupation = occupationRef.current?.value ?? occupation;
    const finalCustom = customRef.current?.value ?? customInstructions;

    setSaving(true);

    try {
      // 2. Force token refresh – this ensures the native WebView has a valid token
      await currentUser.getIdToken(true);

      // 3. Now save to Firestore
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          preferences: {
            tone,
            nickname: finalNickname,
            occupation: finalOccupation,
            customInstructions: finalCustom,
          },
        },
        { merge: true }
      );

      haptic.success();
      showToast('Preferences saved');
      onBack();
    } catch (err: any) {
      console.error('Firestore save failed:', err?.message || err);
      const msg = err?.message || err?.toString() || 'Unknown error';
      showToast(`Save failed: ${msg.slice(0, 40)}`);

      // Fallback to localStorage if Firestore still fails
      try {
        localStorage.setItem('ec_pending_prefs', JSON.stringify({
          tone,
          nickname: finalNickname,
          occupation: finalOccupation,
          customInstructions: finalCustom,
        }));
      } catch (localErr) {
        console.error('localStorage fallback failed:', localErr);
      }
    } finally {
      setSaving(false);
    }
  };

  // Sync pending preferences if they exist
  useEffect(() => {
    if (!currentUser || !navigator.onLine) return;
    const pending = localStorage.getItem('ec_pending_prefs');
    if (!pending) return;
    try {
      const prefs = JSON.parse(pending);
      currentUser.getIdToken(true).then(() =>
        setDoc(doc(db, 'users', currentUser.uid), { preferences: prefs }, { merge: true })
      ).then(() => {
        localStorage.removeItem('ec_pending_prefs');
      }).catch(() => {});
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
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Base tone</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {TONES.map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                style={{
                  padding: '10px 20px', borderRadius: '999px',
                  border: `1.5px solid ${tone === t ? 'var(--accent)' : 'var(--border)'}`,
                  background: tone === t ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                  color: tone === t ? 'var(--accent)' : 'var(--text-2)',
                  fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            The main voice and tone the AI uses in your conversations.
          </div>
        </div>

        {/* Nickname */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Your nickname</label>
          <input
            ref={nicknameRef}
            style={inputStyle}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="What should the AI call you?"
            value={nickname}
            onInput={(e) => setNickname((e.target as HTMLInputElement).value)}
            onBlur={(e) => setNickname((e.target as HTMLInputElement).value)}
            maxLength={40}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
            onBlurCapture={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Occupation */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Your occupation</label>
          <input
            ref={occupationRef}
            style={inputStyle}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Engineer, student, designer..."
            value={occupation}
            onInput={(e) => setOccupation((e.target as HTMLInputElement).value)}
            onBlur={(e) => setOccupation((e.target as HTMLInputElement).value)}
            maxLength={60}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
            onBlurCapture={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border)'}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Helps the AI tailor responses to your context.
          </div>
        </div>

        {/* Custom instructions */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Custom instructions</label>
          <textarea
            ref={customRef}
            style={{ ...inputStyle, resize: 'none', minHeight: '120px', lineHeight: 1.6 }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Anything else you'd like the AI to keep in mind — interests, preferences, how you like responses formatted..."
            value={customInstructions}
            onInput={(e) => setCustomInstructions((e.target as HTMLTextAreaElement).value)}
            onBlur={(e) => setCustomInstructions((e.target as HTMLTextAreaElement).value)}
            maxLength={500}
            onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent)'}
            onBlurCapture={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)'}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px', textAlign: 'right' }}>
            {customInstructions.length}/500
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
