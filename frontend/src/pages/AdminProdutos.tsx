import { useState, type FormEvent } from 'react';
import { Minus, Pencil, Plus, X } from '@phosphor-icons/react';
import { api, mensagemDeErro, type Categoria, type Produto } from '../api';
import { useDados } from '../hooks';
import { brl } from '../format';
import { Aviso } from '../components/Aviso';

interface Formulario {
  nome: string;
  descricao: string;
  preco: string;
  estoque: string;
  categoriaId: string;
}

const VAZIO: Formulario = { nome: '', descricao: '', preco: '', estoque: '0', categoriaId: '' };

export function AdminProdutos() {
  const produtos = useDados(() => api<Produto[]>('/admin/produtos'));
  const categorias = useDados(() => api<Categoria[]>('/categorias'));
  const [editando, setEditando] = useState<Produto | 'novo' | null>(null);
  const [erroLinha, setErroLinha] = useState<string | null>(null);

  async function atualizar(p: Produto, dados: Partial<Produto>) {
    setErroLinha(null);
    try {
      await api(`/produtos/${p.id}`, { method: 'PUT', body: dados });
    } catch (e) {
      setErroLinha(`${p.nome}: ${mensagemDeErro(e)}`);
    }
    produtos.recarregar();
  }

  async function desativar(p: Produto) {
    setErroLinha(null);
    try {
      await api(`/produtos/${p.id}`, { method: 'DELETE' });
    } catch (e) {
      setErroLinha(`${p.nome}: ${mensagemDeErro(e)}`);
    }
    produtos.recarregar();
  }

  return (
    <div className="pagina-larga">
      <header className="pagina-topo pagina-topo--linha">
        <div>
          <p className="sobretitulo">Painel da cantina</p>
          <h1>Produtos e estoque</h1>
        </div>
        {editando === null && (
          <button type="button" className="botao botao--primario" onClick={() => setEditando('novo')}>
            <Plus size={18} weight="bold" aria-hidden /> Novo produto
          </button>
        )}
      </header>

      {editando !== null && (
        <FormProduto
          produto={editando === 'novo' ? null : editando}
          categorias={categorias.dados ?? []}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            produtos.recarregar();
          }}
        />
      )}

      {produtos.erro && <Aviso>{produtos.erro}</Aviso>}
      {erroLinha && <Aviso>{erroLinha}</Aviso>}

      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr>
              <th scope="col">Produto</th>
              <th scope="col">Categoria</th>
              <th scope="col" className="num">Preço</th>
              <th scope="col" className="num">Estoque</th>
              <th scope="col">Situação</th>
              <th scope="col"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {produtos.dados?.map((p) => (
              <tr key={p.id} className={p.ativo ? '' : 'tabela__inativo'}>
                <td data-rotulo="Produto">
                  <b>{p.nome}</b>
                  {p.descricao && <small className="tabela__desc">{p.descricao}</small>}
                </td>
                <td data-rotulo="Categoria">{p.categoria.nome}</td>
                <td data-rotulo="Preço" className="num mono">{brl(p.preco)}</td>
                <td data-rotulo="Estoque" className="num">
                  <div className="contador contador--tabela" role="group" aria-label={`Estoque de ${p.nome}`}>
                    <button
                      type="button"
                      onClick={() => atualizar(p, { estoque: p.estoque - 1 })}
                      disabled={p.estoque === 0}
                      aria-label={`Diminuir estoque de ${p.nome}`}
                    >
                      <Minus size={14} weight="bold" aria-hidden />
                    </button>
                    <output className={`mono ${p.estoque === 0 ? 'estoque--zero' : p.estoque <= 3 ? 'estoque--baixo' : ''}`}>
                      {p.estoque}
                    </output>
                    <button
                      type="button"
                      onClick={() => atualizar(p, { estoque: p.estoque + 1 })}
                      aria-label={`Aumentar estoque de ${p.nome}`}
                    >
                      <Plus size={14} weight="bold" aria-hidden />
                    </button>
                  </div>
                </td>
                <td data-rotulo="Situação">
                  <span className={`selo ${p.ativo ? 'selo--pronto' : 'selo--entregue'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td className="tabela__acoes">
                  <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => setEditando(p)}>
                    <Pencil size={16} weight="bold" aria-hidden /> Editar<span className="sr-only"> {p.nome}</span>
                  </button>
                  {p.ativo ? (
                    <button type="button" className="botao botao--fantasma botao--pequeno botao--perigo-texto" onClick={() => desativar(p)}>
                      Desativar<span className="sr-only"> {p.nome}</span>
                    </button>
                  ) : (
                    <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => atualizar(p, { ativo: true })}>
                      Reativar<span className="sr-only"> {p.nome}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormProduto({
  produto,
  categorias,
  aoFechar,
  aoSalvar,
}: {
  produto: Produto | null;
  categorias: Categoria[];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [f, setF] = useState<Formulario>(
    produto
      ? {
          nome: produto.nome,
          descricao: produto.descricao ?? '',
          preco: produto.preco,
          estoque: String(produto.estoque),
          categoriaId: String(produto.categoriaId),
        }
      : { ...VAZIO, categoriaId: categorias[0] ? String(categorias[0].id) : '' },
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const campo = (nome: keyof Formulario) => ({
    value: f[nome],
    onChange: (e: { target: { value: string } }) => setF({ ...f, [nome]: e.target.value }),
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const corpo = {
      nome: f.nome,
      descricao: f.descricao.trim() || null,
      preco: Number(f.preco.replace(',', '.')),
      estoque: Number(f.estoque),
      categoriaId: Number(f.categoriaId),
    };
    try {
      if (produto) await api(`/produtos/${produto.id}`, { method: 'PUT', body: corpo });
      else await api('/produtos', { method: 'POST', body: corpo });
      aoSalvar();
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  }

  return (
    <form className="ticket form-produto" onSubmit={enviar} aria-labelledby="titulo-form">
      <div className="ticket__cabeca ticket__cabeca--entre">
        <h2 id="titulo-form">{produto ? `Editar ${produto.nome}` : 'Novo produto'}</h2>
        <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar formulário">
          <X size={20} weight="bold" aria-hidden />
        </button>
      </div>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="form-produto__grade">
        <div className="campo campo--largo">
          <label htmlFor="p-nome">Nome</label>
          <input id="p-nome" required maxLength={100} {...campo('nome')} />
        </div>
        <div className="campo">
          <label htmlFor="p-cat">Categoria</label>
          <select id="p-cat" required {...campo('categoriaId')}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="p-preco">Preço (R$)</label>
          <input id="p-preco" inputMode="decimal" required placeholder="6,50" {...campo('preco')} />
        </div>
        <div className="campo">
          <label htmlFor="p-estoque">Estoque</label>
          <input id="p-estoque" type="number" min={0} step={1} required {...campo('estoque')} />
        </div>
        <div className="campo campo--largo">
          <label htmlFor="p-desc">Descrição <span className="opcional">(opcional)</span></label>
          <textarea id="p-desc" rows={2} maxLength={500} {...campo('descricao')} />
        </div>
      </div>
      <div className="form-produto__acoes">
        <button type="button" className="botao botao--fantasma" onClick={aoFechar}>
          Cancelar
        </button>
        <button className="botao botao--primario" disabled={salvando}>
          {salvando ? 'Salvando…' : produto ? 'Salvar alterações' : 'Criar produto'}
        </button>
      </div>
    </form>
  );
}
