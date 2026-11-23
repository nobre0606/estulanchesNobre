import type { FastifyInstance } from 'fastify';
import { idParamSchema } from '../categorias/schemas';
import { filaQuerySchema, pedidoSchema, statusSchema } from './schemas';
import * as service from './service';

export default async function pedidosRoutes(app: FastifyInstance) {
  const soAluno = { preHandler: app.exigirPapel('ALUNO') };
  const soAdmin = { preHandler: app.exigirPapel('ADMIN') };
  const alunoOuAdmin = { preHandler: app.exigirPapel('ALUNO', 'ADMIN') };

  app.post('/pedidos', soAluno, async (request, reply) => {
    const dados = pedidoSchema.parse(request.body);
    return reply.status(201).send(await service.criarPedido(app.prisma, request.user.sub, dados));
  });

  app.get('/pedidos/meus', soAluno, async (request) => service.listarDoUsuario(app.prisma, request.user.sub));

  app.patch('/pedidos/:id/cancelar', alunoOuAdmin, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return service.cancelarPedido(app.prisma, id, { id: request.user.sub, papel: request.user.papel });
  });

  app.get('/pedidos', soAdmin, async (request) => {
    const { status } = filaQuerySchema.parse(request.query);
    return service.listarFila(app.prisma, status);
  });

  app.patch('/pedidos/:id/status', soAdmin, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { status } = statusSchema.parse(request.body);
    return service.atualizarStatus(app.prisma, id, status, { id: request.user.sub, papel: request.user.papel });
  });
}
