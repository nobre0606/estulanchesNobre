import { useEffect, useState, type ReactNode } from 'react';
import { api, type Produto } from '../api';
import { brl } from '../format';
import { Marca } from './Marca';

/** Layout das telas de entrada: mural "quadro do dia" + formulário. */
export function TelaAuth({ children }: { children: ReactNode }) {
  const [destaques, setDestaques] = useState<Produto[]>([]);

  useEffect(() => {
    // O cardápio é público: mostramos o que tem hoje de verdade, direto do banco
    api<Produto[]>('/produtos')
      .then((p) => setDestaques(p.slice(0, 6)))
      .catch(() => setDestaques([]));
  }, []);

  return (
    <div className="auth">
      <aside className="auth__mural">
        <Marca claro />
        <div className="auth__chamada">
          <h2>
            O intervalo é curto.
            <br />A fila não precisa ser.
          </h2>
          <p>Peça pelo celular, acompanhe o preparo e retire no balcão quando estiver pronto.</p>
        </div>
        {destaques.length > 0 && (
          <div className="quadro" aria-label="Alguns itens do cardápio de hoje">
            <p className="quadro__titulo">Hoje no balcão</p>
            <ul>
              {destaques.map((p) => (
                <li key={p.id}>
                  <span>{p.nome}</span>
                  <span className="quadro__pontos" aria-hidden />
                  <span className="mono">{brl(p.preco)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      <main className="auth__form">
        <div className="auth__marca-mobile">
          <Marca />
        </div>
        {children}
      </main>
    </div>
  );
}

/** Campo de senha com botão mostrar/ocultar. */
export function CampoSenha(props: {
  id: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoComplete: string;
  dica?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="campo">
      <label htmlFor={props.id}>Senha</label>
      <div className="campo__com-acao">
        <input
          id={props.id}
          type={visivel ? 'text' : 'password'}
          value={props.valor}
          onChange={(e) => props.aoMudar(e.target.value)}
          autoComplete={props.autoComplete}
          required
          aria-describedby={props.dica ? `${props.id}-dica` : undefined}
        />
        <button type="button" className="campo__acao" onClick={() => setVisivel((v) => !v)} aria-pressed={visivel}>
          {visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {props.dica && (
        <small id={`${props.id}-dica`} className="campo__dica">
          {props.dica}
        </small>
      )}
    </div>
  );
}
