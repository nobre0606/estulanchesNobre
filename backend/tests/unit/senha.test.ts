import { describe, it, expect } from 'vitest';
import { hashSenha, compararSenha } from '../../src/domain/senha';

describe('hashSenha + compararSenha (U8)', () => {
  it('o hash é diferente da senha e a comparação correta retorna true', async () => {
    const hash = await hashSenha('senha-secreta-123');
    expect(hash).not.toBe('senha-secreta-123');
    expect(hash.startsWith('$2')).toBe(true); // formato bcrypt
    expect(await compararSenha('senha-secreta-123', hash)).toBe(true);
  });

  it('senha errada retorna false', async () => {
    const hash = await hashSenha('senha-secreta-123');
    expect(await compararSenha('outra-senha', hash)).toBe(false);
  });
});
