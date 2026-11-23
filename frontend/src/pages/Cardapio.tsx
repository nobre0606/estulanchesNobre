import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Minus, Plus, Receipt, ArrowRight } from '@phosphor-icons/react';
import { api, mensagemDeErro, type Categoria, type Pedido, type Produto } from '../api';
import { useAuth } from '../auth';
import { useDados } from '../hooks';
import { brl, centavos, numeroPedido } from '../format';
import { Aviso } from '../components/Aviso';
import { IconeCategoria } from '../components/IconeCategoria';

const MAX_POR_ITEM = 10; // mesma regra da API

export function Cardapio() {
  const { usuario } = useAuth();
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const categorias = useDados(() => api<Categoria[]>('/categorias'));
  // O filtro usa o próprio endpoint: GET /produtos?categoriaId=
  const produtos = useDados(
    () => api<Produto[]>(`/produtos${categoriaId ? `?categoriaId=${categoriaId}` : ''}`),
    undefined,
    categoriaId,
  );
  const [carrinho, setCarrinho] = useState<Record<number, number>>({});
  const [conhecidos, setConhecidos] = useState<Record<number, Produto>>({});
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<Pedido | null>(null);

  const filtrar = (id: number | null) => setCategoriaId(id);

  function alterar(produto: Produto, delta: number) {
    setErro(null);
    setCriado(null);
    setConhecidos((c) => ({ ...c, [produto.id]: produto }));
    setCarrinho((c) => {
      const qtd = Math.min(MAX_POR_ITEM, Math.max(0, (c[produto.id] ?? 0) + delta));
      const novo = { ...c };
      if (qtd === 0) delete novo[produto.id];
      else novo[produto.id] = qtd;
      return novo;
    });
  }

  // Agrupa por categoria para montar o "quadro" do cardápio
  const grupos = useMemo(() => {
    const mapa = new Map<string, Produto[]>();
    for (const p of produtos.dados ?? []) {
      mapa.set(p.categoria.nome, [...(mapa.get(p.categoria.nome) ?? []), p]);
    }
    return [...mapa.entries()];
  }, [produtos.dados]);

  const itens = Object.entries(carrinho)
    .map(([id, qtd]) => ({ produto: conhecidos[Number(id)], qtd }))
    .filter((i) => i.produto);
  const totalCentavos = itens.reduce((s, i) => s + centavos(i.produto.preco) * i.qtd, 0);
  const totalItens = itens.reduce((s, i) => s + i.qtd, 0);

  async function fazerPedido() {
    setEnviando(true);
    setErro(null);
    try {
      // Só id e quantidade: preço e total quem calcula é o servidor
      const pedido = await api<Pedido>('/pedidos', {
        method: 'POST',
        body: {
          itens: itens.map((i) => ({ produtoId: i.produto.id, quantidade: i.qtd })),
          observacao: observacao.trim() || undefined,
        },
      });
      setCriado(pedido);
      setCarrinho({});
      setObservacao('');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
      produtos.recarregar(); // estoque mudou
    }
  }

  return (
    <div className="cardapio">
      <section className="cardapio__menu">
        <header className="pagina-topo">
          <p className="sobretitulo">Cardápio de hoje</p>
          <h1>Bom intervalo, {usuario?.nome.split(' ')[0]}.</h1>
          <p className="pagina-topo__sub">Escolha, peça e retire no balcão quando o status ficar <b>Pronto</b>.</p>
        </header>

        <div className="filtros" role="group" aria-label="Filtrar por categoria">
          <button type="button" className="chip" aria-pressed={categoriaId === null} onClick={() => filtrar(null)}>
            Tudo
          </button>
          {categorias.dados?.map((c) => (
            <button
              type="button"
              key={c.id}
              className="chip"
              aria-pressed={categoriaId === c.id}
              onClick={() => filtrar(c.id)}
            >
              <IconeCategoria nome={c.nome} size={18} /> {c.nome}
            </button>
          ))}
        </div>

        {produtos.erro && <Aviso>{produtos.erro}</Aviso>}
        {!produtos.dados && !produtos.erro && <EsqueletoMenu />}
        {produtos.dados?.length === 0 && (
          <div className="vazio">
            <p>Nada disponível nessa categoria agora.</p>
          </div>
        )}

        {grupos.map(([categoria, lista]) => (
          <section key={categoria} className="grupo" aria-labelledby={`cat-${categoria}`}>
            <h2 id={`cat-${categoria}`} className="grupo__titulo">
              <span className="grupo__icone">
                <IconeCategoria nome={categoria} size={22} />
              </span>
              {categoria}
            </h2>
            <ul className="menu">
              {lista.map((p) => {
                const qtd = carrinho[p.id] ?? 0;
                return (
                  <li key={p.id} className={`menu__item ${qtd ? 'menu__item--no-carrinho' : ''}`}>
                    <div className="menu__texto">
                      <div className="menu__linha">
                        <h3 className="menu__nome">{p.nome}</h3>
                        <span className="menu__pontos" aria-hidden />
                        <span className="menu__preco mono">{brl(p.preco)}</span>
                      </div>
                      {p.descricao && <p className="menu__desc">{p.descricao}</p>}
                      {p.estoque <= 3 && <p className="menu__aviso">Restam {p.estoque}</p>}
                    </div>
                    <div className="menu__acao">
                      {qtd === 0 ? (
                        <button type="button" className="botao botao--contorno botao--pequeno" onClick={() => alterar(p, 1)}>
                          <Plus size={16} weight="bold" aria-hidden />
                          <span className="rotulo-adicionar">
                            Adicionar<span className="sr-only"> {p.nome}</span>
                          </span>
                        </button>
                      ) : (
                        <div className="contador" role="group" aria-label={`Quantidade de ${p.nome}`}>
                          <button type="button" onClick={() => alterar(p, -1)} aria-label={`Remover um ${p.nome}`}>
                            <Minus size={16} weight="bold" aria-hidden />
                          </button>
                          <output className="mono" aria-live="polite">{qtd}</output>
                          <button
                            type="button"
                            onClick={() => alterar(p, 1)}
                            disabled={qtd >= MAX_POR_ITEM}
                            aria-label={`Adicionar mais um ${p.nome}`}
                          >
                            <Plus size={16} weight="bold" aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </section>

      <aside id="comanda" className="comanda-area" aria-label="Sua comanda">
        <div className="ticket comanda">
          <div className="ticket__cabeca">
            <Receipt size={22} weight="duotone" aria-hidden />
            <h2>Sua comanda</h2>
          </div>

          {criado ? (
            <div className="comanda__sucesso">
              <Aviso tipo="sucesso">
                Pedido <b className="mono">{numeroPedido(criado.id)}</b> enviado para a cantina. Total{' '}
                <b className="mono">{brl(criado.total)}</b>.
              </Aviso>
              <Link to="/meus-pedidos" className="botao botao--primario botao--largo">
                Acompanhar pedido <ArrowRight size={18} weight="bold" aria-hidden />
              </Link>
            </div>
          ) : itens.length === 0 ? (
            <p className="comanda__vazia">Toque em “Adicionar” para montar seu pedido.</p>
          ) : (
            <>
              <ul className="comanda__itens">
                {itens.map(({ produto, qtd }) => (
                  <li key={produto.id}>
                    <span className="mono comanda__qtd">{qtd}×</span>
                    <span className="comanda__nome">{produto.nome}</span>
                    <span className="mono">{brl(centavos(produto.preco) * qtd, true)}</span>
                  </li>
                ))}
              </ul>
              <div className="campo">
                <label htmlFor="obs">Observação <span className="opcional">(opcional)</span></label>
                <textarea
                  id="obs"
                  rows={2}
                  maxLength={200}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex.: suco sem açúcar"
                />
              </div>
            </>
          )}

          {erro && <Aviso>{erro}</Aviso>}

          {!criado && (
            <>
              <div className="comanda__total">
                <span>Total</span>
                <span className="mono">{brl(totalCentavos, true)}</span>
              </div>
              <button
                type="button"
                className="botao botao--primario botao--largo"
                disabled={itens.length === 0 || enviando}
                onClick={fazerPedido}
              >
                {enviando ? 'Enviando…' : 'Fazer pedido'}
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Barra fixa no celular: resumo do carrinho sempre à mão */}
      {totalItens > 0 && !criado && (
        <a href="#comanda" className="barra-carrinho">
          <span>
            <b>{totalItens}</b> {totalItens === 1 ? 'item' : 'itens'}
          </span>
          <span className="mono">{brl(totalCentavos, true)}</span>
          <span className="barra-carrinho__acao">
            Ver comanda <ArrowRight size={16} weight="bold" aria-hidden />
          </span>
        </a>
      )}
    </div>
  );
}

function EsqueletoMenu() {
  return (
    <div className="esqueleto" aria-label="Carregando cardápio" role="status">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="esqueleto__linha" />
      ))}
    </div>
  );
}
