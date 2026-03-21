import { marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';

// Configure marked
marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(text: string): string {
  try {
    const mathBlocks: Array<{ type: 'display' | 'inline'; eq: string }> = [];

    let protected_text = text
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, eq: string) => {
        mathBlocks.push({ type: 'display', eq });
        return `%%MATH_DISPLAY_${mathBlocks.length - 1}%%`;
      })
      .replace(/\$([^\n$]+?)\$/g, (_, eq: string) => {
        mathBlocks.push({ type: 'inline', eq });
        return `%%MATH_INLINE_${mathBlocks.length - 1}%%`;
      });

    let html = marked.parse(protected_text) as string;

    html = html
      .replace(/%%MATH_DISPLAY_(\d+)%%/g, (_, i: string) => {
        try {
          return `<span class="katex-display">${katex.renderToString(mathBlocks[Number(i)].eq, { displayMode: true, throwOnError: false })}</span>`;
        } catch { return mathBlocks[Number(i)].eq; }
      })
      .replace(/%%MATH_INLINE_(\d+)%%/g, (_, i: string) => {
        try {
          return katex.renderToString(mathBlocks[Number(i)].eq, { displayMode: false, throwOnError: false });
        } catch { return mathBlocks[Number(i)].eq; }
      });

    // Convert [1] [2] [3] citation numbers into tappable bubble buttons
    html = html.replace(/\[(\d+)\]/g, (_, n: string) =>
      `<button class="cite-bubble" onclick="window.__expandSource(${Number(n) - 1})">${n}</button>`
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
