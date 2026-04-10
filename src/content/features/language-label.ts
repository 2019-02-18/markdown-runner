import { detectLanguage } from '../utils/dom';
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

function injectLabel(pre: HTMLElement): void {
  if (labelMap.has(pre)) return;

  const lang = detectLanguage(pre);
  if (!lang) return;

  const displayName = LANGUAGE_ALIASES[lang] ?? lang;

  pre.style.position = 'relative';

  const label = document.createElement('span');
  label.className = LABEL_CLASS;
  label.textContent = displayName;

  Object.assign(label.style, {
    position: 'absolute',
    top: '6px',
    left: '10px',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '600',
    color: 'rgba(128,128,128,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: '5',
  });

  pre.appendChild(label);
  labelMap.set(pre, label);
}

function* getTrackedLabels(): Generator<HTMLElement> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const label = labelMap.get(pre);
    if (label) yield label;
  }
}
