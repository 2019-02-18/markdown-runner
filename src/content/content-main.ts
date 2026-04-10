import { getSettings, onSettingsChanged } from '@shared/storage';
import { onMessage } from '@shared/messaging';
import { initI18n } from '@shared/i18n';
import type { BackgroundMessage, Settings, BlockCountResponse } from '@shared/types';
import { observeCodeBlocks } from './utils/observer';
import { initCopy } from './features/copy';
import { initLanguageLabel } from './features/language-label';
import { initLineNumbers } from './features/line-numbers';
import { initCollapse } from './features/collapse';
import { initRunner } from './features/runner';
import { initDiff } from './features/diff';
import { initToc } from './features/toc';
import { initProgressBar } from './features/progress-bar';
import { initMultiRun } from './features/multi-run';
import { initMermaidRenderer } from './features/mermaid-render';
import { initJsonPreview } from './features/json-preview';

interface FeatureController {
  enable(): void;
  disable(): void;
  processBlock?(pre: HTMLElement): void;
}

const RUNNER_SUB_FEATURES = new Set(['multiRun', 'mermaid', 'jsonPreview']);

let settings: Settings;
let pageEnabled = true;
const features = new Map<string, FeatureController>();
const processedBlocks: HTMLPreElement[] = [];

function isSiteAllowed(s: Settings): boolean {
  const host = location.hostname;
  const inList = s.siteList.some((pattern) =>
    host === pattern || host.endsWith(`.${pattern}`),
  );
  return s.siteListMode === 'blacklist' ? !inList : inList;
}

async function init(): Promise<void> {
  settings = await getSettings();

  if (!isSiteAllowed(settings)) return;

  await initI18n();

  features.set('copy', initCopy());
  features.set('languageLabel', initLanguageLabel());
  features.set('lineNumbers', initLineNumbers());
  features.set('collapse', initCollapse(settings));
  features.set('runner', initRunner(settings));
  features.set('diff', initDiff(settings));
  features.set('toc', initToc());
  features.set('progressBar', initProgressBar());
  features.set('multiRun', initMultiRun());
  features.set('mermaid', initMermaidRenderer());
  features.set('jsonPreview', initJsonPreview());

  applySettings();

  observeCodeBlocks((pre) => {
    processedBlocks.push(pre as HTMLPreElement);
    for (const [name, controller] of features) {
      if (!controller.processBlock) continue;
      const enabled = RUNNER_SUB_FEATURES.has(name)
        ? settings.features.runner
        : settings.features[name as keyof typeof settings.features];
      if (enabled) controller.processBlock(pre);
    }
  });

  onSettingsChanged((newSettings) => {
    settings = newSettings;
    applySettings();
  });

  onMessage<BackgroundMessage>((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'GET_BLOCK_COUNT':
        sendResponse({ count: processedBlocks.length } satisfies BlockCountResponse);
        return;
      case 'UPDATE_SETTINGS':
        settings = message.payload;
        applySettings();
        return;
      case 'PAGE_ENABLED_CHANGED':
        pageEnabled = message.payload.enabled;
        applySettings();
        return;
    }
  });
}

function applySettings(): void {
  for (const [name, controller] of features) {
    const isSubFeature = RUNNER_SUB_FEATURES.has(name);
    const featureKey = isSubFeature ? 'runner' : name as keyof typeof settings.features;
    const enabled = settings.globalEnabled && pageEnabled && settings.features[featureKey];
    if (enabled) {
      controller.enable();
    } else {
      controller.disable();
    }
  }
}

init();
