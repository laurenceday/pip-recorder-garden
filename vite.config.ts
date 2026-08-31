import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    modulePreload: { polyfill: false },
    outDir: 'dist',
    sourcemap: false,
  },
});
