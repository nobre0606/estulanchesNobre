// Sessão do usuário: token em memória + localStorage (sobrevive ao F5).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, definirToken, lerToken, quandoSessaoExpirar, type RespostaAuth, type Usuario } from './api';

interface AuthContexto {
  usuario: Usuario | null;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<Usuario>;
  sair: () => void;
}

const Contexto = createContext<AuthContexto | null>(null);
const CHAVE_USUARIO = 'estulanches.usuario';

/** Lê o "exp" do JWT para não reaproveitar um token já vencido. */
function tokenValido(token: string | null) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function usuarioSalvo(): Usuario | null {
  if (!tokenValido(lerToken())) return null;
  try {
    return JSON.parse(localStorage.getItem(CHAVE_USUARIO) ?? 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioSalvo);

  const sair = useCallback(() => {
    definirToken(null);
    localStorage.removeItem(CHAVE_USUARIO);
    setUsuario(null);
  }, []);

  useEffect(() => {
    if (!usuario) definirToken(null);
    quandoSessaoExpirar(sair);
  }, [usuario, sair]);

  const guardar = useCallback((r: RespostaAuth) => {
    definirToken(r.token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(r.usuario));
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const valor = useMemo<AuthContexto>(
    () => ({
      usuario,
      sair,
      entrar: async (email, senha) =>
        guardar(await api<RespostaAuth>('/auth/login', { method: 'POST', body: { email, senha } })),
      cadastrar: async (nome, email, senha) =>
        guardar(await api<RespostaAuth>('/auth/register', { method: 'POST', body: { nome, email, senha } })),
    }),
    [usuario, sair, guardar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

export const paginaInicial = (u: Usuario | null) =>
  !u ? '/login' : u.papel === 'ADMIN' ? '/admin/pedidos' : '/cardapio';
