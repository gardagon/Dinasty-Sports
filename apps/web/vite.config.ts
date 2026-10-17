import { defineConfig } from 'vite';

// base relativa: funciona igual en GitHub Pages, en local y empaquetado para móvil (Capacitor).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2022' },
});
