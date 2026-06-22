// lib/markdown.ts — v1.5 — Sanitize Mermaid input before rendering (fixes AI formatting quirks)
// v1.4 — Use mermaid.render for reliable SVG generation
// v1.3 — Improved Mermaid rendering (off‑screen temp, wrapper replacement)
// v1.2 — Client‑only dynamic Mermaid import for build compatibility
// v1.1 — Added Mermaid diagram rendering + "Save as PNG" button
import { marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';

// Configure marked
marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(text: string, msgKey?: string): string {
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

    html = html.replace(/<p>\s*(%%MATH_DISPLAY_\d+%%)\s*<\/p>/g, '$1');

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

/**
 * Convert Mermaid code blocks to SVG diagrams with a "Save as PNG" button.
 * Dynamically imports Mermaid only when executed (client‑side), no static import.
 */
export async function renderMermaidBlocks(container: HTMLElement) {
  const mermaidBlocks = container.querySelectorAll<HTMLElement>('pre code.language-mermaid');

  for (const code of mermaidBlocks) {
    try {
      const mermaidModule = await import('mermaid');
      const mermaid = mermaidModule.default;

      let rawCode = code.textContent || '';

      // ── Sanitize common Mermaid syntax errors from the AI ─────
      rawCode = rawCode
        // Fix trailing ">" after pipe labels: |text|> → |text|
        .replace(/\|([^|]+)\|>/g, '|$1|')
        // Remove leading whitespace on each line (common in chat output)
        .split('\n')
        .map(line => line.trimStart())
        .join('\n');

      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);

      // Primary method: mermaid.render returns SVG string directly
      let svgString: string;
      try {
        const { svg } = await mermaid.render(id, rawCode);
        svgString = svg;
      } catch (renderErr) {
        console.warn('[Mermaid] Primary render failed, trying fallback:', renderErr);
        // Fallback: try mermaid.run on a temp element
        const tempDiv = document.createElement('div');
        tempDiv.id = id;
        tempDiv.textContent = rawCode;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);
        await mermaid.run({ nodes: [tempDiv] });
        const svgEl = tempDiv.querySelector('svg');
        if (!svgEl) throw new Error('No SVG from fallback');
        svgString = svgEl.outerHTML;
        document.body.removeChild(tempDiv);
      }

      // Parse SVG string to DOM element
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      if (!svgElement) throw new Error('Invalid SVG');

      // Build diagram wrapper + toolbar
      const diagramWrapper = document.createElement('div');
      diagramWrapper.className = 'mermaid-diagram-wrapper';
      diagramWrapper.style.position = 'relative';
      diagramWrapper.appendChild(svgElement);

      const toolbar = document.createElement('div');
      toolbar.className = 'mermaid-toolbar';
      toolbar.style.cssText = 'display:flex; justify-content:flex-end; padding:4px 0;';
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Save as PNG';
      downloadBtn.className = 'copy-btn';
      downloadBtn.addEventListener('click', () => {
        downloadMermaidAsPNG(svgElement);
      });
      toolbar.appendChild(downloadBtn);
      diagramWrapper.appendChild(toolbar);

      // Replace the code-block wrapper (or the <pre> as fallback)
      const wrapper = code.closest('.code-block') || code.parentElement!;
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.replaceChild(diagramWrapper, wrapper);
      } else {
        code.parentElement?.replaceWith(diagramWrapper);
      }

      console.log(`[Mermaid] Rendered diagram "${id}"`);

    } catch (err) {
      console.error('[Mermaid] Render failed:', err);
      // Keep the original code block as fallback
    }
  }
}

function downloadMermaidAsPNG(svgElement: SVGElement) {
  try {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const svgRect = svgElement.getBoundingClientRect();
      const width = svgRect.width || 600;
      const height = svgRect.height || 400;

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'diagram.png';
        a.click();
        URL.revokeObjectURL(downloadUrl);
      }, 'image/png');

      URL.revokeObjectURL(url);
    };
    img.onerror = () => console.error('Failed to load SVG into image');
    img.src = url;
  } catch (err) {
    console.error('PNG download failed:', err);
  }
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
