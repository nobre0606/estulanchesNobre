import { Bread, Cookie, Coffee, ForkKnife, type IconProps } from '@phosphor-icons/react';

const ICONES: Record<string, React.ComponentType<IconProps>> = {
  salgados: Bread,
  bebidas: Coffee,
  doces: Cookie,
};

export function IconeCategoria({ nome, size = 20 }: { nome: string; size?: number }) {
  const Icone = ICONES[nome.toLowerCase()] ?? ForkKnife;
  return <Icone size={size} weight="duotone" aria-hidden />;
}
