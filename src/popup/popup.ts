import { sendToBackground } from '@shared/messaging';
import { initI18n, t } from '@shared/i18n';
import { applyTheme, watchSystemTheme } from '@shared/theme';
import type { StatusResponse, FeatureName } from '@shared/types';

async function init(): Promise<void> {
  await initI18n();
  applyTranslations();

  const status = await sendToBackground<StatusResponse>({ type: 'GET_STATUS' });
  if (!status) return;

  applyTheme(status.settings.theme);
  watchSystemTheme(status.settings.theme);

  const globalToggle = document.getElementById('globalToggle') as HTMLInputElement;
  const statusDot = document.getElementById('statusDot')!;
  const statusText = document.getElementById('statusText')!;
  const blockCount = document.getElementById('blockCount')!;

  globalToggle.checked = status.settings.globalEnabled;
  updateStatus(status.pageEnabled && status.settings.globalEnabled);

  blockCount.textContent = status.blockCount > 0
    ? t('popup.blocksDetected', { count: status.blockCount })
    : t('popup.noBlocks');

  for (const [feature, enabled] of Object.entries(status.settings.features)) {
    const toggle = document.querySelector<HTMLInputElement>(
      `[data-feature-toggle="${feature}"]`,
    );
    if (toggle) toggle.checked = enabled;
  }

  globalToggle.addEventListener('change', async () => {
    await sendToBackground({ type: 'TOGGLE_GLOBAL', payload: { enabled: globalToggle.checked } });
    updateStatus(globalToggle.checked);
  });

  const featureToggles = document.querySelectorAll<HTMLInputElement>('[data-feature-toggle]');
  for (const toggle of featureToggles) {
    toggle.addEventListener('change', async () => {
      const feature = toggle.dataset.featureToggle as FeatureName;
      await sendToBackground({
        type: 'TOGGLE_FEATURE',
        payload: { feature, enabled: toggle.checked },
      });
    });
  }

  document.getElementById('btnSettings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btnFeedback')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://github.com/2019-02-18/markdown-runner/issues',
    });
  });

  function updateStatus(enabled: boolean): void {
    statusDot.className = `status-dot ${enabled ? 'active' : 'inactive'}`;
    statusText.textContent = `${t('popup.currentPage')}: ${enabled ? t('popup.activated') : t('popup.deactivated')}`;
  }
}

function applyTranslations(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-i18n]');
  for (const el of elements) {
    const key = el.dataset.i18n!;
    el.textContent = t(key);
  }
}

init();
