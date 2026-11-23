import { z } from 'zod';

export const produtoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(100),
  descricao: z.string().trim().max(500).nullish(),
  preco: z.number().positive('O preço precisa ser maior que zero').max(99_999_999),
  estoque: z.number().int().min(0, 'Estoque não pode ser negativo'),
  categoriaId: z.number().int().positive(),
  ativo: z.boolean().optional(),
});

// Na edição todos os campos são opcionais
export const produtoUpdateSchema = produtoSchema.partial();

export const cardapioQuerySchema = z.object({
  categoriaId: z.coerce.number().int().positive().optional(),
});

export type ProdutoInput = z.infer<typeof produtoSchema>;
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
