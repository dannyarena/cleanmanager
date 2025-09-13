import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 15000,
    hookTimeout: 15000,
    teardownTimeout: 15000,
    // Isolamento dei test per evitare interferenze tra tenant
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    // Configurazione coverage per sicurezza multi-tenant
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        'prisma/**'
      ],
      include: [
        'src/**/*.ts'
      ],
      // Target di copertura per sicurezza multi-tenant
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Soglie più alte per moduli critici di sicurezza
        'src/auth/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/middleware/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});