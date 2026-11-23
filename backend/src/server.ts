// Ponto de entrada: só sobe o servidor. Toda a montagem fica em app.ts.
import { buildApp } from './app';
import { env } from './config/env';

async function iniciar() {
  const app = await buildApp();

  // Graceful shutdown: no "docker compose down/stop" o Docker manda SIGTERM;
  // fechamos conexões HTTP e com o banco antes de sair.
  for (const sinal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(sinal, async () => {
      app.log.info({ sinal }, 'encerrando servidor');
      await app.close();
      process.exit(0);
    });
  }

  try {
    // 0.0.0.0 = aceita conexões de fora do container
    await app.listen({ host: '0.0.0.0', port: env.PORT });
  } catch (erro) {
    app.log.fatal(erro, 'falha ao iniciar o servidor');
    process.exit(1);
  }
}

iniciar();
