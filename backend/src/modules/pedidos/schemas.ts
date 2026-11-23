import { z } from 'zod';
import { StatusPedido } from '@prisma/client';

// O cliente manda SÓ produtoId e quantidade. Qualquer outro campo (ex.: preco)
// é descartado pelo zod — preço e total sempre vêm do banco.
const itemSchema = z.object({
  produtoId: z.number().int().positive(),
  quantidade: z.number().int().min(1, 'Quantidade mínima é 1').max(10, 'Máximo de 10 unidades por item'),
});

export const pedidoSchema = z.object({
  itens: z
    .array(itemSchema)
    .min(1, 'O pedido precisa de pelo menos 1 item')
    .max(20, 'Máximo de 20 itens por pedido')
    .refine(
      (itens) => new Set(itens.map((i) => i.produtoId)).size === itens.length,
      'Produto repetido no pedido: ajuste a quantidade',
    ),
  observacao: z.string().trim().max(200).optional(),
});

export const statusSchema = z.object({
  status: z.enum(StatusPedido),
});

export const filaQuerySchema = z.object({
  status: z.enum(StatusPedido).optional(),
});

export type PedidoInput = z.infer<typeof pedidoSchema>;
