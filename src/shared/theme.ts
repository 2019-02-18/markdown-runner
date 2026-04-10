import type { ThemeMode } from './types';

const mql = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

export function applyTheme(mode: ThemeMode): void {
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && !!mql?.matches);

  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export function watchSystemTheme(mode: ThemeMode): void {
  if (!mql) return;
  mql.addEventListener('change', () => {
    if (mode === 'system') applyTheme('system');
  });
}
