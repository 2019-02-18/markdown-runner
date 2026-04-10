import { detectLanguage, extractCleanCode } from '../utils/dom';
import { t } from '@shared/i18n';
import type { Settings, DiffViewMode } from '@shared/types';

interface DiffState {
  btn: HTMLElement;
  panel: HTMLElement;
  preA: HTMLElement;
  preB: HTMLElement;
}

const diffMap = new Map<string, DiffState>();
let defaultViewMode: DiffViewMode = 'side-by-side';

export function initDiff(settings: Settings) {
  defaultViewMode = settings.diffViewMode;

  return {
    enable() {
      for (const state of diffMap.values()) {
        state.btn.style.display = '';
      }
    },
    disable() {
      for (const state of diffMap.values()) {
        state.btn.style.display = 'none';
        state.panel.style.display = 'none';
      }
    },
    processBlock(_pre: HTMLElement) {
      scanForDiffPairs();
    },
  };
}

function scanForDiffPairs(): void {
  const allPres = Array.from(document.querySelectorAll<HTMLElement>('pre > code'))
    .map((code) => code.parentElement as HTMLElement)
    .filter(Boolean);

  for (let i = 0; i < allPres.length - 1; i++) {
    const preA = allPres[i];
    const preB = allPres[i + 1];
    const pairKey = `${i}-${i + 1}`;

    if (diffMap.has(pairKey)) continue;

    const langA = detectLanguage(preA);
    const langB = detectLanguage(preB);
    if (!langA || !langB || langA !== langB) continue;

    injectDiffButton(preA, preB, pairKey);
  }
}

function injectDiffButton(preA: HTMLElement, preB: HTMLElement, pairKey: string): void {
  const btn = document.createElement('button');
  btn.textContent = `⇄ ${t('content.diff')}`;

  Object.assign(btn.style, {
    display: 'block',
    margin: '4px auto',
    padding: '4px 16px',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(128,128,128,0.3)',
    borderRadius: '12px',
    background: 'rgba(128,128,128,0.05)',
    color: 'inherit',
    cursor: 'pointer',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    display: 'none',
    margin: '8px 0',
    border: '1px solid rgba(128,128,128,0.2)',
    borderRadius: '6px',
    overflow: 'hidden',
    fontSize: '13px',
    fontFamily: 'monospace',
  });

  const state: DiffState = { btn, panel, preA, preB };
  diffMap.set(pairKey, state);

  btn.addEventListener('click', () => {
    if (panel.style.display === 'none') {
      renderDiff(state, defaultViewMode);
      panel.style.display = 'block';
      btn.textContent = `✕ ${t('content.closeDiff')}`;
    } else {
      panel.style.display = 'none';
      btn.textContent = `⇄ ${t('content.diff')}`;
    }
  });

  preA.insertAdjacentElement('afterend', btn);
  btn.insertAdjacentElement('afterend', panel);
}

function renderDiff(state: DiffState, mode: DiffViewMode): void {
  const codeA = extractCleanCode(state.preA).split('\n');
  const codeB = extractCleanCode(state.preB).split('\n');
  const changes = computeSimpleDiff(codeA, codeB);

  state.panel.innerHTML = '';

  if (mode === 'side-by-side') {
    renderSideBySide(state.panel, changes);
  } else {
    renderInline(state.panel, changes);
  }
}

interface DiffLine {
  type: 'same' | 'add' | 'remove';
  lineA?: number;
  lineB?: number;
  text: string;
}

/**
 * Simple line-by-line diff (LCS-based approach would be better for production,
 * but this works for the MVP skeleton).
 */
function computeSimpleDiff(linesA: string[], linesB: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const maxLen = Math.max(linesA.length, linesB.length);

  let idxA = 0;
  let idxB = 0;

  while (idxA < linesA.length || idxB < linesB.length) {
    if (idxA < linesA.length && idxB < linesB.length && linesA[idxA] === linesB[idxB]) {
      result.push({ type: 'same', lineA: idxA + 1, lineB: idxB + 1, text: linesA[idxA] });
      idxA++;
      idxB++;
    } else if (idxA < linesA.length && (idxB >= linesB.length || !linesB.includes(linesA[idxA]))) {
      result.push({ type: 'remove', lineA: idxA + 1, text: linesA[idxA] });
      idxA++;
    } else if (idxB < linesB.length) {
      result.push({ type: 'add', lineB: idxB + 1, text: linesB[idxB] });
      idxB++;
    }
  }

  return result;
}

function renderSideBySide(container: HTMLElement, changes: DiffLine[]): void {
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  for (const line of changes) {
    const tr = document.createElement('tr');

    const tdNumA = createCell(line.lineA?.toString() ?? '', 'num');
    const tdCodeA = createCell(line.type === 'add' ? '' : line.text, 'code');
    const tdNumB = createCell(line.lineB?.toString() ?? '', 'num');
    const tdCodeB = createCell(line.type === 'remove' ? '' : line.text, 'code');

    if (line.type === 'remove') {
      tdCodeA.style.background = 'rgba(255,0,0,0.08)';
      tdCodeA.style.color = '#c62828';
    } else if (line.type === 'add') {
      tdCodeB.style.background = 'rgba(0,128,0,0.08)';
      tdCodeB.style.color = '#2e7d32';
    }

    tr.append(tdNumA, tdCodeA, tdNumB, tdCodeB);
    table.appendChild(tr);
  }

  container.appendChild(table);
}

function renderInline(container: HTMLElement, changes: DiffLine[]): void {
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  for (const line of changes) {
    const tr = document.createElement('tr');
    const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
    const tdPrefix = createCell(prefix, 'num');
    const tdCode = createCell(line.text, 'code');

    if (line.type === 'remove') {
      tr.style.background = 'rgba(255,0,0,0.06)';
      tdCode.style.color = '#c62828';
    } else if (line.type === 'add') {
      tr.style.background = 'rgba(0,128,0,0.06)';
      tdCode.style.color = '#2e7d32';
    }

    tr.append(tdPrefix, tdCode);
    table.appendChild(tr);
  }

  container.appendChild(table);
}

function createCell(text: string, type: 'num' | 'code'): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = text;
  td.style.padding = '1px 6px';
  td.style.whiteSpace = 'pre';
  if (type === 'num') {
    td.style.width = '1%';
    td.style.color = 'rgba(128,128,128,0.6)';
    td.style.textAlign = 'right';
    td.style.userSelect = 'none';
    td.style.borderRight = '1px solid rgba(128,128,128,0.15)';
  }
  return td;
}
