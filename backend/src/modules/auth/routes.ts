import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { ErroApp } from '../../domain/erros';
import { loginSchema, registroSchema } from './schemas';
import * as service from './service';

export default async function authRoutes(app: FastifyInstance) {
  function gerarToken(usuario: { id: string; nome: string; papel: 'ADMIN' | 'ALUNO' }) {
    return app.jwt.sign({ sub: usuario.id, nome: usuario.nome, papel: usuario.papel });
  }

  app.post('/auth/register', async (request, reply) => {
    const dados = registroSchema.parse(request.body);
    const usuario = await service.registrar(app.prisma, dados);
    return reply.status(201).send({ token: gerarToken(usuario), usuario });
  });

  // Rate limit só no login: freio contra força bruta de senha
  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_LOGIN,
          timeWindow: '1 minute',
          errorResponseBuilder: () =>
            new ErroApp(429, 'MUITAS_TENTATIVAS', 'Muitas tentativas de login. Aguarde um minuto.'),
        },
      },
    },
    async (request) => {
      const dados = loginSchema.parse(request.body);
      const usuario = await service.autenticar(app.prisma, dados);
      return { token: gerarToken(usuario), usuario };
    },
  );
}
