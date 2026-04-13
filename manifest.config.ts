import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extensionName__',
  description: '__MSG_extensionDescription__',
  version: '1.0.0',
  default_locale: 'en',
  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  permissions: [
    'activeTab',
    'storage',
  ],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/sw.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content-main.ts'],
      css: ['src/content/styles/content.css'],
      run_at: 'document_idle',
    },
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
    },
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  sandbox: {
    pages: ['src/sandbox/sandbox.html'],
  },
  web_accessible_resources: [
    {
      matches: ['<all_urls>'],
      resources: ['src/sandbox/sandbox.html'],
    },
  ],
});
