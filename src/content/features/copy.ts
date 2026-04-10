import { extractCleanCode } from '../utils/dom';
import { t } from '@shared/i18n';

const COPY_BTN_CLASS = 'mr-copy-btn';
const buttonMap = new WeakMap<HTMLElement, HTMLElement>();

export function initCopy() {
  return {
    enable() {
      for (const [pre, btn] of getTrackedPairs()) {
        btn.style.display = '';
      }
    },
    disable() {
      for (const [pre, btn] of getTrackedPairs()) {
        btn.style.display = 'none';
      }
    },
    processBlock(pre: HTMLElement) {
      injectCopyButton(pre);
    },
  };
}

function injectCopyButton(pre: HTMLElement): void {
  if (buttonMap.has(pre)) return;

  pre.style.position = 'relative';

  const btn = document.createElement('button');
  btn.className = COPY_BTN_CLASS;
  btn.textContent = t('content.copy');
  btn.setAttribute('aria-label', 'Copy code');

  Object.assign(btn.style, {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 10px',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(128,128,128,0.3)',
    borderRadius: '4px',
    background: 'rgba(128,128,128,0.1)',
    color: 'inherit',
    cursor: 'pointer',
    opacity: '0',
    transition: 'opacity 0.2s',
    zIndex: '10',
  });

  pre.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  pre.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const code = extractCleanCode(pre);
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = t('content.copied');
      setTimeout(() => { btn.textContent = t('content.copy'); }, 1500);
    } catch {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = t('content.copy'); }, 1500);
    }
  });

  pre.appendChild(btn);
  buttonMap.set(pre, btn);
}

function* getTrackedPairs(): Generator<[HTMLElement, HTMLElement]> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const btn = buttonMap.get(pre);
    if (btn) yield [pre, btn];
  }
}
