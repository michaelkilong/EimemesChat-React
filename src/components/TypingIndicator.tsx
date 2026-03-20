import React from 'react';

export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0 10px', gap: '5px' }}>
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}
