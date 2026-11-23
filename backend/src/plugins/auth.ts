// Autenticação por JWT e autorização por papel (ADMIN / ALUNO).
// JWT é stateless: o servidor não guarda sessão, então qualquer réplica da API
// consegue validar o token — é isso que permite escalar horizontalmente.
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Papel } from '@prisma/client';
import { env } from '../config/env';
import { ErroApp } from '../domain/erros';

export interface UsuarioToken {
  sub: string; // id do usuário
  nome: string;
  papel: Papel;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UsuarioToken;
    user: UsuarioToken;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    autenticar: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    exigirPapel: (...papeis: Papel[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  // 401: sem token, token inválido ou expirado
  async function autenticar(request: FastifyRequest) {
    try {
      await request.jwtVerify();
    } catch {
      throw new ErroApp(401, 'NAO_AUTENTICADO', 'Faça login para continuar.');
    }
  }

  app.decorate('autenticar', autenticar);

  // 403: está logado, mas o papel não tem permissão para a rota
  app.decorate('exigirPapel', (...papeis: Papel[]) => async (request: FastifyRequest) => {
    await autenticar(request);
    if (!papeis.includes(request.user.papel)) {
      throw new ErroApp(403, 'SEM_PERMISSAO', 'Você não tem permissão para esta ação.');
    }
  });
});
