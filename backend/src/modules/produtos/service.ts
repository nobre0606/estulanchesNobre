import type { PrismaClient } from '@prisma/client';
import { naoEncontrado } from '../../domain/erros';
import type { ProdutoInput, ProdutoUpdateInput } from './schemas';

const comCategoria = { categoria: { select: { id: true, nome: true } } } as const;

/** Cardápio público: só produtos ativos e com estoque, opcionalmente por categoria. */
export function listarCardapio(prisma: PrismaClient, categoriaId?: number) {
  return prisma.produto.findMany({
    where: { ativo: true, estoque: { gt: 0 }, ...(categoriaId ? { categoriaId } : {}) },
    include: comCategoria,
    orderBy: [{ categoria: { nome: 'asc' } }, { nome: 'asc' }],
  });
}

/** Painel da cantina: todos os produtos, inclusive inativos e sem estoque. */
export function listarTodos(prisma: PrismaClient) {
  return prisma.produto.findMany({
    include: comCategoria,
    orderBy: [{ categoria: { nome: 'asc' } }, { nome: 'asc' }],
  });
}

async function garantirCategoria(prisma: PrismaClient, categoriaId: number) {
  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria) throw naoEncontrado('Categoria não encontrada.');
}

export async function criar(prisma: PrismaClient, dados: ProdutoInput) {
  await garantirCategoria(prisma, dados.categoriaId);
  return prisma.produto.create({ data: dados, include: comCategoria });
}

export async function atualizar(prisma: PrismaClient, id: number, dados: ProdutoUpdateInput) {
  const existe = await prisma.produto.findUnique({ where: { id } });
  if (!existe) throw naoEncontrado('Produto não encontrado.');
  if (dados.categoriaId) await garantirCategoria(prisma, dados.categoriaId);
  return prisma.produto.update({ where: { id }, data: dados, include: comCategoria });
}

/** Exclusão lógica: o produto some do cardápio, mas os pedidos antigos continuam íntegros. */
export async function desativar(prisma: PrismaClient, id: number) {
  const existe = await prisma.produto.findUnique({ where: { id } });
  if (!existe) throw naoEncontrado('Produto não encontrado.');
  await prisma.produto.update({ where: { id }, data: { ativo: false } });
}
