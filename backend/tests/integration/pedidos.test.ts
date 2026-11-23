import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { bearer, criarProduto, criarUsuario, login, prepararApp } from './helpers';

let app: FastifyInstance;
let tokenAdmin: string;
let tokenAluno: string;
let tokenOutroAluno: string;
let coxinhaId: number;
let sucoId: number;

const estoqueDe = async (id: number) => (await app.prisma.produto.findUniqueOrThrow({ where: { id } })).estoque;

async function fazerPedido(token: string, itens: object[]) {
  return app.inject({ method: 'POST', url: '/api/pedidos', payload: { itens }, headers: bearer(token) });
}

beforeAll(async () => {
  app = await prepararApp();
  await criarUsuario(app, 'cantina@teste.local', 'ADMIN');
  await criarUsuario(app, 'aluno@teste.local');
  await criarUsuario(app, 'outro@teste.local');
  tokenAdmin = await login(app, 'cantina@teste.local');
  tokenAluno = await login(app, 'aluno@teste.local');
  tokenOutroAluno = await login(app, 'outro@teste.local');
  coxinhaId = (await criarProduto(app, { nome: 'Coxinha', preco: '6.50', estoque: 10 })).id;
  sucoId = (await criarProduto(app, { nome: 'Suco', preco: '5.00', estoque: 2 })).id;
});
afterAll(() => app.close());

describe('criar pedido', () => {
  it('I5: pedido válido → 201, total calculado no servidor e estoque baixado', async () => {
    const res = await fazerPedido(tokenAluno, [
      { produtoId: coxinhaId, quantidade: 2 },
      { produtoId: sucoId, quantidade: 1 },
    ]);
    expect(res.statusCode).toBe(201);
    expect(res.json().total).toBe('18.00');
    expect(res.json().status).toBe('RECEBIDO');
    expect(await estoqueDe(coxinhaId)).toBe(8);
    expect(await estoqueDe(sucoId)).toBe(1);
  });

  it('I6: preço enviado pelo cliente é ignorado — vale o do banco', async () => {
    const res = await fazerPedido(tokenAluno, [{ produtoId: coxinhaId, quantidade: 1, preco: 0.01, precoUnitario: 0.01 }]);
    expect(res.statusCode).toBe(201);
    expect(res.json().total).toBe('6.50');
    expect(res.json().itens[0].precoUnitario).toBe('6.50');
  });

  it('I7: acima do estoque → 409 e NADA muda no banco (rollback)', async () => {
    const coxinhaAntes = await estoqueDe(coxinhaId);
    const pedidosAntes = await app.prisma.pedido.count();

    // A coxinha teria estoque, mas o suco não: a baixa da coxinha precisa ser desfeita
    const res = await fazerPedido(tokenAluno, [
      { produtoId: coxinhaId, quantidade: 1 },
      { produtoId: sucoId, quantidade: 5 },
    ]);
    expect(res.statusCode).toBe(409);
    expect(res.json().erro.codigo).toBe('ESTOQUE_INSUFICIENTE');
    expect(await estoqueDe(coxinhaId)).toBe(coxinhaAntes);
    expect(await estoqueDe(sucoId)).toBe(1);
    expect(await app.prisma.pedido.count()).toBe(pedidosAntes);
  });

  it('produto inexistente → 422', async () => {
    const res = await fazerPedido(tokenAluno, [{ produtoId: 9999, quantidade: 1 }]);
    expect(res.statusCode).toBe(422);
  });

  it('pedido inválido (0 itens) → 400', async () => {
    const res = await fazerPedido(tokenAluno, []);
    expect(res.statusCode).toBe(400);
  });

  it('ADMIN não faz pedido → 403', async () => {
    const res = await fazerPedido(tokenAdmin, [{ produtoId: coxinhaId, quantidade: 1 }]);
    expect(res.statusCode).toBe(403);
  });
});

