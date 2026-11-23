import { NavLink, Outlet } from 'react-router';
import { ChefHat, Receipt, SignOut, Storefront, Package } from '@phosphor-icons/react';
import { useAuth } from '../auth';
import { Marca } from './Marca';

export function Layout() {
  const { usuario, sair } = useAuth();
  const admin = usuario?.papel === 'ADMIN';

  const links = admin
    ? [
        { para: '/admin/pedidos', rotulo: 'Fila', Icone: ChefHat },
        { para: '/admin/produtos', rotulo: 'Produtos', Icone: Package },
      ]
    : [
        { para: '/cardapio', rotulo: 'Cardápio', Icone: Storefront },
        { para: '/meus-pedidos', rotulo: 'Meus pedidos', Icone: Receipt },
      ];

  return (
    <div className="app">
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="topo">
        <div className="topo__inner">
          <Marca />
          {admin && <span className="selo-cantina">cantina</span>}
          <nav className="nav" aria-label="Principal">
            {links.map(({ para, rotulo, Icone }) => (
              <NavLink key={para} to={para} className="nav__link">
                <Icone size={20} weight="bold" aria-hidden />
                <span>{rotulo}</span>
              </NavLink>
            ))}
          </nav>
          <div className="topo__usuario">
            <span className="topo__nome" title={usuario?.email}>
              {usuario?.nome.split(' ')[0]}
            </span>
            <button type="button" className="botao-icone" onClick={sair} aria-label="Sair da conta">
              <SignOut size={20} weight="bold" aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <main id="conteudo" className="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
