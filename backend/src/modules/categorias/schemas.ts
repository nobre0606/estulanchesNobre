import { z } from 'zod';

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(60),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;