describe('status do pedido (I8)', () => {
  let pedidoId: number;

  beforeAll(async () => {
    pedidoId = (await fazerPedido(tokenAluno, [{ produtoId: coxinhaId, quantidade: 1 }])).json().id;
  });

  const mudarStatus = (status: string) =>
    app.inject({
      method: 'PATCH',
      url: `/api/pedidos/${pedidoId}/status`,
      payload: { status },
      headers: bearer(tokenAdmin),
    });

  it('ADMIN avança RECEBIDO → EM_PREPARO → 200', async () => {
    const res = await mudarStatus('EM_PREPARO');
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('EM_PREPARO');
  });

  it('pedido aparece na fila filtrada por status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pedidos?status=EM_PREPARO', headers: bearer(tokenAdmin) });
    expect(res.json().map((p: { id: number }) => p.id)).toContain(pedidoId);
  });

  it('ENTREGUE → RECEBIDO é transição inválida → 422', async () => {
    await mudarStatus('PRONTO');
    await mudarStatus('ENTREGUE');
    const res = await mudarStatus('RECEBIDO');
    expect(res.statusCode).toBe(422);
    expect(res.json().erro.codigo).toBe('TRANSICAO_INVALIDA');
  });

  it('pedido inexistente → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/pedidos/9999/status',
      payload: { status: 'PRONTO' },
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(404);
  });

  it('ADMIN cancela EM_PREPARO pelo status e o estoque volta', async () => {
    const id = (await fazerPedido(tokenAluno, [{ produtoId: coxinhaId, quantidade: 2 }])).json().id;
    const antes = await estoqueDe(coxinhaId);
    await app.inject({ method: 'PATCH', url: `/api/pedidos/${id}/status`, payload: { status: 'EM_PREPARO' }, headers: bearer(tokenAdmin) });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/pedidos/${id}/status`,
      payload: { status: 'CANCELADO' },
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(200);
    expect(await estoqueDe(coxinhaId)).toBe(antes + 2);
  });
});

describe('cancelamento pelo aluno', () => {
  it('I9: aluno cancela pedido RECEBIDO → 200 e estoque devolvido', async () => {
    const antes = await estoqueDe(coxinhaId);
    const pedido = (await fazerPedido(tokenAluno, [{ produtoId: coxinhaId, quantidade: 3 }])).json();
    expect(await estoqueDe(coxinhaId)).toBe(antes - 3);

    const res = await app.inject({ method: 'PATCH', url: `/api/pedidos/${pedido.id}/cancelar`, headers: bearer(tokenAluno) });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('CANCELADO');
    expect(await estoqueDe(coxinhaId)).toBe(antes);
  });

  it('aluno não cancela depois de EM_PREPARO → 422', async () => {
    const pedido = (await fazerPedido(tokenAluno, [{ produtoId: coxinhaId, quantidade: 1 }])).json();
    await app.inject({ method: 'PATCH', url: `/api/pedidos/${pedido.id}/status`, payload: { status: 'EM_PREPARO' }, headers: bearer(tokenAdmin) });
    const res = await app.inject({ method: 'PATCH', url: `/api/pedidos/${pedido.id}/cancelar`, headers: bearer(tokenAluno) });
    expect(res.statusCode).toBe(422);
  });

  it('I10: aluno tenta cancelar/ver pedido de outro aluno → 404', async () => {
    const pedido = (await fazerPedido(tokenAluno, [{ produtoId: coxinhaId, quantidade: 1 }])).json();

    const res = await app.inject({ method: 'PATCH', url: `/api/pedidos/${pedido.id}/cancelar`, headers: bearer(tokenOutroAluno) });
    expect(res.statusCode).toBe(404);

    const meus = await app.inject({ method: 'GET', url: '/api/pedidos/meus', headers: bearer(tokenOutroAluno) });
    expect(meus.statusCode).toBe(200);
    expect(meus.json()).toHaveLength(0);
  });

  it('aluno vê só os próprios pedidos e não acessa a fila', async () => {
    const meus = await app.inject({ method: 'GET', url: '/api/pedidos/meus', headers: bearer(tokenAluno) });
    expect(meus.json().length).toBeGreaterThan(0);
    expect(meus.json().every((p: { usuario: { nome: string } }) => p.usuario.nome === 'aluno')).toBe(true);

    const fila = await app.inject({ method: 'GET', url: '/api/pedidos', headers: bearer(tokenAluno) });
    expect(fila.statusCode).toBe(403);
  });
});
