import type { Status } from './api';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata dinheiro. Recebe centavos (número inteiro) ou o texto da API ("6.50"). */
export function brl(valor: string | number, emCentavos = false) {
  const reais = emCentavos ? Number(valor) / 100 : Number(valor);
  return moeda.format(reais);
}

/** Converte "6.50" em 650 centavos — conta de carrinho sem erro de float. */
export const centavos = (preco: string) => Math.round(Number(preco) * 100);

export const numeroPedido = (id: number) => `#${String(id).padStart(4, '0')}`;

export function tempoDesde(iso: string, agora = Date.now()) {
  const min = Math.floor((agora - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const horario = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const STATUS: Record<Status, { rotulo: string; classe: string }> = {
  RECEBIDO: { rotulo: 'Recebido', classe: 'recebido' },
  EM_PREPARO: { rotulo: 'Em preparo', classe: 'preparo' },
  PRONTO: { rotulo: 'Pronto', classe: 'pronto' },
  ENTREGUE: { rotulo: 'Entregue', classe: 'entregue' },
  CANCELADO: { rotulo: 'Cancelado', classe: 'cancelado' },
};

export const FLUXO: Status[] = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];
