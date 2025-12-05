import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    setupFiles: ['./tests/e2e/setup.ts'],
    // Ejecutar tests E2E en serie para evitar conflictos de base de datos
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './src/domain'),
      '@application': path.resolve(__dirname, './src/application'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@composition': path.resolve(__dirname, './src/composition'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
