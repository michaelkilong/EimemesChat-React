// LicensesView.tsx — v1.0
import React, { useState } from 'react';

interface Props {
  onBack: () => void;
}

interface License {
  name: string;
  version: string;
  license: string;
  author: string;
  url: string;
  text: string;
}

const LICENSES: License[] = [
  {
    name: 'React',
    version: '18.2.0',
    license: 'MIT',
    author: 'Meta Platforms, Inc.',
    url: 'github.com/facebook/react',
    text: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.',
  },
  {
    name: 'Firebase',
    version: '10.7.1',
    license: 'Apache 2.0',
    author: 'Google LLC',
    url: 'github.com/firebase/firebase-js-sdk',
    text: 'Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    name: 'PDF.js',
    version: '3.11.174',
    license: 'Apache 2.0',
    author: 'Mozilla Foundation',
    url: 'github.com/mozilla/pdf.js',
    text: 'Licensed under the Apache License, Version 2.0. PDF.js is a Portable Document Format (PDF) viewer that is built with HTML5.',
  },
  {
    name: 'Mammoth.js',
    version: '1.6.0',
    license: 'BSD 2-Clause',
    author: 'Michael Williamson',
    url: 'github.com/mwilliamson/mammoth.js',
    text: 'Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.',
  },
  {
    name: 'Highlight.js',
    version: '11.9.0',
    license: 'BSD 3-Clause',
    author: 'Ivan Sagalaev',
    url: 'github.com/highlightjs/highlight.js',
    text: 'Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: Redistributions of source code must retain the above copyright notice.',
  },
  {
    name: 'KaTeX',
    version: '0.16.9',
    license: 'MIT',
    author: 'Khan Academy',
    url: 'github.com/KaTeX/KaTeX',
    text: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction.',
  },
  {
    name: 'Marked',
    version: '11.1.1',
    license: 'MIT',
    author: 'Christopher Jeffrey',
    url: 'github.com/markedjs/marked',
    text: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction.',
  },
  {
    name: 'Vite',
    version: '5.0.0',
    license: 'MIT',
    author: 'Evan You',
    url: 'github.com/vitejs/vite',
    text: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction.',
  },
];

const LICENSE_COLORS: Record<string, string> = {
  'MIT':        '#30d158',
  'Apache 2.0': '#0a84ff',
  'BSD 2-Clause': '#ff9f0a',
  'BSD 3-Clause': '#ff9f0a',
};

export default function LicensesView({ onBack }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: 'calc(16px + var(--sat)) 20px 16px', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-1)', flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>
          Open Source Licenses
        </span>
      </header>

      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 48px' }}>

        <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.5 }}>
          EimemesChat AI is built with the following open source software. Tap any entry to view its license.
        </div>

        {LICENSES.map(lib => (
          <div
            key={lib.name}
            style={{
              background: 'var(--glass-2)', borderRadius: '16px',
              marginBottom: '10px', overflow: 'hidden',
            }}
          >
            {/* Row */}
            <div
              onClick={() => setExpanded(expanded === lib.name ? null : lib.name)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)' }}>{lib.name}</span>
                  <span style={{ fontSize: '11px', color: LICENSE_COLORS[lib.license] || 'var(--accent)', background: `${LICENSE_COLORS[lib.license]}22` || 'var(--accent-dim)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                    {lib.license}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                  {lib.author} · v{lib.version}
                </div>
              </div>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded === lib.name ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {/* Expanded license text */}
            {expanded === lib.name && (
              <div style={{
                padding: '0 16px 16px',
                borderTop: '1px solid var(--border-b)',
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7, marginTop: '12px', fontFamily: 'monospace' }}>
                  {lib.text}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '8px' }}>
                  {lib.url}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
