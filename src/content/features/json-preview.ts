/**
 * JSON/YAML formatted preview.
 * Adds a "Format" button to JSON/YAML code blocks that renders
 * an interactive, collapsible tree view with syntax highlighting.
 */
import { detectLanguage, getCodeBlockContainer, extractCleanCode } from '../utils/dom';

const previewMap = new WeakMap<HTMLElement, { btn: HTMLElement; panel: HTMLElement }>();
const JSON_LANGS = new Set(['json', 'jsonc']);

export function initJsonPreview() {
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
      injectFormatButton(pre);
    },
  };
}

function injectFormatButton(pre: HTMLElement): void {
  if (previewMap.has(pre)) return;

  const lang = detectLanguage(pre);
  if (!lang || !JSON_LANGS.has(lang)) return;

  const container = getCodeBlockContainer(pre);
  container.style.position = 'relative';

  const btn = document.createElement('button');
  btn.textContent = '{ } Format';

  Object.assign(btn.style, {
    position: 'absolute',
    top: '6px',
    right: '6px',
    padding: '3px 10px',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(245,158,11,0.4)',
    borderRadius: '4px',
    background: 'rgba(245,158,11,0.1)',
    color: '#d97706',
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
    padding: '12px 16px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    background: '#1e1e1e',
    color: '#d4d4d4',
    border: '1px solid rgba(128,128,128,0.2)',
    borderRadius: '6px',
    maxHeight: '500px',
    overflow: 'auto',
    lineHeight: '1.5',
  });

  previewMap.set(pre, { btn, panel });

  btn.addEventListener('click', () => {
    if (panel.style.display === 'none') {
      renderJsonTree(pre, panel);
      panel.style.display = 'block';
      btn.textContent = '✕ Close';
    } else {
      panel.style.display = 'none';
      panel.innerHTML = '';
      btn.textContent = '{ } Format';
    }
  });

  container.appendChild(btn);
  container.insertAdjacentElement('afterend', panel);
}

function stripJsonComments(json: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let escaped = false;

  while (i < json.length) {
    const ch = json[i];

    if (escaped) { result += ch; escaped = false; i++; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; i++; continue; }
    if (ch === '"') { inString = !inString; result += ch; i++; continue; }

    if (!inString) {
      if (ch === '/' && json[i + 1] === '/') {
        while (i < json.length && json[i] !== '\n') i++;
        continue;
      }
      if (ch === '/' && json[i + 1] === '*') {
        i += 2;
        while (i < json.length - 1 && !(json[i] === '*' && json[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
    }

    result += ch;
    i++;
  }
  return result;
}

function tryParseJson(raw: string): unknown {
  const stripped = stripJsonComments(raw);
  const cleaned = stripped.replace(/,\s*([\]}])/g, '$1');

  const attempts = [
    () => JSON.parse(raw),
    () => JSON.parse(stripped),
    () => JSON.parse(cleaned),
    () => JSON.parse(`{${cleaned}}`),
    () => JSON.parse(`[${cleaned}]`),
  ];

  for (const attempt of attempts) {
    try { return attempt(); } catch { /* next */ }
  }
  throw new SyntaxError('Unable to parse as JSON');
}

function renderJsonTree(pre: HTMLElement, panel: HTMLElement): void {
  panel.innerHTML = '';
  const raw = extractCleanCode(pre);

  let parsed: unknown;
  try {
    parsed = tryParseJson(raw);
  } catch (e) {
    const err = document.createElement('div');
    err.textContent = `Parse error: ${(e as Error).message}`;
    err.style.color = '#f48771';
    panel.appendChild(err);
    return;
  }

  const tree = buildTreeNode(parsed, '', 0);
  panel.appendChild(tree);
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

function showCopyToast(anchor: HTMLElement): void {
  const toast = document.createElement('span');
  toast.textContent = '✓ Copied!';
  Object.assign(toast.style, {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '2px 8px',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '600',
    background: '#2ea44f',
    color: '#fff',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '30',
    opacity: '1',
    transition: 'opacity 0.3s',
  });
  anchor.style.position = 'relative';
  anchor.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; }, 800);
  setTimeout(() => toast.remove(), 1200);
}

function makeClickable(row: HTMLElement, copyText: string, path: string): void {
  row.style.cursor = 'pointer';
  row.style.borderRadius = '3px';
  row.style.padding = '1px 4px';
  row.style.margin = '0 -4px';
  row.title = path ? `Path: ${path}` : '';

  row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.06)'; });
  row.addEventListener('mouseleave', () => { row.style.background = ''; });

  row.addEventListener('click', (e) => {
    e.stopPropagation();
    copyToClipboard(copyText).then(() => {
      row.style.background = 'rgba(46,164,79,0.2)';
      showCopyToast(row);
      setTimeout(() => { row.style.background = ''; }, 1200);
    });
  });
}

