import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';
import { getSettings } from './storage';

type LocaleMessages = typeof en;
type LocaleKey = 'en' | 'zh-CN';

const locales: Record<LocaleKey, LocaleMessages> = {
  'en': en,
  'zh-CN': zhCN,
};

let currentLocale: LocaleKey = 'en';
let currentMessages: LocaleMessages = en;

export async function initI18n(): Promise<void> {
  const settings = await getSettings();
  setLocale(settings.language);
}

export function setLocale(locale: LocaleKey): void {
  currentLocale = locale;
  currentMessages = locales[locale] ?? en;
}

export function getLocale(): LocaleKey {
  return currentLocale;
}

/**
 * Translate a dot-separated key path, e.g. "popup.title" or "content.copy".
 * Supports {{variable}} interpolation.
 */
export function t(keyPath: string, vars?: Record<string, string | number>): string {
  const keys = keyPath.split('.');
  let result: unknown = currentMessages;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return keyPath;
    }
  }

  if (typeof result !== 'string') return keyPath;

  if (vars) {
    return result.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      String(vars[name] ?? `{{${name}}}`),
    );
  }

  return result;
}
