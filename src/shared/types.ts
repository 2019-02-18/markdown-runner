/** Names of all toggleable features */
export type FeatureName =
  | 'runner'
  | 'copy'
  | 'collapse'
  | 'languageLabel'
  | 'lineNumbers'
  | 'diff'
  | 'toc'
  | 'progressBar';

export type ThemeMode = 'light' | 'dark' | 'system';
export type DiffViewMode = 'side-by-side' | 'inline';
export type SiteListMode = 'whitelist' | 'blacklist';
export type LocaleKey = 'en' | 'zh-CN';

/** Persisted user settings (chrome.storage.sync) */
export interface Settings {
  globalEnabled: boolean;
  language: LocaleKey;
  theme: ThemeMode;

  features: Record<FeatureName, boolean>;

  foldThreshold: number;
  executionTimeout: number;
  diffViewMode: DiffViewMode;

  siteListMode: SiteListMode;
  siteList: string[];
}

/** Messages between Popup ↔ Background */
export type PopupMessage =
  | { type: 'GET_STATUS' }
  | { type: 'TOGGLE_FEATURE'; payload: { feature: FeatureName; enabled: boolean } }
  | { type: 'TOGGLE_GLOBAL'; payload: { enabled: boolean } }
  | { type: 'TOGGLE_PAGE'; payload: { enabled: boolean } };

export interface StatusResponse {
  settings: Settings;
  blockCount: number;
  pageEnabled: boolean;
}

/** Messages between Background ↔ Content Script */
export type BackgroundMessage =
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'GET_BLOCK_COUNT' }
  | { type: 'PAGE_ENABLED_CHANGED'; payload: { enabled: boolean } };

export interface BlockCountResponse {
  count: number;
}

/** Messages between Content Script ↔ Sandbox iframe */
export type SandboxMessage =
  | { type: 'EXECUTE_CODE'; payload: { code: string; lang: string; id: string } }
  | { type: 'EXECUTION_RESULT'; payload: ExecutionResult };

export interface ExecutionResult {
  id: string;
  output: OutputEntry[];
  error?: string;
  timedOut?: boolean;
}

export interface OutputEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'result';
  args: string[];
}
