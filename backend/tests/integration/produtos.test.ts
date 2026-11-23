import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { bearer, criarUsuario, login, prepararApp } from './helpers';

let app: FastifyInstance;
let tokenAdmin: string;
let tokenAluno: string;
let categoriaId: number;

beforeAll(async () => {
  app = await prepararApp();
  await criarUsuario(app, 'cantina@teste.local', 'ADMIN');
  await criarUsuario(app, 'aluno@teste.local', 'ALUNO');
  tokenAdmin = await login(app, 'cantina@teste.local');
  tokenAluno = await login(app, 'aluno@teste.local');
  categoriaId = (await app.prisma.categoria.create({ data: { nome: 'Salgados' } })).id;
});
afterAll(() => app.close());

const novoProduto = () => ({ nome: 'Coxinha', preco: 6.5, estoque: 10, categoriaId });

describe('permissões (I3)', () => {
  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/produtos', payload: novoProduto() });
    expect(res.statusCode).toBe(401);
  });

  it('token de ALUNO → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/produtos',
      payload: novoProduto(),
      headers: bearer(tokenAluno),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().erro.codigo).toBe('SEM_PERMISSAO');
  });

  it('token inválido → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/produtos', headers: bearer('abc.def.ghi') });
    expect(res.statusCode).toBe(401);
  });
});

describe('CRUD de produto pela cantina', () => {
  let produtoId: number;

  it('I4: ADMIN cria produto → 201 e ele aparece no cardápio', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/produtos',
      payload: novoProduto(),
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().preco).toBe('6.50');
    produtoId = res.json().id;

    const cardapio = await app.inject({ method: 'GET', url: `/api/produtos?categoriaId=${categoriaId}` });
    expect(cardapio.json().map((p: { id: number }) => p.id)).toContain(produtoId);
  });

  it('preço negativo → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/produtos',
      payload: { ...novoProduto(), preco: -1 },
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(400);
  });

  it('categoria inexistente → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/produtos',
      payload: { ...novoProduto(), categoriaId: 9999 },
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(404);
  });

  it('edita estoque e preço', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/produtos/${produtoId}`,
      payload: { estoque: 25, preco: 7 },
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ estoque: 25, preco: '7.00' });
  });

  it('editar produto inexistente → 404', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/produtos/9999',
      payload: { estoque: 1 },
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE é exclusão lógica: some do cardápio, continua na lista do admin', async () => {
    const del = await app.inject({ method: 'DELETE', url: `/api/produtos/${produtoId}`, headers: bearer(tokenAdmin) });
    expect(del.statusCode).toBe(204);

    const cardapio = await app.inject({ method: 'GET', url: '/api/produtos' });
    expect(cardapio.json().map((p: { id: number }) => p.id)).not.toContain(produtoId);

    const admin = await app.inject({ method: 'GET', url: '/api/admin/produtos', headers: bearer(tokenAdmin) });
    const produto = admin.json().find((p: { id: number }) => p.id === produtoId);
    expect(produto.ativo).toBe(false);
  });

  it('desativar produto inexistente → 404', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/produtos/9999', headers: bearer(tokenAdmin) });
    expect(res.statusCode).toBe(404);
  });
});

describe('categorias', () => {
  it('cria, renomeia e lista', async () => {
    const criada = await app.inject({
      method: 'POST',
      url: '/api/categorias',
      payload: { nome: 'Bebidas' },
      headers: bearer(tokenAdmin),
    });
    expect(criada.statusCode).toBe(201);

    const editada = await app.inject({
      method: 'PUT',
      url: `/api/categorias/${criada.json().id}`,
      payload: { nome: 'Bebidas geladas' },
      headers: bearer(tokenAdmin),
    });
    expect(editada.json().nome).toBe('Bebidas geladas');

    const lista = await app.inject({ method: 'GET', url: '/api/categorias' });
    expect(lista.json().map((c: { nome: string }) => c.nome)).toContain('Bebidas geladas');
  });

  it('nome repetido → 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/categorias',
      payload: { nome: 'Salgados' },
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(409);
  });

  it('excluir categoria com produtos → 409', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/categorias/${categoriaId}`,
      headers: bearer(tokenAdmin),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().erro.codigo).toBe('CATEGORIA_COM_PRODUTOS');
  });

  it('excluir categoria vazia → 204; inexistente → 404', async () => {
    const vazia = await app.prisma.categoria.create({ data: { nome: 'Temporária' } });
    const ok = await app.inject({ method: 'DELETE', url: `/api/categorias/${vazia.id}`, headers: bearer(tokenAdmin) });
    expect(ok.statusCode).toBe(204);

    const de_novo = await app.inject({ method: 'DELETE', url: `/api/categorias/${vazia.id}`, headers: bearer(tokenAdmin) });
    expect(de_novo.statusCode).toBe(404);

    const put = await app.inject({
      method: 'PUT',
      url: `/api/categorias/${vazia.id}`,
      payload: { nome: 'X' },
      headers: bearer(tokenAdmin),
    });
    expect(put.statusCode).toBe(404);
  });
});
