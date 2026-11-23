import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Papel } from '../api';
import { paginaInicial, useAuth } from '../auth';

/** Sem login → /login. Papel errado → página inicial do papel dele. */
export function RotaProtegida({ papel, children }: { papel: Papel; children: ReactNode }) {
  const { usuario } = useAuth();
  const local = useLocation();

  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (usuario.papel !== papel) return <Navigate to={paginaInicial(usuario)} replace />;
  return <>{children}</>;
}
