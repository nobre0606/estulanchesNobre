import { describe, it, expect } from 'vitest';
import { produtoSchema } from '../../src/modules/produtos/schemas';
import { pedidoSchema } from '../../src/modules/pedidos/schemas';
import { registroSchema } from '../../src/modules/auth/schemas';

const produtoValido = { nome: 'Coxinha', preco: 6.5, estoque: 10, categoriaId: 1 };

describe('schema de produto (U6)', () => {
  it('aceita produto válido', () => {
    expect(produtoSchema.safeParse(produtoValido).success).toBe(true);
  });

  it('rejeita preço negativo', () => {
    expect(produtoSchema.safeParse({ ...produtoValido, preco: -1 }).success).toBe(false);
  });

  it('rejeita preço zero', () => {
    expect(produtoSchema.safeParse({ ...produtoValido, preco: 0 }).success).toBe(false);
  });

  it('rejeita nome vazio (inclusive só espaços)', () => {
    expect(produtoSchema.safeParse({ ...produtoValido, nome: '' }).success).toBe(false);
    expect(produtoSchema.safeParse({ ...produtoValido, nome: '   ' }).success).toBe(false);
  });

  it('rejeita estoque negativo ou fracionado', () => {
    expect(produtoSchema.safeParse({ ...produtoValido, estoque: -1 }).success).toBe(false);
    expect(produtoSchema.safeParse({ ...produtoValido, estoque: 1.5 }).success).toBe(false);
  });
});

describe('schema de pedido (U7)', () => {
  it('aceita pedido válido', () => {
    const r = pedidoSchema.safeParse({ itens: [{ produtoId: 1, quantidade: 2 }] });
    expect(r.success).toBe(true);
  });

  it('rejeita pedido com 0 itens', () => {
    expect(pedidoSchema.safeParse({ itens: [] }).success).toBe(false);
  });

  it('rejeita quantidade 11', () => {
    expect(pedidoSchema.safeParse({ itens: [{ produtoId: 1, quantidade: 11 }] }).success).toBe(false);
  });

  it('rejeita mais de 20 itens', () => {
    const itens = Array.from({ length: 21 }, (_, i) => ({ produtoId: i + 1, quantidade: 1 }));
    expect(pedidoSchema.safeParse({ itens }).success).toBe(false);
  });

  it('rejeita produto repetido', () => {
    const itens = [
      { produtoId: 1, quantidade: 1 },
      { produtoId: 1, quantidade: 2 },
    ];
    expect(pedidoSchema.safeParse({ itens }).success).toBe(false);
  });

  it('descarta campo de preço enviado pelo cliente', () => {
    const r = pedidoSchema.parse({ itens: [{ produtoId: 1, quantidade: 1, preco: 0.01 }] });
    expect(r.itens[0]).toEqual({ produtoId: 1, quantidade: 1 });
  });
});

describe('schema de registro', () => {
  it('normaliza o e-mail e exige senha de 8+ caracteres', () => {
    const r = registroSchema.parse({ nome: 'Ana', email: '  Ana@Escola.COM ', senha: '12345678' });
    expect(r.email).toBe('ana@escola.com');
    expect(registroSchema.safeParse({ nome: 'Ana', email: 'ana@escola.com', senha: '123' }).success).toBe(false);
    expect(registroSchema.safeParse({ nome: 'Ana', email: 'nao-e-email', senha: '12345678' }).success).toBe(false);
  });
});
