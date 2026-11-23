-- Regras de integridade garantidas pelo próprio banco (última linha de defesa,
-- mesmo que algum bug passe pela validação da API).
ALTER TABLE "produtos"     ADD CONSTRAINT "produtos_preco_positivo"     CHECK ("preco" > 0);
ALTER TABLE "produtos"     ADD CONSTRAINT "produtos_estoque_nao_negativo" CHECK ("estoque" >= 0);
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_quantidade_positiva" CHECK ("quantidade" > 0);
