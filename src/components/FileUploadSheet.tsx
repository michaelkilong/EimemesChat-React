// components/FileUploadSheet.tsx — v1.0 (bottom sheet for file upload)
import React, { useRef, useEffect, useCallback } from 'react';
import { haptic } from '../lib/haptic';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFile: (file: File) => void;        // for file browser
  onSelectImage: (file: File) => void;        // for camera or library
}

export default function FileUploadSheet({ visible, onClose, onSelectFile, onSelectImage }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      haptic.light();
      onClose();
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startY.current;
    // Only track downward swipe
    if (delta > 50) {
      haptic.light();
      onClose();
    }
  }, [onClose]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  const handleCamera = () => {
    // Create an input for camera capture
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // or 'user' for front camera
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        onSelectImage(file);
        onClose();
      }
    };
    input.click();
  };

  const handleLibrary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        onSelectImage(file);
        onClose();
      }
    };
    input.click();
  };

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // accept any file; you can restrict if needed
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        onSelectFile(file);
        onClose();
      }
    };
    input.click();
  };

  const optionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 20px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-1)',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.1s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: visible ? 'flex' : 'none',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          background: 'var(--glass-1)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          padding: '12px 0 32px',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: 'var(--sh-md)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '5px',
              borderRadius: '3px',
              background: 'var(--text-3)',
              opacity: 0.4,
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={handleCamera}
            style={optionStyle}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-3)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Take Photo
          </button>

          <button
            onClick={handleLibrary}
            style={optionStyle}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-3)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Choose from Library
          </button>

          <button
            onClick={handleBrowse}
            style={optionStyle}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-3)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            Browse Files
          </button>

          <button
            onClick={() => { haptic.light(); onClose(); }}
            style={{
              ...optionStyle,
              marginTop: '8px',
              justifyContent: 'center',
              color: 'var(--text-2)',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
