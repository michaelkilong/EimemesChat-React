import { marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';

// Configure marked
marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(text: string, msgKey?: string): string {
  try {
    const mathBlocks: Array<{ type: 'display' | 'inline'; eq: string }> = [];

    let protected_text = text
      // Display math $$...$$ — replace before marked so it doesn't mangle it
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, eq: string) => {
        mathBlocks.push({ type: 'display', eq });
        return `%%MATH_DISPLAY_${mathBlocks.length - 1}%%`;
      })
      .replace(/\$([^\n$]+?)\$/g, (_, eq: string) => {
        mathBlocks.push({ type: 'inline', eq });
        return `%%MATH_INLINE_${mathBlocks.length - 1}%%`;
      });

    let html = marked.parse(protected_text) as string;

    // FIX 1: Display math placeholder ends up inside <p>...</p> after marked.
    // Unwrap it so the KaTeX block element isn't nested inside <p> (invalid HTML).
    html = html.replace(/<p>\s*(%%MATH_DISPLAY_\d+%%)\s*<\/p>/g, '$1');

    // FIX 2: Replace placeholders with KaTeX output.
    // Display mode: let KaTeX handle its own .katex-display class — no extra wrapper.
    html = html
      .replace(/%%MATH_DISPLAY_(\d+)%%/g, (_, i: string) => {
        try {
          return katex.renderToString(mathBlocks[Number(i)].eq, {
            displayMode: true,
            throwOnError: false,
            output: 'html',
          });
        } catch { return mathBlocks[Number(i)].eq; }
      })
      .replace(/%%MATH_INLINE_(\d+)%%/g, (_, i: string) => {
        try {
          return katex.renderToString(mathBlocks[Number(i)].eq, {
            displayMode: false,
            throwOnError: false,
            output: 'html',
          });
        } catch { return mathBlocks[Number(i)].eq; }
      });

    // Citation bubbles
    const keyArg = msgKey ? `,'${msgKey.replace(/'/g, "\\'")}'` : '';
    html = html.replace(/\[(\d+)\]/g, (_, n: string) =>
      `<button class="cite-bubble" onclick="if(typeof window.__expandSource==='function')window.__expandSource(${Number(n) - 1}${keyArg})">${n}</button>`
    );

    return html;
  } catch {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }
}

export function highlightCodeBlocks(container: HTMLElement, showToast: (msg: string) => void) {
  container.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    const lang = (code?.className.match(/language-(\w+)/) || [])[1] || '';
    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    wrap.innerHTML = `<div class="code-block-head"><span class="code-lang">${lang || 'code'}</span><button class="copy-btn">Copy</button></div>`;
    pre.parentNode?.replaceChild(wrap, pre);
    wrap.appendChild(pre);

    if (code) {
      if (lang) code.classList.add(`language-${lang}`);
      hljs.highlightElement(code);
    }

    wrap.querySelector('.copy-btn')?.addEventListener('click', function (this: HTMLButtonElement) {
      navigator.clipboard.writeText(pre.innerText)
        .then(() => {
          this.textContent = 'Copied!';
          this.classList.add('copied');
          setTimeout(() => { this.textContent = 'Copy'; this.classList.remove('copied'); }, 2000);
        })
        .catch(() => showToast('Could not copy.'));
    });
  });
}

export function getTime(): string {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function syncHljsTheme(isDark: boolean) {
  const light = document.getElementById('hljs-theme-light') as HTMLLinkElement | null;
  const dark  = document.getElementById('hljs-theme-dark')  as HTMLLinkElement | null;
  if (light) light.media = isDark ? 'not all' : 'all';
  if (dark)  dark.media  = isDark ? 'all' : 'not all';
}
        
