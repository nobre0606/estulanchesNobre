import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Dois projetos: unitário (sem banco) e integração (Postgres real)
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/setup-env.ts'],
          // Os arquivos compartilham o mesmo banco: rodam um de cada vez
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // Meta da RNF06: pelo menos 70% na camada de domínio e serviços
      include: ['src/domain/**/*.ts', 'src/modules/**/service.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
