import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base: './' — относительные пути, сборка работает на любом хостинге и в подпапке
export default defineConfig({
  base: './',
  plugins: [vue()],
  test: { environment: 'jsdom' },
});
