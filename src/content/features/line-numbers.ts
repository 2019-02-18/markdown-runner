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

function injectLineNumbers(pre: HTMLElement): void {
  if (lineNumMap.has(pre)) return;

  const code = extractCleanCode(pre);
  const lineCount = code.split('\n').length;
  if (lineCount < 2) return;

  pre.style.position = 'relative';
  pre.style.paddingLeft = '3.5em';

  const gutter = document.createElement('div');
  gutter.className = LINE_NUM_CLASS;

  Object.assign(gutter.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '3em',
    height: '100%',
    paddingTop: getComputedStyle(pre).paddingTop,
    paddingBottom: getComputedStyle(pre).paddingBottom,
    textAlign: 'right',
    fontFamily: 'monospace',
    fontSize: getComputedStyle(pre).fontSize,
    lineHeight: getComputedStyle(pre).lineHeight,
    color: 'rgba(128,128,128,0.5)',
    borderRight: '1px solid rgba(128,128,128,0.2)',
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
