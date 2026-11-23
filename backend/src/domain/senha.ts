// Hash de senha com bcrypt (custo 10). A senha em texto puro nunca é salva.
import bcrypt from 'bcryptjs';

const CUSTO = 10;

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO);
}

export function compararSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
