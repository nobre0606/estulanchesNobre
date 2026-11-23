import { useState } from 'react';
import { Link } from 'react-router';
import { BellRinging } from '@phosphor-icons/react';
import { api, mensagemDeErro, type Pedido } from '../api';
import { useAgora, useDados } from '../hooks';
import { brl, horario, numeroPedido, tempoDesde } from '../format';
import { Aviso } from '../components/Aviso';
import { SeloStatus, TrilhaStatus } from '../components/Status';

const EM_ANDAMENTO = ['RECEBIDO', 'EM_PREPARO', 'PRONTO'];

export function MeusPedidos() {
  // Polling a cada 10 s: o aluno vê o status mudar sem recarregar a página
  const { dados, erro, atualizadoEm, recarregar } = useDados(() => api<Pedido[]>('/pedidos/meus'), 10_000);
  const agora = useAgora(5_000);

  const ativos = dados?.filter((p) => EM_ANDAMENTO.includes(p.status)) ?? [];
  const historico = dados?.filter((p) => !EM_ANDAMENTO.includes(p.status)) ?? [];

  return (
    <div className="pagina-estreita">
      <header className="pagina-topo">
        <p className="sobretitulo">Acompanhamento</p>
        <h1>Meus pedidos</h1>
        <p className="ao-vivo" aria-live="off">
          <span className="ao-vivo__ponto" aria-hidden />
          Atualiza sozinho a cada 10 s
          {atualizadoEm && <> · conferido às {new Date(atualizadoEm).toLocaleTimeString('pt-BR')}</>}
        </p>
      </header>

      {erro && <Aviso>{erro}</Aviso>}

      {dados && dados.length === 0 && (
        <div className="vazio">
          <p>Você ainda não fez nenhum pedido.</p>
          <Link to="/cardapio" className="botao botao--primario">
            Ver cardápio
          </Link>
        </div>
      )}

      {ativos.length > 0 && (
        <section aria-labelledby="titulo-ativos">
          <h2 id="titulo-ativos" className="secao-titulo">Em andamento</h2>
          <div className="lista-tickets">
            {ativos.map((p) => (
              <TicketAluno key={p.id} pedido={p} agora={agora} aoMudar={recarregar} />
            ))}
          </div>
        </section>
      )}

      {historico.length > 0 && (
        <section aria-labelledby="titulo-historico">
          <h2 id="titulo-historico" className="secao-titulo">Histórico</h2>
          <div className="lista-tickets">
            {historico.map((p) => (
              <TicketAluno key={p.id} pedido={p} agora={agora} aoMudar={recarregar} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TicketAluno({ pedido, agora, aoMudar }: { pedido: Pedido; agora: number; aoMudar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar() {
    setCancelando(true);
    setErro(null);
    try {
      await api(`/pedidos/${pedido.id}/cancelar`, { method: 'PATCH' });
      aoMudar();
    } catch (e) {
      setErro(mensagemDeErro(e));
      aoMudar();
    } finally {
      setCancelando(false);
      setConfirmando(false);
    }
  }

  return (
    <article className={`ticket ticket--${pedido.status.toLowerCase()}`} aria-labelledby={`ped-${pedido.id}`}>
      <div className="ticket__cabeca ticket__cabeca--entre">
        <h3 id={`ped-${pedido.id}`} className="mono ticket__numero">
          {numeroPedido(pedido.id)}
        </h3>
        <SeloStatus status={pedido.status} />
      </div>
      <p className="ticket__meta">
        Feito às {horario(pedido.criadoEm)} · {tempoDesde(pedido.criadoEm, agora)}
      </p>

      {pedido.status === 'PRONTO' && (
        <p className="ticket__chamada">
          <BellRinging size={20} weight="fill" aria-hidden /> Pode retirar no balcão!
        </p>
      )}

      <TrilhaStatus status={pedido.status} />

      <ul className="ticket__itens">
        {pedido.itens.map((i) => (
          <li key={i.id}>
            <span className="mono">{i.quantidade}×</span>
            <span>{i.produto.nome}</span>
            <span className="mono">{brl(i.subtotal)}</span>
          </li>
        ))}
      </ul>
      {pedido.observacao && <p className="ticket__obs">“{pedido.observacao}”</p>}

      <div className="ticket__rodape">
        <span>Total</span>
        <span className="mono ticket__total">{brl(pedido.total)}</span>
      </div>

      {erro && <Aviso>{erro}</Aviso>}

      {pedido.status === 'RECEBIDO' &&
        (confirmando ? (
          <div className="confirmacao" role="group" aria-label="Confirmar cancelamento">
            <span>Cancelar este pedido?</span>
            <button type="button" className="botao botao--perigo botao--pequeno" onClick={cancelar} disabled={cancelando}>
              {cancelando ? 'Cancelando…' : 'Sim, cancelar'}
            </button>
            <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => setConfirmando(false)}>
              Não
            </button>
          </div>
        ) : (
          <button type="button" className="botao botao--fantasma botao--pequeno botao--perigo-texto" onClick={() => setConfirmando(true)}>
            Cancelar pedido
          </button>
        ))}
    </article>
  );
}
