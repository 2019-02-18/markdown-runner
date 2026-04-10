import { detectLanguage, extractCleanCode, generateBlockId, getCodeBlockContainer } from '../utils/dom';
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

  const container = getCodeBlockContainer(pre);
  container.style.position = 'relative';

  const btn = document.createElement('button');
  btn.textContent = `▶ ${t('content.run')}`;

  Object.assign(btn.style, {
    position: 'absolute',
    top: '6px',
    right: '60px',
    padding: '3px 8px',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(76,175,80,0.4)',
    borderRadius: '4px',
    background: 'rgba(76,175,80,0.1)',
    color: '#2ea44f',
    cursor: 'pointer',
    opacity: '0',
    transition: 'opacity 0.15s',
    zIndex: '20',
    lineHeight: '1.4',
  });

  container.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  container.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });

  const outputPanel = document.createElement('div');
  Object.assign(outputPanel.style, {
    display: 'none',
    margin: '4px 0 8px',
    padding: '10px 14px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    background: '#1e1e1e',
    color: '#d4d4d4',
    border: '1px solid rgba(128,128,128,0.2)',
    borderRadius: '6px',
    maxHeight: '300px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  });

  const outputLabel = document.createElement('div');
  outputLabel.textContent = '▸ Output';
  Object.assign(outputLabel.style, {
    fontSize: '11px',
    fontWeight: '600',
    color: '#888',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  });
  outputPanel.prepend(outputLabel);

  const state: RunnerState = { btn, outputPanel, iframe: null };
  runnerMap.set(pre, state);

  btn.addEventListener('click', () => executeCode(pre, state));

  container.appendChild(btn);
  container.insertAdjacentElement('afterend', outputPanel);
}

function executeCode(pre: HTMLElement, state: RunnerState): void {
  const lang = detectLanguage(pre) ?? 'javascript';
  const code = extractCleanCode(pre);
  const id = generateBlockId();

  state.btn.textContent = `⏳ ${t('content.running')}`;
  state.btn.style.opacity = '1';
  state.outputPanel.style.display = 'block';

  const outputLabel = state.outputPanel.querySelector('div');
  state.outputPanel.innerHTML = '';
  if (outputLabel) state.outputPanel.appendChild(outputLabel);

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
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    width: '100%',
    minHeight: '100px',
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
  state.btn.textContent = `▶ ${t('content.run')}`;
}

function appendOutput(panel: HTMLElement, entry: OutputEntry): void {
  const line = document.createElement('div');
  line.textContent = entry.args.join(' ');

  const colorMap: Record<string, string> = {
    error: '#f48771',
    warn: '#cca700',
    info: '#6cb6ff',
    log: '#d4d4d4',
    result: '#73c991',
  };
  line.style.color = colorMap[entry.type] ?? '#d4d4d4';
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
