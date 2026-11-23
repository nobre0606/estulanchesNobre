import { useState } from 'react';
import { ArrowRight, User } from '@phosphor-icons/react';
import { api, mensagemDeErro, type Pedido, type Status } from '../api';
import { useAgora, useDados } from '../hooks';
import { brl, numeroPedido, STATUS, tempoDesde } from '../format';
import { Aviso } from '../components/Aviso';

// Colunas do painel e o texto do botão "Avançar" de cada uma
const COLUNAS: { status: Status; proximo?: Status; acao?: string; dica: string }[] = [
  { status: 'RECEBIDO', proximo: 'EM_PREPARO', acao: 'Começar preparo', dica: 'Pedidos novos chegam aqui' },
  { status: 'EM_PREPARO', proximo: 'PRONTO', acao: 'Marcar pronto', dica: 'Na chapa' },
  { status: 'PRONTO', proximo: 'ENTREGUE', acao: 'Entregar', dica: 'Aguardando retirada' },
  { status: 'ENTREGUE', dica: 'Últimos entregues' },
];

export function AdminPedidos() {
  // A cantina vê pedidos novos chegando sem recarregar (polling de 5 s)
  const { dados, erro, recarregar } = useDados(() => api<Pedido[]>('/pedidos'), 5_000);
  const agora = useAgora(15_000);

  const porStatus = (s: Status) => {
    const lista = dados?.filter((p) => p.status === s) ?? [];
    // Entregues: só os mais recentes, para a coluna não crescer sem fim
    return s === 'ENTREGUE' ? lista.slice(-6).reverse() : lista;
  };
  const naFila = dados?.filter((p) => ['RECEBIDO', 'EM_PREPARO'].includes(p.status)).length ?? 0;

  return (
    <div className="painel">
      <header className="pagina-topo pagina-topo--linha">
        <div>
          <p className="sobretitulo">Painel da cantina</p>
          <h1>Fila de pedidos</h1>
        </div>
        <p className="contador-fila" aria-live="polite">
          <b className="mono">{naFila}</b> {naFila === 1 ? 'pedido' : 'pedidos'} para preparar
        </p>
      </header>

      {erro && <Aviso>{erro}</Aviso>}

      <div className="colunas">
        {COLUNAS.map((col) => {
          const lista = porStatus(col.status);
          return (
            <section key={col.status} className={`coluna coluna--${STATUS[col.status].classe}`} aria-labelledby={`col-${col.status}`}>
              <header className="coluna__cabeca">
                <h2 id={`col-${col.status}`}>{STATUS[col.status].rotulo}</h2>
                <span className="coluna__qtd mono">{lista.length}</span>
              </header>
              <p className="coluna__dica">{col.dica}</p>
              <div className="coluna__lista">
                {lista.length === 0 && <p className="coluna__vazia">Nada por aqui.</p>}
                {lista.map((p) => (
                  <TicketCantina key={p.id} pedido={p} agora={agora} coluna={col} aoMudar={recarregar} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TicketCantina({
  pedido,
  agora,
  coluna,
  aoMudar,
}: {
  pedido: Pedido;
  agora: number;
  coluna: (typeof COLUNAS)[number];
  aoMudar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const podeCancelar = pedido.status === 'RECEBIDO' || pedido.status === 'EM_PREPARO';

  async function mudar(status: Status) {
    setOcupado(true);
    setErro(null);
    try {
      await api(`/pedidos/${pedido.id}/status`, { method: 'PATCH', body: { status } });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
      setConfirmando(false);
      aoMudar();
    }
  }

  return (
    <article className="ticket ticket--compacto" aria-labelledby={`t-${pedido.id}`}>
      <div className="ticket__cabeca ticket__cabeca--entre">
        <h3 id={`t-${pedido.id}`} className="mono ticket__numero">
          {numeroPedido(pedido.id)}
        </h3>
        <span className="ticket__tempo">{tempoDesde(pedido.criadoEm, agora)}</span>
      </div>
      <p className="ticket__aluno">
        <User size={14} weight="bold" aria-hidden /> {pedido.usuario.nome}
      </p>
      <ul className="ticket__itens ticket__itens--cozinha">
        {pedido.itens.map((i) => (
          <li key={i.id}>
            <span className="mono ticket__qtd-grande">{i.quantidade}×</span>
            <span>{i.produto.nome}</span>
          </li>
        ))}
      </ul>
      {pedido.observacao && <p className="ticket__obs">“{pedido.observacao}”</p>}
      <div className="ticket__rodape">
        <span>Total</span>
        <span className="mono">{brl(pedido.total)}</span>
      </div>

      {erro && <Aviso>{erro}</Aviso>}

      {(coluna.proximo || podeCancelar) && (
        <div className="ticket__acoes">
          {confirmando ? (
            <div className="confirmacao" role="group" aria-label="Confirmar cancelamento">
              <span>Cancelar e devolver estoque?</span>
              <button type="button" className="botao botao--perigo botao--pequeno" onClick={() => mudar('CANCELADO')} disabled={ocupado}>
                Sim
              </button>
              <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => setConfirmando(false)}>
                Não
              </button>
            </div>
          ) : (
            <>
              {coluna.proximo && (
                <button
                  type="button"
                  className="botao botao--primario botao--pequeno"
                  onClick={() => mudar(coluna.proximo!)}
                  disabled={ocupado}
                >
                  {coluna.acao} <ArrowRight size={16} weight="bold" aria-hidden />
                </button>
              )}
              {podeCancelar && (
                <button type="button" className="botao botao--fantasma botao--pequeno botao--perigo-texto" onClick={() => setConfirmando(true)}>
                  Cancelar
                </button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
