// Cliente HTTP da API: injeta o token JWT e padroniza os erros.

export type Papel = 'ADMIN' | 'ALUNO';
export type Status = 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

export interface Categoria {
  id: number;
  nome: string;
}

export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  preco: string; // dinheiro chega como texto ("6.50") para não perder precisão
  estoque: number;
  ativo: boolean;
  categoriaId: number;
  categoria: Categoria;
}

export interface ItemPedido {
  id: number;
  produtoId: number;
  quantidade: number;
  precoUnitario: string;
  subtotal: string;
  produto: { id: number; nome: string };
}

export interface Pedido {
  id: number;
  status: Status;
  total: string;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  itens: ItemPedido[];
  usuario: { id: string; nome: string };
}

export interface RespostaAuth {
  token: string;
  usuario: Usuario;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const CHAVE_TOKEN = 'estulanches.token';
let token: string | null = localStorage.getItem(CHAVE_TOKEN);
let aoExpirar: (() => void) | null = null;

export function definirToken(novo: string | null) {
  token = novo;
  if (novo) localStorage.setItem(CHAVE_TOKEN, novo);
  else localStorage.removeItem(CHAVE_TOKEN);
}

export function lerToken() {
  return token;
}

/** Chamado quando a API responde 401 com token (sessão expirou). */
export function quandoSessaoExpirar(fn: () => void) {
  aoExpirar = fn;
}

export async function api<T>(caminho: string, opcoes: { method?: string; body?: unknown } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: opcoes.method ?? 'GET',
      headers: {
        ...(opcoes.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'SEM_CONEXAO', 'Sem conexão com o servidor. Tente de novo.');
  }

  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (resposta.status === 401 && token) aoExpirar?.();
    throw new ApiError(
      resposta.status,
      dados?.erro?.codigo ?? 'ERRO',
      dados?.erro?.mensagem ?? 'Não foi possível concluir a ação.',
    );
  }
  return dados as T;
}

export function mensagemDeErro(erro: unknown) {
  return erro instanceof Error ? erro.message : 'Algo deu errado.';
}
