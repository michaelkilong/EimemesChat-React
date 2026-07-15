// lib/markdown.ts — v1.7 — Restored inline KaTeX ($...$) with safe currency handling
//
// Version History:
// v1.7 - Restored inline KaTeX rendering using $...$.
//      - Preserved display math ($$...$$).
//      - Added safer inline math detection to reduce false positives with currency.
//      - Kept citation bubbles and syntax highlighting unchanged.
//
// v1.6 - Disabled inline math ($...$) to prevent layout shifts from dollar signs.
//      - Display math ($$...$$) continued to render normally.
//      - Fixed invalid HTML by unwrapping display placeholders from <p> tags.
//
// v1.5 - Added KaTeX display math rendering.
//      - Introduced placeholder-based parsing before marked.
//      - Added citation bubble support.
//      - Added Highlight.js syntax highlighting.
//
// v1.0 - Initial Markdown renderer using marked with GFM support.
import { marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';

// Configure marked
marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(text: string, msgKey?: string): string {
  try {
    const mathBlocks: Array<{ type: 'display' | 'inline'; eq: string }> = [];

    let protected_text = text
      // Display math $$...$$
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, eq: string) => {
        mathBlocks.push({ type: 'display', eq: eq.trim() });
        return `%%MATH_DISPLAY_${mathBlocks.length - 1}%%`;
      })

      // Inline math $...$
      // Avoid matching currency like $20 or $100.
      .replace(
        /(^|[^\w\\])\$([^\s$][^$\n]*?[^\s$])\$(?!\d)/g,
        (_, prefix: string, eq: string) => {
          mathBlocks.push({ type: 'inline', eq: eq.trim() });
          return `${prefix}%%MATH_INLINE_${mathBlocks.length - 1}%%`;
        }
      );

    let html = marked.parse(protected_text) as string;

    // Unwrap display math placeholders from <p> tags
    html = html.replace(
      /<p>\s*(%%MATH_DISPLAY_\d+%%)\s*<\/p>/g,
      '$1'
    );

    // Replace placeholders with KaTeX
    html = html
      .replace(/%%MATH_DISPLAY_(\d+)%%/g, (_, i: string) => {
        try {
          return katex.renderToString(mathBlocks[Number(i)].eq, {
            displayMode: true,
            throwOnError: false,
            output: 'html',
          });
        } catch {
          return mathBlocks[Number(i)].eq;
        }
      })
      .replace(/%%MATH_INLINE_(\d+)%%/g, (_, i: string) => {
        try {
          return katex.renderToString(mathBlocks[Number(i)].eq, {
            displayMode: false,
            throwOnError: false,
            output: 'html',
          });
        } catch {
          return mathBlocks[Number(i)].eq;
        }
      });

    // Citation bubbles
    const keyArg = msgKey
      ? `,'${msgKey.replace(/'/g, "\\'")}'`
      : '';

    html = html.replace(/\[(\d+)\]/g, (_, n: string) =>
      `<button class="cite-bubble" onclick="if(typeof window.__expandSource==='function')window.__expandSource(${Number(n) - 1}${keyArg})">${n}</button>`
    );

    return html;
  } catch {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
}

export function highlightCodeBlocks(
  container: HTMLElement,
  showToast: (msg: string) => void
) {
  container.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    const lang =
      (code?.className.match(/language-(\w+)/) || [])[1] || '';

    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    wrap.innerHTML = `
      <div class="code-block-head">
        <span class="code-lang">${lang || 'code'}</span>
        <button class="copy-btn">Copy</button>
      </div>
    `;

    pre.parentNode?.replaceChild(wrap, pre);
    wrap.appendChild(pre);

    if (code) {
      if (lang) code.classList.add(`language-${lang}`);
      hljs.highlightElement(code);
    }

    wrap.querySelector('.copy-btn')?.addEventListener(
      'click',
      function (this: HTMLButtonElement) {
        navigator.clipboard
          .writeText(pre.innerText)
          .then(() => {
            this.textContent = 'Copied!';
            this.classList.add('copied');
            setTimeout(() => {
              this.textContent = 'Copy';
              this.classList.remove('copied');
            }, 2000);
          })
          .catch(() => showToast('Could not copy.'));
      }
    );
  });
}

export function getTime(): string {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function syncHljsTheme(isDark: boolean) {
  const light = document.getElementById(
    'hljs-theme-light'
  ) as HTMLLinkElement | null;

  const dark = document.getElementById(
    'hljs-theme-dark'
  ) as HTMLLinkElement | null;

  if (light) light.media = isDark ? 'not all' : 'all';
  if (dark) dark.media = isDark ? 'all' : 'not all';
}
