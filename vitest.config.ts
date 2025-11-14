import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.config.ts', '**/*.d.ts'],
    },
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': __dirname + '/src',
      '@domain': __dirname + '/src/domain',
      '@application': __dirname + '/src/application',
      '@infrastructure': __dirname + '/src/infrastructure',
      '@shared': __dirname + '/src/shared',
      '@composition': __dirname + '/src/composition',
    },
  },
});
