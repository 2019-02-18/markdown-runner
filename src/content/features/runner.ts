import { detectLanguage, extractCleanCode, generateBlockId } from '../utils/dom';
import { t } from '@shared/i18n';
import { RUNNABLE_LANGUAGES } from '@shared/constants';
import type { Settings, ExecutionResult, OutputEntry } from '@shared/types';

interface RunnerState {
  btn: HTMLElement;
  outputPanel: HTMLElement;
  iframe: HTMLIFrameElement | null;
}

const runnerMap = new WeakMap<HTMLElement, RunnerState>();
let sandboxUrl: string;
let timeout = 5;

export function initRunner(settings: Settings) {
  sandboxUrl = chrome.runtime.getURL('src/sandbox/sandbox.html');
  timeout = settings.executionTimeout;

  return {
    enable() {
      for (const state of getTrackedStates()) {
        state.btn.style.display = '';
      }
    },
    disable() {
      for (const state of getTrackedStates()) {
        state.btn.style.display = 'none';
        state.outputPanel.style.display = 'none';
      }
    },
    processBlock(pre: HTMLElement) {
      injectRunButton(pre);
    },
  };
}

function injectRunButton(pre: HTMLElement): void {
  if (runnerMap.has(pre)) return;

  const lang = detectLanguage(pre);
  if (!lang || !RUNNABLE_LANGUAGES.has(lang)) return;

  pre.style.position = 'relative';

  const btn = document.createElement('button');
  btn.textContent = `▶ ${t('content.run')}`;

  Object.assign(btn.style, {
    position: 'absolute',
    top: '8px',
    right: '70px',
    padding: '4px 10px',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(76,175,80,0.4)',
    borderRadius: '4px',
    background: 'rgba(76,175,80,0.1)',
    color: '#4CAF50',
    cursor: 'pointer',
    opacity: '0',
    transition: 'opacity 0.2s',
    zIndex: '10',
  });

  pre.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  pre.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });

  const outputPanel = document.createElement('div');
  Object.assign(outputPanel.style, {
    display: 'none',
    margin: '0',
    padding: '10px 14px',
    fontSize: '13px',
    fontFamily: 'monospace',
    background: 'rgba(0,0,0,0.03)',
    borderTop: '1px solid rgba(128,128,128,0.2)',
    borderRadius: '0 0 6px 6px',
    maxHeight: '300px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  });

  const state: RunnerState = { btn, outputPanel, iframe: null };
  runnerMap.set(pre, state);

  btn.addEventListener('click', () => executeCode(pre, state));

  pre.appendChild(btn);
  pre.insertAdjacentElement('afterend', outputPanel);
}

function executeCode(pre: HTMLElement, state: RunnerState): void {
  const lang = detectLanguage(pre) ?? 'javascript';
  const code = extractCleanCode(pre);
  const id = generateBlockId();

  state.btn.textContent = `⏳ ${t('content.running')}`;
  state.btn.style.opacity = '1';
  state.outputPanel.style.display = 'block';
  state.outputPanel.innerHTML = '';

  if (lang === 'html' || lang === 'css') {
    executeHtmlCss(code, lang, state);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.src = sandboxUrl;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  state.iframe = iframe;

  const timeoutId = setTimeout(() => {
    cleanup(state);
    appendOutput(state.outputPanel, {
      type: 'error',
      args: [t('content.executionTimeout', { seconds: timeout })],
    });
    state.btn.textContent = `▶ ${t('content.run')}`;
  }, timeout * 1000);

  function onMessage(event: MessageEvent) {
    if (event.source !== iframe.contentWindow) return;
    const data = event.data;
    if (data?.type !== 'EXECUTION_RESULT' || data.payload?.id !== id) return;

    clearTimeout(timeoutId);
    window.removeEventListener('message', onMessage);

    const result: ExecutionResult = data.payload;
    for (const entry of result.output) {
      appendOutput(state.outputPanel, entry);
    }
    if (result.error) {
      appendOutput(state.outputPanel, { type: 'error', args: [result.error] });
    }

    cleanup(state);
    state.btn.textContent = `▶ ${t('content.run')}`;
  }

  window.addEventListener('message', onMessage);

  iframe.addEventListener('load', () => {
    iframe.contentWindow?.postMessage(
      { type: 'EXECUTE_CODE', payload: { code, lang, id } },
      '*',
    );
  });
}

function executeHtmlCss(code: string, lang: string, state: RunnerState): void {
  state.outputPanel.innerHTML = '';

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    width: '100%',
    minHeight: '120px',
    border: 'none',
    borderRadius: '4px',
    background: '#fff',
  });
  iframe.sandbox.add('allow-scripts');

  const content = lang === 'css'
    ? `<style>${code}</style><div class="preview">CSS Preview</div>`
    : code;

  iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${content}</body></html>`;

  iframe.addEventListener('load', () => {
    const height = iframe.contentDocument?.body?.scrollHeight;
    if (height) iframe.style.height = `${Math.min(height + 20, 500)}px`;
  });

  state.outputPanel.appendChild(iframe);
  state.outputPanel.style.display = 'block';
  state.btn.textContent = `▶ ${t('content.run')}`;
}

function appendOutput(panel: HTMLElement, entry: OutputEntry): void {
  const line = document.createElement('div');
  line.textContent = entry.args.join(' ');

  const colorMap: Record<string, string> = {
    error: '#e53935',
    warn: '#f57f17',
    info: '#1565c0',
    log: 'inherit',
    result: '#388e3c',
  };
  line.style.color = colorMap[entry.type] ?? 'inherit';
  if (entry.type === 'error') line.style.fontWeight = 'bold';

  panel.appendChild(line);
}

function cleanup(state: RunnerState): void {
  if (state.iframe) {
    state.iframe.remove();
    state.iframe = null;
  }
}

function* getTrackedStates(): Generator<RunnerState> {
  const pres = document.querySelectorAll<HTMLElement>('pre');
  for (const pre of pres) {
    const state = runnerMap.get(pre);
    if (state) yield state;
  }
}
