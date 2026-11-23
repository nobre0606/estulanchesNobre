import { describe, it, expect } from 'vitest';
import {
  calcularTotal,
  calcularSubtotal,
  validarTransicao,
  validarCancelamento,
  verificarEstoque,
  proximoStatus,
} from '../../src/domain/pedido';
import { ErroApp } from '../../src/domain/erros';

describe('calcularTotal (U1)', () => {
  it('2 coxinhas a R$ 6,50 + 1 suco a R$ 5,00 = R$ 18,00 exato', () => {
    const total = calcularTotal([
      { precoUnitario: '6.50', quantidade: 2 },
      { precoUnitario: '5.00', quantidade: 1 },
    ]);
    expect(total.toFixed(2)).toBe('18.00');
  });

  it('não sofre erro de ponto flutuante (0,10 × 3 = 0,30)', () => {
    // Em float: 0.1 * 3 = 0.30000000000000004
    expect(calcularTotal([{ precoUnitario: '0.10', quantidade: 3 }]).toFixed(2)).toBe('0.30');
    expect(calcularSubtotal({ precoUnitario: 0.1, quantidade: 3 }).equals('0.3')).toBe(true);
  });

  it('pedido vazio tem total zero', () => {
    expect(calcularTotal([]).toFixed(2)).toBe('0.00');
  });
});

describe('validarTransicao (U2–U4)', () => {
  it('U2: RECEBIDO → EM_PREPARO é permitido', () => {
    expect(() => validarTransicao('RECEBIDO', 'EM_PREPARO')).not.toThrow();
  });

  it('fluxo completo até ENTREGUE é permitido', () => {
    expect(() => validarTransicao('EM_PREPARO', 'PRONTO')).not.toThrow();
    expect(() => validarTransicao('PRONTO', 'ENTREGUE')).not.toThrow();
  });

  it('U3: ENTREGUE → EM_PREPARO lança TRANSICAO_INVALIDA (422)', () => {
    try {
      validarTransicao('ENTREGUE', 'EM_PREPARO');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErroApp);
      expect((e as ErroApp).status).toBe(422);
      expect((e as ErroApp).codigo).toBe('TRANSICAO_INVALIDA');
    }
  });

  it('U4: PRONTO → CANCELADO lança erro (só cancela antes de pronto)', () => {
    expect(() => validarTransicao('PRONTO', 'CANCELADO')).toThrow(ErroApp);
  });

  it('não permite pular etapas nem voltar', () => {
    expect(() => validarTransicao('RECEBIDO', 'PRONTO')).toThrow(ErroApp);
    expect(() => validarTransicao('PRONTO', 'RECEBIDO')).toThrow(ErroApp);
    expect(() => validarTransicao('CANCELADO', 'RECEBIDO')).toThrow(ErroApp);
  });
});

describe('proximoStatus', () => {
  it('segue o fluxo normal e para no fim', () => {
    expect(proximoStatus('RECEBIDO')).toBe('EM_PREPARO');
    expect(proximoStatus('EM_PREPARO')).toBe('PRONTO');
    expect(proximoStatus('PRONTO')).toBe('ENTREGUE');
    expect(proximoStatus('ENTREGUE')).toBeNull();
    expect(proximoStatus('CANCELADO')).toBeNull();
  });
});

describe('validarCancelamento', () => {
  it('ALUNO cancela só em RECEBIDO', () => {
    expect(() => validarCancelamento('RECEBIDO', 'ALUNO')).not.toThrow();
    expect(() => validarCancelamento('EM_PREPARO', 'ALUNO')).toThrow(ErroApp);
  });

  it('ADMIN cancela em RECEBIDO ou EM_PREPARO, nunca depois de PRONTO', () => {
    expect(() => validarCancelamento('RECEBIDO', 'ADMIN')).not.toThrow();
    expect(() => validarCancelamento('EM_PREPARO', 'ADMIN')).not.toThrow();
    expect(() => validarCancelamento('PRONTO', 'ADMIN')).toThrow(ErroApp);
  });
});

describe('verificarEstoque (U5)', () => {
  it('pedir 5 com estoque 3 lança ESTOQUE_INSUFICIENTE (409)', () => {
    try {
      verificarEstoque({ nome: 'Coxinha', estoque: 3, ativo: true }, 5);
      expect.unreachable();
    } catch (e) {
      expect((e as ErroApp).status).toBe(409);
      expect((e as ErroApp).codigo).toBe('ESTOQUE_INSUFICIENTE');
    }
  });

  it('quantidade igual ao estoque é aceita', () => {
    expect(() => verificarEstoque({ nome: 'Coxinha', estoque: 3, ativo: true }, 3)).not.toThrow();
  });

  it('produto inativo é tratado como sem estoque', () => {
    expect(() => verificarEstoque({ nome: 'Coxinha', estoque: 50, ativo: false }, 1)).toThrow(ErroApp);
  });
});
