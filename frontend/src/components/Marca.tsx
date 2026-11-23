import { Link } from 'react-router';

/** Logotipo em texto: "estulanches" com o pingo da coxinha. */
export function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <Link to="/" className={`marca ${claro ? 'marca--clara' : ''}`} aria-label="EstuLanches — início">
      <svg className="marca__icone" viewBox="0 0 32 32" aria-hidden>
        <path d="M9 21.5c0-5 3.1-11 7-11s7 6 7 11c0 1.4-1.1 2.5-2.5 2.5h-9A2.5 2.5 0 0 1 9 21.5Z" />
        <circle cx="16" cy="7.5" r="2.2" className="marca__pingo" />
      </svg>
      <span>
        estu<b>lanches</b>
      </span>
    </Link>
  );
}
