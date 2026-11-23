import { z } from 'zod';

export const registroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(100),
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido')).pipe(z.string().max(150)),
  // bcrypt só considera os primeiros 72 bytes
  senha: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  senha: z.string().min(1),
});

export type RegistroInput = z.infer<typeof registroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
