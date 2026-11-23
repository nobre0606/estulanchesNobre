// Coração do sistema: criação de pedido com baixa de estoque segura.
import type { Papel, PrismaClient, StatusPedido } from '@prisma/client';
import { ErroApp, naoEncontrado } from '../../domain/erros';
import { calcularSubtotal, calcularTotal, validarCancelamento, validarTransicao, verificarEstoque } from '../../domain/pedido';
import type { PedidoInput } from './schemas';

interface Solicitante {
  id: string;
  papel: Papel;
}

const detalhes = {
  itens: { include: { produto: { select: { id: true, nome: true } } } },
  usuario: { select: { id: true, nome: true } },
} as const;

/**
 * Cria o pedido numa ÚNICA transação:
 * 1. busca os produtos e usa o preço DO BANCO (o cliente não manda preço);
 * 2. baixa o estoque com UPDATE ... WHERE estoque >= qtd — atômico no Postgres,
 *    então dois pedidos simultâneos nunca vendem a mesma última unidade;
 * 3. se qualquer item falhar, lança erro e o Prisma faz rollback de tudo.
 */
export async function criarPedido(prisma: PrismaClient, usuarioId: string, dados: PedidoInput) {
  // Ordena por id para que transações concorrentes travem as linhas na mesma ordem (evita deadlock)
  const itensPedidos = [...dados.itens].sort((a, b) => a.produtoId - b.produtoId);

  return prisma.$transaction(async (tx) => {
    const produtos = await tx.produto.findMany({
      where: { id: { in: itensPedidos.map((i) => i.produtoId) } },
    });
    const porId = new Map(produtos.map((p) => [p.id, p]));

    const itens = [];
    for (const item of itensPedidos) {
      const produto = porId.get(item.produtoId);
      if (!produto || !produto.ativo) {
        throw new ErroApp(422, 'PRODUTO_INDISPONIVEL', `O produto ${item.produtoId} não está disponível.`);
      }

      const baixa = await tx.produto.updateMany({
        where: { id: produto.id, ativo: true, estoque: { gte: item.quantidade } },
        data: { estoque: { decrement: item.quantidade } },
      });
      if (baixa.count === 0) {
        verificarEstoque(produto, item.quantidade); // gera a mensagem com o disponível
        throw new ErroApp(409, 'ESTOQUE_INSUFICIENTE', `Estoque insuficiente para "${produto.nome}".`);
      }

      const linha = { precoUnitario: produto.preco, quantidade: item.quantidade };
      itens.push({ produtoId: produto.id, ...linha, subtotal: calcularSubtotal(linha) });
    }

    return tx.pedido.create({
      data: {
        usuarioId,
        observacao: dados.observacao || null,
        total: calcularTotal(itens),
        itens: { create: itens },
      },
      include: detalhes,
    });
  });
}

export function listarDoUsuario(prisma: PrismaClient, usuarioId: string) {
  return prisma.pedido.findMany({
    where: { usuarioId },
    include: detalhes,
    orderBy: { criadoEm: 'desc' },
  });
}

/** Fila da cantina: mais antigos primeiro (quem pediu antes é atendido antes). */
export function listarFila(prisma: PrismaClient, status?: StatusPedido) {
  return prisma.pedido.findMany({
    where: status ? { status } : {},
    include: detalhes,
    orderBy: { criadoEm: 'asc' },
  });
}

/** Cancela e devolve o estoque, tudo na mesma transação. */
export async function cancelarPedido(prisma: PrismaClient, pedidoId: number, quem: Solicitante) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: pedidoId }, include: { itens: true } });

    // Aluno não pode nem saber que o pedido de outro aluno existe: 404, não 403
    if (!pedido || (quem.papel === 'ALUNO' && pedido.usuarioId !== quem.id)) {
      throw naoEncontrado('Pedido não encontrado.');
    }
    validarCancelamento(pedido.status, quem.papel);

    // "WHERE status = atual" impede cancelar duas vezes em requisições simultâneas
    const mudou = await tx.pedido.updateMany({
      where: { id: pedidoId, status: pedido.status },
      data: { status: 'CANCELADO' },
    });
    if (mudou.count === 0) {
      throw new ErroApp(409, 'CONFLITO', 'O pedido foi alterado por outra pessoa. Atualize a tela.');
    }

    for (const item of pedido.itens) {
      await tx.produto.update({
        where: { id: item.produtoId },
        data: { estoque: { increment: item.quantidade } },
      });
    }

    return tx.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: detalhes });
  });
}

/** Cantina avança o status. CANCELADO passa pelo cancelamento (que devolve estoque). */
export async function atualizarStatus(prisma: PrismaClient, pedidoId: number, novo: StatusPedido, quem: Solicitante) {
  if (novo === 'CANCELADO') return cancelarPedido(prisma, pedidoId, quem);

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw naoEncontrado('Pedido não encontrado.');
  validarTransicao(pedido.status, novo);

  const mudou = await prisma.pedido.updateMany({
    where: { id: pedidoId, status: pedido.status },
    data: { status: novo },
  });
  if (mudou.count === 0) {
    throw new ErroApp(409, 'CONFLITO', 'O pedido foi alterado por outra pessoa. Atualize a tela.');
  }
  return prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: detalhes });
}
