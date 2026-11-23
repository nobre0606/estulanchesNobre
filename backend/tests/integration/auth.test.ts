import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { criarUsuario, prepararApp, SENHA } from './helpers';

let app: FastifyInstance;

beforeAll(async () => {
  app = await prepararApp();
  await criarUsuario(app, 'aluno@teste.local');
});
afterAll(() => app.close());

describe('GET /api/health (I1)', () => {
  it('responde 200 com o banco no ar', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', db: 'up' });
  });
});

describe('login (I2)', () => {
  it('senha certa → 200 com token, sem expor o hash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'aluno@teste.local', senha: SENHA },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().token).toEqual(expect.any(String));
    expect(res.json().usuario.papel).toBe('ALUNO');
    expect(res.body).not.toContain('senhaHash');
  });

  it('senha errada → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'aluno@teste.local', senha: 'errada' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().erro.codigo).toBe('CREDENCIAIS_INVALIDAS');
  });
});

describe('cadastro', () => {
  it('sempre cria ALUNO, mesmo se o corpo pedir ADMIN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { nome: 'Esperto', email: 'esperto@teste.local', senha: '12345678', papel: 'ADMIN' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().usuario.papel).toBe('ALUNO');
  });

  it('e-mail repetido → 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { nome: 'Outro', email: 'aluno@teste.local', senha: '12345678' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('dados inválidos → 400 no formato padrão de erro', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { nome: 'A', email: 'x', senha: '1' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().erro.codigo).toBe('VALIDACAO');
  });
});

describe('rotas inexistentes', () => {
  it('/api desconhecida → 404 JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json().erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
