import { onMessage, sendToContentScript } from '@shared/messaging';
import { getSettings, saveSettings } from '@shared/storage';
import { BADGE_COLOR } from '@shared/constants';
import type {
  PopupMessage,
  BackgroundMessage,
  StatusResponse,
  BlockCountResponse,
  Settings,
} from '@shared/types';

const disabledPages = new Set<number>();

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
});

onMessage<PopupMessage>((message, sender, sendResponse) => {
  handlePopupMessage(message, sender).then(sendResponse);
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  disabledPages.delete(tabId);
});

async function handlePopupMessage(
  message: PopupMessage,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  const settings = await getSettings();

  switch (message.type) {
    case 'GET_STATUS': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { settings, blockCount: 0, pageEnabled: true } satisfies StatusResponse;

      const pageEnabled = !disabledPages.has(tab.id);
      const countResp = await sendToContentScript<BlockCountResponse>(tab.id, { type: 'GET_BLOCK_COUNT' });

      return {
        settings,
        blockCount: countResp?.count ?? 0,
        pageEnabled,
      } satisfies StatusResponse;
    }

    case 'TOGGLE_FEATURE': {
      const { feature, enabled } = message.payload;
      await saveSettings({
        features: { ...settings.features, [feature]: enabled },
      });
      await broadcastSettingsToActiveTab();
      return { success: true };
    }

    case 'TOGGLE_GLOBAL': {
      await saveSettings({ globalEnabled: message.payload.enabled });
      await broadcastSettingsToActiveTab();
      return { success: true };
    }

    case 'TOGGLE_PAGE': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false };

      if (message.payload.enabled) {
        disabledPages.delete(tab.id);
      } else {
        disabledPages.add(tab.id);
      }

      await sendToContentScript(tab.id, {
        type: 'PAGE_ENABLED_CHANGED',
        payload: { enabled: message.payload.enabled },
      });
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

async function broadcastSettingsToActiveTab(): Promise<void> {
  const settings = await getSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await sendToContentScript(tab.id, { type: 'UPDATE_SETTINGS', payload: settings });
    updateBadge(tab.id);
  }
}

async function updateBadge(tabId: number): Promise<void> {
  const settings = await getSettings();
  const pageEnabled = !disabledPages.has(tabId);

  if (!settings.globalEnabled || !pageEnabled) {
    chrome.action.setBadgeText({ text: 'OFF', tabId });
    return;
  }

  const resp = await sendToContentScript<BlockCountResponse>(tabId, { type: 'GET_BLOCK_COUNT' });
  const count = resp?.count ?? 0;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '', tabId });
}
