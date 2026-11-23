import type { PrismaClient } from '@prisma/client';
import { ErroApp, naoEncontrado } from '../../domain/erros';
import type { CategoriaInput } from './schemas';

export function listar(prisma: PrismaClient) {
  return prisma.categoria.findMany({ orderBy: { nome: 'asc' } });
}

export function criar(prisma: PrismaClient, dados: CategoriaInput) {
  return prisma.categoria.create({ data: dados });
}

export async function atualizar(prisma: PrismaClient, id: number, dados: CategoriaInput) {
  const existe = await prisma.categoria.findUnique({ where: { id } });
  if (!existe) throw naoEncontrado('Categoria não encontrada.');
  return prisma.categoria.update({ where: { id }, data: dados });
}

/** Categoria com produtos não pode ser apagada (quebraria o cardápio e o histórico). */
export async function excluir(prisma: PrismaClient, id: number) {
  const existe = await prisma.categoria.findUnique({ where: { id } });
  if (!existe) throw naoEncontrado('Categoria não encontrada.');
  const produtos = await prisma.produto.count({ where: { categoriaId: id } });
  if (produtos > 0) {
    throw new ErroApp(409, 'CATEGORIA_COM_PRODUTOS', 'A categoria tem produtos e não pode ser excluída.');
  }
  await prisma.categoria.delete({ where: { id } });
}
