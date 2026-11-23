// buildApp(): monta a aplicação (plugins + rotas) SEM abrir porta.
// Os testes de integração usam essa função com app.inject(), sem rede.
import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { env } from './config/env';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import { registrarErrorHandler } from './plugins/error-handler';
import authRoutes from './modules/auth/routes';
import categoriasRoutes from './modules/categorias/routes';
import produtosRoutes from './modules/produtos/routes';
import pedidosRoutes from './modules/pedidos/routes';

export async function buildApp() {
  const app = Fastify({
    // Logger pino nativo: JSON estruturado em produção, sem dados sensíveis
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: env.LOG_LEVEL,
            redact: {
              paths: ['req.headers.authorization', 'senha', 'senhaHash', 'token', '*.senha', '*.senhaHash', '*.token'],
              censor: '[OCULTO]',
            },
          },
    trustProxy: true,
  });

  registrarErrorHandler(app);

  // Segurança HTTP
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        // Sem HTTPS local: não forçar upgrade, senão quebra o acesso pelo IP da rede (celular)
        upgradeInsecureRequests: null,
      },
    },
    hsts: false,
  });
  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(rateLimit, { global: false }); // ligado só nas rotas que pedirem (login)

  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Todas as rotas da API ficam sob /api
  await app.register(
    async (api) => {
      // Saúde: usada pelo HEALTHCHECK do Docker. Testa de verdade a conexão com o banco.
      api.get('/health', async (_request, reply) => {
        try {
          await app.prisma.$queryRaw`SELECT 1`;
          return { status: 'ok', db: 'up' };
        } catch {
          return reply.status(503).send({ status: 'erro', db: 'down' });
        }
      });

      await api.register(authRoutes);
      await api.register(categoriasRoutes);
      await api.register(produtosRoutes);
      await api.register(pedidosRoutes);
    },
    { prefix: '/api' },
  );

  // Front-end React já compilado, servido pela própria API (uma imagem só)
  const pastaPublica = path.resolve(env.PUBLIC_DIR);
  const temFront = fs.existsSync(path.join(pastaPublica, 'index.html'));
  if (temFront) {
    await app.register(fastifyStatic, { root: pastaPublica, wildcard: false });
  }

  // Rota inexistente: em /api devolve 404 JSON; fora dela devolve o index.html (SPA)
  app.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api') && request.method === 'GET' && temFront) {
      return reply.type('text/html').sendFile('index.html');
    }
    return reply.status(404).send({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' } });
  });

  return app;
}
