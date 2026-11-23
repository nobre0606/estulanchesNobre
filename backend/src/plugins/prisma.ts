// Disponibiliza uma única conexão Prisma para toda a aplicação (app.prisma)
// e fecha a conexão quando o servidor encerra (graceful shutdown).
import fp from 'fastify-plugin';
import { PrismaClient, Prisma } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

// Todo Decimal do sistema é dinheiro numeric(10,2): no JSON sai sempre como "18.00".
Prisma.Decimal.prototype.toJSON = function (this: Prisma.Decimal) {
  return this.toFixed(2);
};

export default fp(async (app) => {
  const prisma = new PrismaClient();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
