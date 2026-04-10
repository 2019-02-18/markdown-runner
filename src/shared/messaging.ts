import type {
  PopupMessage,
  BackgroundMessage,
  StatusResponse,
  BlockCountResponse,
} from './types';

/** Send a message from Popup to Background and get a typed response */
export function sendToBackground<T = unknown>(message: PopupMessage): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

/** Send a message from Background to a specific tab's Content Script */
export async function sendToContentScript<T = unknown>(
  tabId: number,
  message: BackgroundMessage,
): Promise<T | undefined> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return undefined;
  }
}

/** Listen for messages in Background or Content Script */
export function onMessage<M = PopupMessage | BackgroundMessage>(
  handler: (
    message: M,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => boolean | void,
): void {
  chrome.runtime.onMessage.addListener(handler as Parameters<typeof chrome.runtime.onMessage.addListener>[0]);
}
