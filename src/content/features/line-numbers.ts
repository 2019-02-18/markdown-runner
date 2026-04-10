import { extractCleanCode } from '../utils/dom';

const LINE_NUM_CLASS = 'mr-line-numbers';
const lineNumMap = new WeakMap<HTMLElement, HTMLElement>();

export function initLineNumbers() {
  return {
    enable() {
      for (const el of getTrackedElements()) {
        el.style.display = '';
      }
    },
    disable() {
      for (const el of getTrackedElements()) {
        el.style.display = 'none';
      }
    },
    processBlock(pre: HTMLElement) {
      injectLineNumbers(pre);
    },
  };
}

function hasExistingLineNumbers(pre: HTMLElement): boolean {
  return !!(
    pre.querySelector('.linenumber, .line-number, .hljs-ln-numbers, [data-line-number]') ||
    pre.querySelector('td.blob-num') ||
    pre.closest('.highlight')?.querySelector('.blob-num')
  );
}

function injectLineNumbers(pre: HTMLElement): void {
  if (lineNumMap.has(pre)) return;
  if (hasExistingLineNumbers(pre)) return;

  const code = extractCleanCode(pre);
  const lineCount = code.split('\n').length;
  if (lineCount < 2) return;

  const existingPadding = parseFloat(getComputedStyle(pre).paddingLeft) || 16;
  pre.style.position = 'relative';
  pre.style.paddingLeft = `${existingPadding + 32}px`;

  const gutter = document.createElement('div');
  gutter.className = LINE_NUM_CLASS;

  Object.assign(gutter.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${existingPadding + 28}px`,
    height: '100%',
    paddingTop: getComputedStyle(pre).paddingTop,
    paddingBottom: getComputedStyle(pre).paddingBottom,
    textAlign: 'right',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: getComputedStyle(pre).fontSize,
    lineHeight: getComputedStyle(pre).lineHeight,
    color: 'rgba(128,128,128,0.4)',
    userSelect: 'none',
    pointerEvents: 'none',
    overflow: 'hidden',
    boxSizing: 'border-box',
  });

  const lines = Array.from({ length: lineCount }, (_, i) =>
    `<div style="padding-right:8px">${i + 1}</div>`,
  ).join('');
  gutter.innerHTML = lines;

  pre.appendChild(gutter);
  lineNumMap.set(pre, gutter);
}

function* getTrackedElements(): Generator<HTMLElement> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const el = lineNumMap.get(pre);
    if (el) yield el;
  }
}
