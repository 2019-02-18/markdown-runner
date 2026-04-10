import { countLines } from '../utils/dom';
import { t } from '@shared/i18n';
import type { Settings } from '@shared/types';

interface CollapseState {
  pre: HTMLElement;
  container: HTMLElement;
  overlay: HTMLElement;
  btn: HTMLElement;
  originalMaxHeight: string;
  collapsed: boolean;
  totalLines: number;
}

const collapseMap = new WeakMap<HTMLElement, CollapseState>();

export function initCollapse(settings: Settings) {
  let threshold = settings.foldThreshold;

  return {
    enable() {
      for (const state of getTrackedStates()) {
        if (state.totalLines > threshold && state.collapsed) {
          state.container.style.maxHeight = state.originalMaxHeight;
          state.overlay.style.display = '';
          state.btn.style.display = '';
        }
      }
    },
    disable() {
      for (const state of getTrackedStates()) {
        state.overlay.style.display = 'none';
        state.btn.style.display = 'none';
        expandBlock(state);
      }
    },
    processBlock(pre: HTMLElement) {
      injectCollapse(pre, threshold);
    },
  };
}

function getPreBackground(pre: HTMLElement): string {
  const bg = getComputedStyle(pre).backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;

  const parent = pre.parentElement;
  if (parent) {
    const pbg = getComputedStyle(parent).backgroundColor;
    if (pbg && pbg !== 'rgba(0, 0, 0, 0)' && pbg !== 'transparent') return pbg;
  }

  return '#f6f8fa';
}

function injectCollapse(pre: HTMLElement, threshold: number): void {
  if (collapseMap.has(pre)) return;

  const totalLines = countLines(pre);
  if (totalLines <= threshold) return;

  const lineHeight = parseFloat(getComputedStyle(pre).lineHeight) || 20;
  const paddingTop = parseFloat(getComputedStyle(pre).paddingTop) || 16;
  const visibleLines = Math.min(10, Math.floor(threshold / 2));
  const collapsedHeight = `${visibleLines * lineHeight + paddingTop + 16}px`;
  const bgColor = getPreBackground(pre);

  const container = pre.parentElement?.classList.contains('highlight')
    ? pre.parentElement as HTMLElement
    : pre;

  container.style.overflow = 'hidden';
  container.style.maxHeight = collapsedHeight;
  container.style.position = 'relative';
  container.style.transition = 'max-height 0.3s ease';
  container.style.marginBottom = '0';

  if (container !== pre) {
    pre.style.overflow = 'hidden';
    pre.style.maxHeight = 'none';
  }

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '80px',
    background: `linear-gradient(to bottom, transparent, ${bgColor})`,
    pointerEvents: 'none',
    zIndex: '5',
  });
  container.appendChild(overlay);

  const hiddenLines = totalLines - visibleLines;
  const btn = document.createElement('button');
  btn.textContent = `▾ ${t('content.showMore', { count: hiddenLines })}`;

  Object.assign(btn.style, {
    display: 'block',
    width: '100%',
    padding: '6px 16px',
    margin: '0',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '500',
    border: `1px solid rgba(128,128,128,0.15)`,
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    background: bgColor,
    color: '#57606a',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background 0.15s',
    marginTop: '-1px',
    boxSizing: 'border-box',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(128,128,128,0.08)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = bgColor;
  });

  const state: CollapseState = {
    pre,
    container,
    overlay,
    btn,
    originalMaxHeight: collapsedHeight,
    collapsed: true,
    totalLines,
  };

  btn.addEventListener('click', () => {
    if (state.collapsed) {
      expandBlock(state);
    } else {
      collapseBlock(state);
    }
  });

  container.insertAdjacentElement('afterend', btn);
  collapseMap.set(pre, state);
}

function expandBlock(state: CollapseState): void {
  state.container.style.maxHeight = 'none';
  state.container.style.overflow = '';
  if (state.container !== state.pre) {
    state.pre.style.overflow = '';
  }
  state.overlay.style.display = 'none';
  state.btn.textContent = `▴ ${t('content.showLess')}`;
  state.collapsed = false;
}

function collapseBlock(state: CollapseState): void {
  state.container.style.maxHeight = state.originalMaxHeight;
  state.container.style.overflow = 'hidden';
  if (state.container !== state.pre) {
    state.pre.style.overflow = 'hidden';
  }
  state.overlay.style.display = '';
  const hiddenLines = state.totalLines - 10;
  state.btn.textContent = `▾ ${t('content.showMore', { count: hiddenLines })}`;
  state.collapsed = true;
  state.container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function* getTrackedStates(): Generator<CollapseState> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const state = collapseMap.get(pre);
    if (state) yield state;
  }
}
