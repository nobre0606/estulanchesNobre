// Roda UMA vez antes dos testes de integração: aplica as migrations no banco de teste.
import { execSync } from 'node:child_process';

export default function setup() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida. Rode com: docker compose --profile test run --rm tests');
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
