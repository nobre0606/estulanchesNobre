import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { mensagemDeErro } from '../api';
import { paginaInicial, useAuth } from '../auth';
import { Aviso } from '../components/Aviso';
import { CampoSenha, TelaAuth } from '../components/TelaAuth';

const DEMOS = [
  { rotulo: 'Aluno', email: 'aluno@estulanches.local' },
  { rotulo: 'Cantina', email: 'cantina@estulanches.local' },
];

export function Login() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={paginaInicial(usuario)} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const u = await entrar(email, senha);
      const destino = (local.state as { de?: string } | null)?.de;
      navegar(destino && destino !== '/login' ? destino : paginaInicial(u), { replace: true });
    } catch (err) {
      setErro(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  return (
    <TelaAuth>
      <h1>Entrar</h1>
      <p className="auth__sub">Use o e-mail da escola para fazer seu pedido.</p>

      <form onSubmit={enviar} className="form" noValidate>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <CampoSenha id="senha" valor={senha} aoMudar={setSenha} autoComplete="current-password" />
        <button className="botao botao--primario botao--largo" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="auth__troca">
        Primeira vez por aqui? <Link to="/cadastro">Criar conta de aluno</Link>
      </p>

      <div className="demo">
        <p className="demo__titulo">Contas de demonstração</p>
        <div className="demo__opcoes">
          {DEMOS.map((d) => (
            <button key={d.email} type="button" className="chip" onClick={() => setEmail(d.email)}>
              {d.rotulo}
            </button>
          ))}
        </div>
        <small>Preenche o e-mail. A senha está no arquivo .env do servidor.</small>
      </div>
    </TelaAuth>
  );
}
