import { Check, X } from '@phosphor-icons/react';
import type { Status } from '../api';
import { FLUXO, STATUS } from '../format';

export function SeloStatus({ status }: { status: Status }) {
  const info = STATUS[status];
  return <span className={`selo selo--${info.classe}`}>{info.rotulo}</span>;
}

/** Trilha de progresso do pedido: cor + texto + ícone (não depende só de cor). */
export function TrilhaStatus({ status }: { status: Status }) {
  if (status === 'CANCELADO') {
    return (
      <p className="trilha-cancelada">
        <X size={16} weight="bold" aria-hidden /> Pedido cancelado — o estoque foi devolvido.
      </p>
    );
  }
  const atual = FLUXO.indexOf(status);
  return (
    <ol className="trilha" aria-label={`Status: ${STATUS[status].rotulo}`}>
      {FLUXO.map((etapa, i) => {
        const estado = i < atual ? 'feito' : i === atual ? 'atual' : 'futuro';
        return (
          <li key={etapa} className={`trilha__etapa trilha__etapa--${estado}`} aria-current={estado === 'atual' ? 'step' : undefined}>
            <span className="trilha__ponto" aria-hidden>
              {estado === 'feito' && <Check size={12} weight="bold" />}
            </span>
            <span className="trilha__rotulo">{STATUS[etapa].rotulo}</span>
          </li>
        );
      })}
    </ol>
  );
}
