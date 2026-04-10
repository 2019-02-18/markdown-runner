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

interface FeatureController {
  enable(): void;
  disable(): void;
  processBlock?(pre: HTMLElement): void;
}

let settings: Settings;
let pageEnabled = true;
const features = new Map<string, FeatureController>();
const processedBlocks: HTMLPreElement[] = [];

async function init(): Promise<void> {
  settings = await getSettings();
  await initI18n();

  features.set('copy', initCopy());
  features.set('languageLabel', initLanguageLabel());
  features.set('lineNumbers', initLineNumbers());
  features.set('collapse', initCollapse(settings));
  features.set('runner', initRunner(settings));
  features.set('diff', initDiff(settings));
  features.set('toc', initToc());
  features.set('progressBar', initProgressBar());

  applySettings();

  observeCodeBlocks((pre) => {
    processedBlocks.push(pre as HTMLPreElement);
    for (const [name, controller] of features) {
      if (settings.features[name as keyof typeof settings.features] && controller.processBlock) {
        controller.processBlock(pre);
      }
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
    const featureKey = name as keyof typeof settings.features;
    const enabled = settings.globalEnabled && pageEnabled && settings.features[featureKey];
    if (enabled) {
      controller.enable();
    } else {
      controller.disable();
    }
  }
}

init();
