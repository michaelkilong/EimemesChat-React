// lib/markdown.ts — v1.1 — Added Mermaid diagram rendering + "Save as PNG" button
import { marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';
import mermaid from 'mermaid';

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
 * Call after inserting markdown content into the DOM (e.g., in MessageBubble).
 */
export async function renderMermaidBlocks(container: HTMLElement) {
  const mermaidBlocks = container.querySelectorAll<HTMLElement>('pre code.language-mermaid');

  for (const code of mermaidBlocks) {
    try {
      const pre = code.parentElement!;
      const mermaidCode = code.textContent || '';

      // Create a unique ID for Mermaid
      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);

      // Temporary element to render SVG
      const tempDiv = document.createElement('div');
      tempDiv.style.display = 'none';
      tempDiv.id = id;
      tempDiv.textContent = mermaidCode;
      document.body.appendChild(tempDiv);

      // Render the SVG
      await mermaid.run({ nodes: [tempDiv] });
      const svgElement = tempDiv.querySelector('svg');
      if (!svgElement) {
        document.body.removeChild(tempDiv);
        throw new Error('No SVG generated');
      }

      // Clone the SVG to keep it
      const svgClone = svgElement.cloneNode(true) as SVGElement;

      // Cleanup temp element
      document.body.removeChild(tempDiv);

      // Create a wrapper for the diagram + toolbar
      const diagramWrapper = document.createElement('div');
      diagramWrapper.className = 'mermaid-diagram-wrapper';
      diagramWrapper.style.position = 'relative';
      diagramWrapper.appendChild(svgClone);

      // Toolbar with download button
      const toolbar = document.createElement('div');
      toolbar.className = 'mermaid-toolbar';
      toolbar.style.cssText = 'display:flex; justify-content:flex-end; padding:4px 0;';
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Save as PNG';
      downloadBtn.className = 'copy-btn'; // reuse your existing button style
      downloadBtn.addEventListener('click', () => {
        downloadMermaidAsPNG(svgClone);
      });
      toolbar.appendChild(downloadBtn);
      diagramWrapper.appendChild(toolbar);

      // Replace the original <pre> block
      pre.replaceWith(diagramWrapper);

    } catch (err) {
      console.warn('Mermaid render failed:', err);
      // Keep the original code block as fallback
    }
  }
}

/**
 * Convert an SVG element to a PNG and trigger download.
 */
function downloadMermaidAsPNG(svgElement: SVGElement) {
  try {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const scale = 2; // 2x for high DPI
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
    img.onerror = () => {
      console.error('Failed to load SVG into image');
    };
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
