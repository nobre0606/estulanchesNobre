import type { ReactNode } from 'react';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';

/** Mensagem de erro/sucesso anunciada por leitores de tela. */
export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'sucesso'; children: ReactNode }) {
  const Icone = tipo === 'erro' ? WarningCircle : CheckCircle;
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <Icone size={20} weight="fill" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
