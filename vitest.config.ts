import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'modules/*/src/**/*.test.ts', 'sim/src/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Crear una partida cuesta ~0,5 s (la historia de los niños, ver `docs/MISMAS_REGLAS.md`) y varios tests crean decenas.
    testTimeout: 15000,
  },
});
