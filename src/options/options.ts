import { getSettings, saveSettings } from '@shared/storage';
import { initI18n, t, setLocale } from '@shared/i18n';
import { applyTheme, watchSystemTheme } from '@shared/theme';
import type { Settings, LocaleKey, ThemeMode, DiffViewMode, SiteListMode } from '@shared/types';

let currentSettings: Settings;

async function init(): Promise<void> {
  currentSettings = await getSettings();
  await initI18n();
  applyTranslations();
  applyTheme(currentSettings.theme);
  watchSystemTheme(currentSettings.theme);
  bindTabs();
  populateSettings();
  bindSettingsEvents();
}

function bindTabs(): void {
  const navItems = document.querySelectorAll<HTMLElement>('.nav-item');
  const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

  for (const item of navItems) {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab!;
      navItems.forEach((n) => n.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(`tab-${tabId}`)?.classList.add('active');
    });
  }
}

function populateSettings(): void {
  (document.getElementById('optGlobalEnabled') as HTMLInputElement).checked = currentSettings.globalEnabled;
  (document.getElementById('optLanguage') as HTMLSelectElement).value = currentSettings.language;
  (document.getElementById('optTheme') as HTMLSelectElement).value = currentSettings.theme;
  (document.getElementById('optFoldThreshold') as HTMLInputElement).value = String(currentSettings.foldThreshold);
  (document.getElementById('optExecutionTimeout') as HTMLInputElement).value = String(currentSettings.executionTimeout);
  (document.getElementById('optDiffViewMode') as HTMLSelectElement).value = currentSettings.diffViewMode;
  (document.getElementById('optSiteListMode') as HTMLSelectElement).value = currentSettings.siteListMode;

  renderSiteList();
}

function bindSettingsEvents(): void {
  bindToggle('optGlobalEnabled', (v) => save({ globalEnabled: v }));

  bindSelect('optLanguage', (v) => {
    setLocale(v as LocaleKey);
    applyTranslations();
    save({ language: v as LocaleKey });
  });

  bindSelect('optTheme', (v) => {
    applyTheme(v as ThemeMode);
    save({ theme: v as ThemeMode });
  });
  bindNumber('optFoldThreshold', (v) => save({ foldThreshold: v }));
  bindNumber('optExecutionTimeout', (v) => save({ executionTimeout: v }));
  bindSelect('optDiffViewMode', (v) => save({ diffViewMode: v as DiffViewMode }));
  bindSelect('optSiteListMode', (v) => save({ siteListMode: v as SiteListMode }));

  document.getElementById('btnAddSite')?.addEventListener('click', addSite);
  document.getElementById('newSiteInput')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') addSite();
  });
}

function addSite(): void {
  const input = document.getElementById('newSiteInput') as HTMLInputElement;
  const site = input.value.trim();
  if (!site) return;

  if (!currentSettings.siteList.includes(site)) {
    currentSettings.siteList.push(site);
    save({ siteList: [...currentSettings.siteList] });
    renderSiteList();
  }
  input.value = '';
}

function removeSite(site: string): void {
  currentSettings.siteList = currentSettings.siteList.filter((s) => s !== site);
  save({ siteList: [...currentSettings.siteList] });
  renderSiteList();
}

function renderSiteList(): void {
  const list = document.getElementById('siteList')!;
  list.innerHTML = '';

  for (const site of currentSettings.siteList) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = site;

    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.textContent = t('options.siteManagement.removeSite');
    btn.addEventListener('click', () => removeSite(site));

    li.append(span, btn);
    list.appendChild(li);
  }
}

async function save(partial: Partial<Settings>): Promise<void> {
  Object.assign(currentSettings, partial);
  await saveSettings(partial);
}

function bindToggle(id: string, onChange: (value: boolean) => void): void {
  const el = document.getElementById(id) as HTMLInputElement;
  el?.addEventListener('change', () => onChange(el.checked));
}

function bindSelect(id: string, onChange: (value: string) => void): void {
  const el = document.getElementById(id) as HTMLSelectElement;
  el?.addEventListener('change', () => onChange(el.value));
}

function bindNumber(id: string, onChange: (value: number) => void): void {
  const el = document.getElementById(id) as HTMLInputElement;
  el?.addEventListener('change', () => onChange(Number(el.value)));
}

function applyTranslations(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-i18n]');
  for (const el of elements) {
    el.textContent = t(el.dataset.i18n!);
  }
  const placeholders = document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]');
  for (const el of placeholders) {
    el.placeholder = t(el.dataset.i18nPlaceholder!);
  }
}

init();
