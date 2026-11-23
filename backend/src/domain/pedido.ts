// Regras de negócio do pedido — funções puras, sem banco e sem HTTP.
// Por serem puras, são testadas no unitário em milissegundos.
import { Prisma, StatusPedido, Papel } from '@prisma/client';
import { ErroApp } from './erros';

const Decimal = Prisma.Decimal;
type Valor = Prisma.Decimal | string | number;

export interface ItemCalculo {
  precoUnitario: Valor;
  quantidade: number;
}

/** Subtotal de um item (preço × quantidade) com Decimal, nunca float. */
export function calcularSubtotal(item: ItemCalculo): Prisma.Decimal {
  return new Decimal(item.precoUnitario).times(item.quantidade).toDecimalPlaces(2);
}

/** Total do pedido. Ex.: 2 × 6,50 + 1 × 5,00 = 18,00 exato. */
export function calcularTotal(itens: ItemCalculo[]): Prisma.Decimal {
  return itens.reduce((soma, item) => soma.plus(calcularSubtotal(item)), new Decimal(0));
}

/** Mapa de transições permitidas: status atual → próximos status possíveis. */
export const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  RECEBIDO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADO: [],
};

/** Lança 422 TRANSICAO_INVALIDA se a mudança de status não for permitida. */
export function validarTransicao(atual: StatusPedido, novo: StatusPedido): void {
  if (!TRANSICOES[atual].includes(novo)) {
    throw new ErroApp(422, 'TRANSICAO_INVALIDA', `Não é possível mudar de ${atual} para ${novo}.`);
  }
}

/** Próximo status do fluxo normal (usado pelo botão "Avançar" do painel). */
export function proximoStatus(atual: StatusPedido): StatusPedido | null {
  return TRANSICOES[atual].find((s) => s !== 'CANCELADO') ?? null;
}

/**
 * Quem pode cancelar: ALUNO só enquanto RECEBIDO; ADMIN em RECEBIDO ou EM_PREPARO.
 * Lança 422 se não puder.
 */
export function validarCancelamento(atual: StatusPedido, papel: Papel): void {
  if (papel === 'ALUNO' && atual !== 'RECEBIDO') {
    throw new ErroApp(422, 'TRANSICAO_INVALIDA', 'O pedido só pode ser cancelado enquanto estiver RECEBIDO.');
  }
  validarTransicao(atual, 'CANCELADO');
}

export interface ProdutoEstoque {
  nome: string;
  estoque: number;
  ativo: boolean;
}

/** Lança 409 ESTOQUE_INSUFICIENTE se o produto não atende a quantidade pedida. */
export function verificarEstoque(produto: ProdutoEstoque, quantidade: number): void {
  if (!produto.ativo || produto.estoque < quantidade) {
    throw new ErroApp(
      409,
      'ESTOQUE_INSUFICIENTE',
      `Estoque insuficiente para "${produto.nome}" (disponível: ${produto.ativo ? produto.estoque : 0}).`,
    );
  }
}
