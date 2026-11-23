import type { FastifyInstance } from 'fastify';
import { categoriaSchema, idParamSchema } from './schemas';
import * as service from './service';

export default async function categoriasRoutes(app: FastifyInstance) {
  const soAdmin = { preHandler: app.exigirPapel('ADMIN') };

  app.get('/categorias', async () => service.listar(app.prisma));

  app.post('/categorias', soAdmin, async (request, reply) => {
    const dados = categoriaSchema.parse(request.body);
    return reply.status(201).send(await service.criar(app.prisma, dados));
  });

  app.put('/categorias/:id', soAdmin, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return service.atualizar(app.prisma, id, categoriaSchema.parse(request.body));
  });

  app.delete('/categorias/:id', soAdmin, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await service.excluir(app.prisma, id);
    return reply.status(204).send();
  });
}
