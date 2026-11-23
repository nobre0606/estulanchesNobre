import type { FastifyInstance } from 'fastify';
import type { Papel } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashSenha } from '../../src/domain/senha';

export const SENHA = 'senha-de-teste-123';

/** Sobe a API e zera o banco — cada arquivo de teste começa limpo. */
export async function prepararApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  await app.prisma.$executeRawUnsafe(
    'TRUNCATE itens_pedido, pedidos, produtos, categorias, usuarios RESTART IDENTITY CASCADE',
  );
  return app;
}

export async function criarUsuario(app: FastifyInstance, email: string, papel: Papel = 'ALUNO') {
  return app.prisma.usuario.create({
    data: { nome: email.split('@')[0], email, senhaHash: await hashSenha(SENHA), papel },
  });
}

export async function login(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, senha: SENHA } });
  return res.json().token;
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

export async function criarProduto(app: FastifyInstance, dados: { nome: string; preco: string; estoque: number }) {
  const categoria = await app.prisma.categoria.upsert({
    where: { nome: 'Salgados' },
    update: {},
    create: { nome: 'Salgados' },
  });
  return app.prisma.produto.create({ data: { ...dados, categoriaId: categoria.id } });
}
