import React from 'react';

interface Props {
  type: 'critical' | 'web' | false;
}

const STYLE: React.CSSProperties = {
  fontSize: '11.5px',
  color: 'var(--text-3)',
  marginTop: '8px',
  padding: '6px 10px',
  borderLeft: '2px solid var(--border)',
  lineHeight: 1.5,
};

const MESSAGES = {
  critical: 'For informational purposes only. Consult a qualified professional before making decisions.',
  web: 'Web sources may be outdated or inaccurate. Verify from authoritative sources.',
};

export default function Disclaimer({ type }: Props) {
  if (!type) return null;
  return <div style={STYLE}>{MESSAGES[type]}</div>;
}
