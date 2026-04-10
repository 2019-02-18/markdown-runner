/**
 * Multi-block joint execution.
 * Detects consecutive code blocks that form an HTML+CSS+JS group
 * and adds a "▶ Run All" button to execute them together.
 */
import { detectLanguage, extractCleanCode, getCodeBlockContainer } from '../utils/dom';
import { t } from '@shared/i18n';

const WEB_LANGS = new Set(['html', 'css', 'javascript', 'js', 'typescript', 'ts']);
const processedGroups = new WeakSet<HTMLElement>();

interface MultiRunState {
  btn: HTMLElement;
  outputPanel: HTMLElement;
  blocks: Array<{ pre: HTMLElement; lang: string }>;
}

const stateMap = new Map<string, MultiRunState>();
let groupCounter = 0;

export function initMultiRun() {
  return {
    enable() {
      for (const s of stateMap.values()) s.btn.style.display = '';
    },
    disable() {
      for (const s of stateMap.values()) {
        s.btn.style.display = 'none';
        s.outputPanel.style.display = 'none';
      }
    },
    processBlock(_pre: HTMLElement) {
      scanForGroups();
    },
  };
}

function getAllCodePres(): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
    if (seen.has(pre)) return;
    const hasCode = pre.querySelector('code');
    const inHighlight = pre.closest('.highlight');
    const hasSpans = pre.querySelector('span[class^="pl-"]');
    if (hasCode || inHighlight || hasSpans) {
      seen.add(pre);
      result.push(pre);
    }
  });
  return result;
}

function scanForGroups(): void {
  const allPres = getAllCodePres();

  let i = 0;
  while (i < allPres.length) {
    if (processedGroups.has(allPres[i])) { i++; continue; }

    const lang = normalizeLang(detectLanguage(allPres[i]));
    if (!lang || !WEB_LANGS.has(lang)) { i++; continue; }

    const group: Array<{ pre: HTMLElement; lang: string }> = [{ pre: allPres[i], lang }];

    for (let j = i + 1; j < Math.min(i + 4, allPres.length); j++) {
      const nextLang = normalizeLang(detectLanguage(allPres[j]));
      if (!nextLang || !WEB_LANGS.has(nextLang)) break;
      if (group.some((g) => g.lang === nextLang)) break;
      group.push({ pre: allPres[j], lang: nextLang });
    }

    if (group.length >= 2 && group.some((g) => g.lang === 'html')) {
      const hasExisting = group.some((g) => processedGroups.has(g.pre));
      if (!hasExisting) {
        injectRunAllButton(group);
        group.forEach((g) => processedGroups.add(g.pre));
      }
    }

    i += group.length;
  }
}

function normalizeLang(lang: string | null): string | null {
  if (!lang) return null;
  const map: Record<string, string> = { js: 'javascript', ts: 'typescript' };
  return map[lang] ?? lang;
}

function injectRunAllButton(blocks: Array<{ pre: HTMLElement; lang: string }>): void {
  const lastBlock = blocks[blocks.length - 1];
  const lastContainer = getCodeBlockContainer(lastBlock.pre);
  const key = `multi-${++groupCounter}`;

  const btn = document.createElement('button');
  btn.textContent = `▶ Run All (${blocks.map((b) => b.lang.toUpperCase()).join(' + ')})`;

  Object.assign(btn.style, {
    display: 'block',
    margin: '8px auto',
    padding: '6px 20px',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '500',
    border: '1px solid rgba(59,130,246,0.4)',
    borderRadius: '16px',
    background: 'rgba(59,130,246,0.08)',
    color: '#3b82f6',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(59,130,246,0.15)';
    btn.style.borderColor = 'rgba(59,130,246,0.6)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(59,130,246,0.08)';
    btn.style.borderColor = 'rgba(59,130,246,0.4)';
  });

  const outputPanel = document.createElement('div');
  Object.assign(outputPanel.style, {
    display: 'none',
    margin: '4px 0 12px',
  });

  const state: MultiRunState = { btn, outputPanel, blocks };
  stateMap.set(key, state);

  btn.addEventListener('click', () => runCombined(state));

  lastContainer.insertAdjacentElement('afterend', btn);
  btn.insertAdjacentElement('afterend', outputPanel);
}

function runCombined(state: MultiRunState): void {
  let htmlPart = '';
  let cssPart = '';
  let jsPart = '';

  for (const { pre, lang } of state.blocks) {
    const code = extractCleanCode(pre);
    if (lang === 'html') htmlPart = code;
    else if (lang === 'css') cssPart = code;
    else if (lang === 'javascript' || lang === 'typescript') jsPart = code;
  }

  const combined = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
${cssPart ? `<style>${cssPart}</style>` : ''}
</head><body>
${htmlPart}
${jsPart ? `<script>${jsPart}<\/script>` : ''}
</body></html>`;

  state.outputPanel.style.display = 'block';
  state.outputPanel.innerHTML = '';

  const label = document.createElement('div');
  label.textContent = '▸ Combined Output';
  Object.assign(label.style, {
    fontSize: '11px',
    fontWeight: '600',
    color: '#888',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  });
  state.outputPanel.appendChild(label);

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    width: '100%',
    minHeight: '150px',
    border: '1px solid rgba(128,128,128,0.15)',
    borderRadius: '6px',
    background: '#fff',
  });
  iframe.sandbox.add('allow-scripts');
  iframe.srcdoc = combined;

  iframe.addEventListener('load', () => {
    const h = iframe.contentDocument?.body?.scrollHeight;
    if (h) iframe.style.height = `${Math.min(h + 24, 600)}px`;
  });

  state.outputPanel.appendChild(iframe);
}
