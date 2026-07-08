import React from 'react';

interface Props {
  type: 'critical' | 'web' | false;
}

const MESSAGES = {
  critical: 'For informational purposes only. Always consult a qualified professional.',
  web: 'Web results may be outdated. Verify from authoritative sources.',
};

export default function Disclaimer({ type }: Props) {
  if (!type) return null;

  return (
    <p
      style={{
        fontSize: '12px',
        color: type === 'critical' ? 'var(--text-2)' : 'var(--text-3)',
        margin: '8px 0 0',
        lineHeight: 1.5,
        fontStyle: 'italic',
      }}
    >
      {MESSAGES[type]}
    </p>
  );
}
