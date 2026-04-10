import type { Settings } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEY } from './constants';

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    features: {
      ...DEFAULT_SETTINGS.features,
      ...stored.features,
    },
  };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  const merged: Settings = {
    ...current,
    ...settings,
    features: {
      ...current.features,
      ...(settings.features ?? {}),
    },
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: merged });
}

export function onSettingsChanged(
  callback: (newSettings: Settings, oldSettings: Settings) => void,
): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[STORAGE_KEY]) return;
    const oldValue = changes[STORAGE_KEY].oldValue as Settings | undefined;
    const newValue = changes[STORAGE_KEY].newValue as Settings | undefined;
    if (newValue) {
      callback(
        { ...DEFAULT_SETTINGS, ...newValue, features: { ...DEFAULT_SETTINGS.features, ...newValue.features } },
        oldValue
          ? { ...DEFAULT_SETTINGS, ...oldValue, features: { ...DEFAULT_SETTINGS.features, ...oldValue.features } }
          : DEFAULT_SETTINGS,
      );
    }
  });
}
