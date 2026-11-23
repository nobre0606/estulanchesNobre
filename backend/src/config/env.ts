// Valida as variáveis de ambiente na inicialização ("falha rápido").
// Se faltar algo ou o JWT_SECRET for fraco, o processo nem sobe — melhor do que
// descobrir o problema na primeira requisição em produção.
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().startsWith('postgresql://', 'DATABASE_URL precisa começar com postgresql://'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_LOGIN: z.coerce.number().int().positive().default(5),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Pasta com o build do front (dentro da imagem: /app/public)
  PUBLIC_DIR: z.string().default('public'),
});

export type Env = z.infer<typeof envSchema>;

function carregarEnv(): Env {
  const resultado = envSchema.safeParse(process.env);
  if (!resultado.success) {
    console.error('Configuração inválida — confira o arquivo .env:');
    for (const issue of resultado.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return resultado.data;
}

export const env = carregarEnv();
