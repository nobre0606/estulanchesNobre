import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { mensagemDeErro } from '../api';
import { paginaInicial, useAuth } from '../auth';
import { Aviso } from '../components/Aviso';
import { CampoSenha, TelaAuth } from '../components/TelaAuth';

export function Cadastro() {
  const { usuario, cadastrar } = useAuth();
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={paginaInicial(usuario)} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro('A senha precisa de pelo menos 8 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      await cadastrar(nome, email, senha);
      navegar('/cardapio', { replace: true });
    } catch (err) {
      setErro(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  return (
    <TelaAuth>
      <h1>Criar conta</h1>
      <p className="auth__sub">Leva meio minuto. Depois é só escolher o lanche.</p>

      <form onSubmit={enviar} className="form" noValidate>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="campo">
          <label htmlFor="nome">Nome</label>
          <input id="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={100} />
        </div>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <CampoSenha
          id="senha"
          valor={senha}
          aoMudar={setSenha}
          autoComplete="new-password"
          dica="Mínimo de 8 caracteres."
        />
        <button className="botao botao--primario botao--largo" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p className="auth__troca">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </TelaAuth>
  );
}
