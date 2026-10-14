import { defineConfig } from 'vite';

// Relative base so the build works from any URL (GitHub Pages subpath, a folder, etc.).
export default defineConfig({
  base: './',
  // The background-removal library is loaded on demand in its own chunk, so it is allowed to be big.
  build: { chunkSizeWarningLimit: 700 },
});
