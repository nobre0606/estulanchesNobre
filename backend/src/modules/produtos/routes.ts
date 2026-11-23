import type { FastifyInstance } from 'fastify';
import { idParamSchema } from '../categorias/schemas';
import { cardapioQuerySchema, produtoSchema, produtoUpdateSchema } from './schemas';
import * as service from './service';

export default async function produtosRoutes(app: FastifyInstance) {
  const soAdmin = { preHandler: app.exigirPapel('ADMIN') };

  app.get('/produtos', async (request) => {
    const { categoriaId } = cardapioQuerySchema.parse(request.query);
    return service.listarCardapio(app.prisma, categoriaId);
  });

  app.get('/admin/produtos', soAdmin, async () => service.listarTodos(app.prisma));

  app.post('/produtos', soAdmin, async (request, reply) => {
    const dados = produtoSchema.parse(request.body);
    return reply.status(201).send(await service.criar(app.prisma, dados));
  });

  app.put('/produtos/:id', soAdmin, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return service.atualizar(app.prisma, id, produtoUpdateSchema.parse(request.body));
  });

  app.delete('/produtos/:id', soAdmin, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await service.desativar(app.prisma, id);
    return reply.status(204).send();
  });
}
