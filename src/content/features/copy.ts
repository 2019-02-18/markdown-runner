import { extractCleanCode } from '../utils/dom';
import { t } from '@shared/i18n';
import { getCodeBlockContainer } from '../utils/dom';

const COPY_BTN_CLASS = 'mr-copy-btn';
const buttonMap = new WeakMap<HTMLElement, HTMLElement>();

export function initCopy() {
  return {
    enable() {
      for (const btn of getTrackedButtons()) {
        btn.style.display = '';
      }
    },
    disable() {
      for (const btn of getTrackedButtons()) {
        btn.style.display = 'none';
      }
    },
    processBlock(pre: HTMLElement) {
      injectCopyButton(pre);
    },
  };
}

function siteHasCopyButton(pre: HTMLElement): boolean {
  const container = pre.closest('.highlight, .code-block, .codeblock');
  if (container) {
    const existing = container.querySelector(
      'button[aria-label*="copy" i], button[aria-label*="Copy" i], .zeroclipboard-container, .copy-button, [data-copy-feedback]',
    );
    if (existing) return true;
  }
  return false;
}

function injectCopyButton(pre: HTMLElement): void {
  if (buttonMap.has(pre)) return;
  if (siteHasCopyButton(pre)) return;

  const container = getCodeBlockContainer(pre);
  container.style.position = 'relative';

  const btn = document.createElement('button');
  btn.className = COPY_BTN_CLASS;
  btn.textContent = t('content.copy');
  btn.setAttribute('aria-label', 'Copy code');

  Object.assign(btn.style, {
    position: 'absolute',
    top: '6px',
    right: '6px',
    padding: '3px 8px',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(128,128,128,0.3)',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.9)',
    color: '#57606a',
    cursor: 'pointer',
    opacity: '0',
    transition: 'opacity 0.15s',
    zIndex: '20',
    lineHeight: '1.4',
    backdropFilter: 'blur(4px)',
  });

  container.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  container.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const code = extractCleanCode(pre);
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = t('content.copied');
      btn.style.color = '#2ea44f';
      setTimeout(() => {
        btn.textContent = t('content.copy');
        btn.style.color = '#57606a';
      }, 1500);
    } catch {
      btn.textContent = '✗';
      setTimeout(() => { btn.textContent = t('content.copy'); }, 1500);
    }
  });

  container.appendChild(btn);
  buttonMap.set(pre, btn);
}

function* getTrackedButtons(): Generator<HTMLElement> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const btn = buttonMap.get(pre);
    if (btn) yield btn;
  }
}
