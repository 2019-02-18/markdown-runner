import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import manifest from './manifest.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@content': resolve(__dirname, 'src/content'),
      '@locales': resolve(__dirname, 'src/locales'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
});
