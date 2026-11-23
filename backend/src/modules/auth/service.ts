import type { PrismaClient, Usuario } from '@prisma/client';
import { ErroApp } from '../../domain/erros';
import { hashSenha, compararSenha } from '../../domain/senha';
import type { LoginInput, RegistroInput } from './schemas';

/** Dados do usuário que podem sair na API (nunca o senhaHash). */
export function usuarioPublico(u: Usuario) {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
}

/** Cadastro público: sempre cria ALUNO, mesmo que o corpo tente mandar papel. */
export async function registrar(prisma: PrismaClient, dados: RegistroInput) {
  const existente = await prisma.usuario.findUnique({ where: { email: dados.email } });
  if (existente) {
    throw new ErroApp(409, 'EMAIL_EM_USO', 'Este e-mail já está cadastrado.');
  }
  const usuario = await prisma.usuario.create({
    data: { nome: dados.nome, email: dados.email, senhaHash: await hashSenha(dados.senha), papel: 'ALUNO' },
  });
  return usuarioPublico(usuario);
}

/** Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem. */
export async function autenticar(prisma: PrismaClient, dados: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email: dados.email } });
  if (!usuario || !(await compararSenha(dados.senha, usuario.senhaHash))) {
    throw new ErroApp(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
  }
  return usuarioPublico(usuario);
}
