import { countLines } from '../utils/dom';
import { t } from '@shared/i18n';
import type { Settings } from '@shared/types';

interface CollapseState {
  wrapper: HTMLElement;
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

function injectCollapse(pre: HTMLElement, threshold: number): void {
  if (collapseMap.has(pre)) return;

  const totalLines = countLines(pre);
  if (totalLines <= threshold) return;

  const lineHeight = parseFloat(getComputedStyle(pre).lineHeight) || 18;
  const visibleLines = Math.min(10, Math.floor(threshold / 2));
  const collapsedHeight = `${visibleLines * lineHeight + 24}px`;

  pre.style.overflow = 'hidden';
  pre.style.maxHeight = collapsedHeight;
  pre.style.position = 'relative';
  pre.style.transition = 'max-height 0.3s ease';

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '60px',
    background: 'linear-gradient(transparent, var(--mr-bg, #f6f8fa))',
    pointerEvents: 'none',
    zIndex: '5',
  });
  pre.appendChild(overlay);

  const hiddenLines = totalLines - visibleLines;
  const btn = document.createElement('button');
  btn.textContent = t('content.showMore', { count: hiddenLines });

  Object.assign(btn.style, {
    display: 'block',
    width: '100%',
    padding: '6px',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(128,128,128,0.2)',
    borderRadius: '0 0 6px 6px',
    background: 'rgba(128,128,128,0.05)',
    color: 'inherit',
    cursor: 'pointer',
    textAlign: 'center',
    marginTop: '-1px',
  });

  const state: CollapseState = {
    wrapper: pre,
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

  pre.insertAdjacentElement('afterend', btn);
  collapseMap.set(pre, state);
}

function expandBlock(state: CollapseState): void {
  state.wrapper.style.maxHeight = 'none';
  state.overlay.style.display = 'none';
  state.btn.textContent = t('content.showLess');
  state.collapsed = false;
}

function collapseBlock(state: CollapseState): void {
  state.wrapper.style.maxHeight = state.originalMaxHeight;
  state.overlay.style.display = '';
  const hiddenLines = state.totalLines - 10;
  state.btn.textContent = t('content.showMore', { count: hiddenLines });
  state.collapsed = true;
}

function* getTrackedStates(): Generator<CollapseState> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const state = collapseMap.get(pre);
    if (state) yield state;
  }
}
