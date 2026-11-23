// Error handler central: todo erro vira { erro: { codigo, mensagem } }.
// Em produção nunca devolvemos stack trace — só registramos no log.
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ErroApp } from '../domain/erros';

function corpo(codigo: string, mensagem: string, detalhes?: unknown) {
  return { erro: { codigo, mensagem, ...(detalhes ? { detalhes } : {}) } };
}

export function registrarErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    // Erros de regra de negócio lançados pelo nosso código
    if (error instanceof ErroApp) {
      return reply.status(error.status).send(corpo(error.codigo, error.message));
    }

    // 400: entrada inválida (validação zod)
    if (error instanceof ZodError) {
      const detalhes = error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }));
      return reply.status(400).send(corpo('VALIDACAO', detalhes[0]?.mensagem ?? 'Dados inválidos', detalhes));
    }

    // Erros conhecidos do banco
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return reply.status(409).send(corpo('CONFLITO', 'Já existe um registro com esse valor.'));
      }
      if (error.code === 'P2025') {
        return reply.status(404).send(corpo('NAO_ENCONTRADO', 'Recurso não encontrado.'));
      }
    }

    // Erros 4xx do próprio Fastify (JSON malformado, body ausente, etc.)
    const status = (error as FastifyError).statusCode;
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send(corpo('REQUISICAO_INVALIDA', error.message));
    }

    // Qualquer outra coisa é erro interno: loga o detalhe, responde genérico
    request.log.error({ err: error }, 'erro não tratado');
    return reply.status(500).send(corpo('ERRO_INTERNO', 'Erro interno. Tente novamente.'));
  });
}
