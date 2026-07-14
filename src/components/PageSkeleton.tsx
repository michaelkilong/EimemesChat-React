// PageSkeleton.tsx — Generic shimmer placeholder for lazy-loaded pages
import React from 'react';

interface Props {
  lines?: number;
  title?: boolean;
  subtitle?: boolean;
}

export default function PageSkeleton({ lines = 6, title = true, subtitle = false }: Props) {
  return (
    <div style={{ flex: 1, padding: 'calc(var(--sat) + 60px) 20px 20px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
      {title && (
        <div
          className="skeleton-line"
          style={{ height: 22, width: '35%', marginBottom: 28, borderRadius: 8 }}
        />
      )}
      {subtitle && (
        <div
          className="skeleton-line"
          style={{ height: 14, width: '50%', marginBottom: 20, borderRadius: 6 }}
        />
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            height: 14,
            width: `${60 + Math.random() * 35}%`,
            marginBottom: 14,
            borderRadius: 6,
          }}
        />
      ))}
    </div>
  );
}
