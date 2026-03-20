// fileReader.ts — client-side file processing for attachments
import type { Attachment } from '../types';

const MAX_TEXT_CHARS = 12000; // ~3000 tokens

export async function processFile(file: File): Promise<Attachment> {
  const name     = file.name;
  const mimeType = file.type;
  const ext      = name.split('.').pop()?.toLowerCase() || '';

  // ── Images ────────────────────────────────────────────────────
  if (mimeType.startsWith('image/')) {
    const base64 = await toBase64(file);
    return { name, type: 'image', mimeType, content: base64 };
  }

  // ── PDF ───────────────────────────────────────────────────────
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const text = await extractPdfText(file);
    return { name, type: 'pdf', mimeType: 'application/pdf', content: text };
  }

  // ── DOCX ──────────────────────────────────────────────────────
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
    const text = await extractDocxText(file);
    return { name, type: 'docx', mimeType, content: text };
  }

  // ── Plain text / CSV / MD ─────────────────────────────────────
  const text = await file.text();
  return { name, type: 'text', mimeType: mimeType || 'text/plain', content: text.slice(0, MAX_TEXT_CHARS) };
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractPdfText(file: File): Promise<string> {
  try {
    // Load PDF.js from CDN dynamically
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text.slice(0, MAX_TEXT_CHARS) || '[PDF appears to be empty or scanned — no text could be extracted]';
  } catch (err) {
    console.error('PDF extraction failed:', err);
    return '[Could not extract text from this PDF]';
  }
}

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) { resolve((window as any).pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      resolve(lib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await loadMammoth();
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.slice(0, MAX_TEXT_CHARS) || '[Document appears to be empty]';
  } catch (err) {
    console.error('DOCX extraction failed:', err);
    return '[Could not extract text from this Word document]';
  }
}

function loadMammoth(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).mammoth) { resolve((window as any).mammoth); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
    script.onload = () => resolve((window as any).mammoth);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function getFileIcon(type: string): string {
  switch (type) {
    case 'image': return '🖼️';
    case 'pdf':   return '📄';
    case 'docx':  return '📝';
    default:      return '📃';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
