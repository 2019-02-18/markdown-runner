import { detectLanguage, getCodeBlockContainer } from '../utils/dom';
import { LANGUAGE_ALIASES } from '@shared/constants';

const LABEL_CLASS = 'mr-lang-label';
const labelMap = new WeakMap<HTMLElement, HTMLElement>();

export function initLanguageLabel() {
  return {
    enable() {
      for (const label of getTrackedLabels()) {
        label.style.display = '';
      }
    },
    disable() {
      for (const label of getTrackedLabels()) {
        label.style.display = 'none';
      }
    },
    processBlock(pre: HTMLElement) {
      injectLabel(pre);
    },
  };
}

function siteHasLanguageLabel(pre: HTMLElement): boolean {
  const container = pre.closest('.highlight, .code-block, .codeblock');
  if (container) {
    const existing = container.querySelector(
      '[data-lang-label], .code-header, .code-lang, .code-block-lang',
    );
    if (existing) return true;
  }
  return false;
}

function injectLabel(pre: HTMLElement): void {
  if (labelMap.has(pre)) return;

  const lang = detectLanguage(pre);
  if (!lang) return;

  if (siteHasLanguageLabel(pre)) return;

  const displayName = LANGUAGE_ALIASES[lang] ?? lang;
  const container = getCodeBlockContainer(pre);
  container.style.position = 'relative';

  const label = document.createElement('span');
  label.className = LABEL_CLASS;
  label.textContent = displayName;

  Object.assign(label.style, {
    position: 'absolute',
    top: '6px',
    left: '10px',
    fontSize: '10px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '600',
    color: 'rgba(128,128,128,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: '5',
  });

  container.appendChild(label);
  labelMap.set(pre, label);
}

function* getTrackedLabels(): Generator<HTMLElement> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const label = labelMap.get(pre);
    if (label) yield label;
  }
}