function buildTreeNode(value: unknown, key: string, depth: number, path = ''): HTMLElement {
  const currentPath = key ? (path ? `${path}.${key}` : key) : path;
  const row = document.createElement('div');
  row.style.paddingLeft = `${depth * 16}px`;

  if (value === null) {
    row.innerHTML = formatKey(key) + colorize('null', '#569cd6');
    makeClickable(row, 'null', currentPath);
    return row;
  }

  if (typeof value === 'boolean') {
    row.innerHTML = formatKey(key) + colorize(String(value), '#569cd6');
    makeClickable(row, String(value), currentPath);
    return row;
  }

  if (typeof value === 'number') {
    row.innerHTML = formatKey(key) + colorize(String(value), '#b5cea8');
    makeClickable(row, String(value), currentPath);
    return row;
  }

  if (typeof value === 'string') {
    const display = value.length > 120 ? value.slice(0, 120) + '…' : value;
    row.innerHTML = formatKey(key) + colorize(`"${escapeHtml(display)}"`, '#ce9178');
    makeClickable(row, value, currentPath);
    return row;
  }

  if (Array.isArray(value)) {
    return buildCollapsible(key, value, depth, true, currentPath);
  }

  if (typeof value === 'object') {
    return buildCollapsible(key, value as Record<string, unknown>, depth, false, currentPath);
  }

  row.innerHTML = formatKey(key) + escapeHtml(String(value));
  makeClickable(row, String(value), currentPath);
  return row;
}

function buildCollapsible(
  key: string,
  value: unknown[] | Record<string, unknown>,
  depth: number,
  isArray: boolean,
  path = '',
): HTMLElement {
  const wrapper = document.createElement('div');
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  const header = document.createElement('div');
  header.style.paddingLeft = `${depth * 16}px`;
  header.style.cursor = 'pointer';
  header.style.userSelect = 'none';
  header.style.borderRadius = '3px';
  header.style.padding = '1px 4px';
  header.style.margin = '0 -4px';

  const bracket = isArray ? '[]' : '{}';
  const count = entries.length;

  const arrow = document.createElement('span');
  arrow.textContent = '▸ ';
  arrow.style.color = '#808080';
  arrow.style.fontFamily = 'monospace';

  header.appendChild(arrow);
  if (key) {
    header.insertAdjacentHTML('beforeend', formatKey(key));
  }
  const summary = document.createElement('span');
  summary.style.color = '#808080';
  summary.textContent = `${bracket[0]} ${count} item${count !== 1 ? 's' : ''} ${bracket[1]}`;
  header.appendChild(summary);

  header.addEventListener('mouseenter', () => { header.style.background = 'rgba(255,255,255,0.06)'; });
  header.addEventListener('mouseleave', () => { header.style.background = ''; });

  const content = document.createElement('div');
  content.style.display = 'none';

  let populated = false;
  header.addEventListener('click', () => {
    const collapsed = content.style.display === 'none';
    content.style.display = collapsed ? 'block' : 'none';
    arrow.textContent = collapsed ? '▾ ' : '▸ ';

    if (!populated) {
      populated = true;
      for (const [k, v] of entries) {
        const childPath = isArray ? `${path}[${k}]` : (path ? `${path}.${k}` : k);
        content.appendChild(buildTreeNode(v, k, depth + 1, childPath));
      }
    }
  });

  wrapper.appendChild(header);
  wrapper.appendChild(content);
  return wrapper;
}

function formatKey(key: string): string {
  if (!key) return '';
  return `<span style="color:#9cdcfe">"${escapeHtml(key)}"</span><span style="color:#d4d4d4">: </span>`;
}

function colorize(text: string, color: string): string {
  return `<span style="color:${color}">${text}</span>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function* getTracked() {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const s = previewMap.get(pre);
    if (s) yield s;
  }
}
