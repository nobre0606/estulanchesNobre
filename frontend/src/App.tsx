import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, paginaInicial, useAuth } from './auth';
import { Layout } from './components/Layout';
import { RotaProtegida } from './components/RotaProtegida';
import { Login } from './pages/Login';
import { Cadastro } from './pages/Cadastro';
import { Cardapio } from './pages/Cardapio';
import { MeusPedidos } from './pages/MeusPedidos';
import { AdminPedidos } from './pages/AdminPedidos';
import { AdminProdutos } from './pages/AdminProdutos';

function Inicio() {
  const { usuario } = useAuth();
  return <Navigate to={paginaInicial(usuario)} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<Layout />}>
            <Route path="/cardapio" element={<RotaProtegida papel="ALUNO"><Cardapio /></RotaProtegida>} />
            <Route path="/meus-pedidos" element={<RotaProtegida papel="ALUNO"><MeusPedidos /></RotaProtegida>} />
            <Route path="/admin/pedidos" element={<RotaProtegida papel="ADMIN"><AdminPedidos /></RotaProtegida>} />
            <Route path="/admin/produtos" element={<RotaProtegida papel="ADMIN"><AdminProdutos /></RotaProtegida>} />
          </Route>
          <Route path="*" element={<Inicio />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
