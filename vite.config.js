import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: '/message-relay-client/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
