/**
 * Mermaid diagram renderer.
 * Detects ```mermaid code blocks, adds a "Render" button,
 * and renders the diagram in a sandboxed iframe using mermaid.js from CDN.
 */
import { detectLanguage, getCodeBlockContainer, extractCleanCode } from '../utils/dom';

const rendererMap = new WeakMap<HTMLElement, { btn: HTMLElement; panel: HTMLElement }>();

export function initMermaidRenderer() {
  return {
    enable() {
      for (const { btn } of getTracked()) btn.style.display = '';
    },
    disable() {
      for (const { btn, panel } of getTracked()) {
        btn.style.display = 'none';
        panel.style.display = 'none';
      }
    },
    processBlock(pre: HTMLElement) {
      injectRenderButton(pre);
    },
  };
}

function injectRenderButton(pre: HTMLElement): void {
  if (rendererMap.has(pre)) return;

  const lang = detectLanguage(pre);
  if (lang !== 'mermaid') return;

  const container = getCodeBlockContainer(pre);
  container.style.position = 'relative';

  const btn = document.createElement('button');
  btn.textContent = '◈ Render';

  Object.assign(btn.style, {
    position: 'absolute',
    top: '6px',
    right: '6px',
    padding: '3px 10px',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(168,85,247,0.4)',
    borderRadius: '4px',
    background: 'rgba(168,85,247,0.1)',
    color: '#a855f7',
    cursor: 'pointer',
    opacity: '0.8',
    transition: 'opacity 0.15s',
    zIndex: '20',
    lineHeight: '1.4',
  });

  container.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  container.addEventListener('mouseleave', () => { btn.style.opacity = '0.8'; });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    display: 'none',
    margin: '4px 0 8px',
    borderRadius: '6px',
    overflow: 'hidden',
  });

  rendererMap.set(pre, { btn, panel });

  btn.addEventListener('click', () => {
    if (panel.style.display === 'none') {
      renderMermaid(pre, panel);
      panel.style.display = 'block';
      btn.textContent = '✕ Close';
    } else {
      panel.style.display = 'none';
      panel.innerHTML = '';
      btn.textContent = '◈ Render';
    }
  });

  container.appendChild(btn);
  container.insertAdjacentElement('afterend', panel);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMermaid(pre: HTMLElement, outputPanel: HTMLElement): void {
  outputPanel.innerHTML = '';

  const code = extractCleanCode(pre);
  const escaped = escapeHtml(code);

  const doc = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin: 0; padding: 12px; display: flex; justify-content: center; background: #fff; }
.mermaid { max-width: 100%; }
.loading { color: #888; font-family: system-ui; font-size: 13px; padding: 20px; text-align: center; }
.error { color: #e53935; font-family: monospace; font-size: 12px; padding: 12px; white-space: pre-wrap; }
</style>
</head><body>
<div class="loading" id="loading">Loading diagram...</div>
<pre class="mermaid" style="display:none">${escaped}</pre>
<script type="module">
try {
  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
  document.getElementById('loading').style.display = 'none';
  const el = document.querySelector('.mermaid');
  el.style.display = '';
  await mermaid.run({ nodes: [el] });
  const svg = document.querySelector('svg');
  if (svg) {
    const rect = svg.getBoundingClientRect();
    parent.postMessage({ type: 'MR_MERMAID_READY', height: Math.ceil(rect.height) + 24 }, '*');
  }
} catch (e) {
  document.getElementById('loading').style.display = 'none';
  const errDiv = document.createElement('div');
  errDiv.className = 'error';
  errDiv.textContent = 'Render failed: ' + e.message;
  document.body.appendChild(errDiv);
  parent.postMessage({ type: 'MR_MERMAID_READY', height: 80 }, '*');
}
</script>
</body></html>`;

  const blob = new Blob([doc], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.src = url;
  Object.assign(iframe.style, {
    width: '100%',
    border: '1px solid rgba(128,128,128,0.15)',
    borderRadius: '6px',
    minHeight: '120px',
    background: '#fff',
  });

  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'MR_MERMAID_READY') {
      iframe.style.height = `${e.data.height}px`;
      URL.revokeObjectURL(url);
      window.removeEventListener('message', onMessage);
    }
  };
  window.addEventListener('message', onMessage);

  setTimeout(() => {
    window.removeEventListener('message', onMessage);
    URL.revokeObjectURL(url);
  }, 30000);

  outputPanel.appendChild(iframe);
}

function* getTracked() {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const s = rendererMap.get(pre);
    if (s) yield s;
  }
}
