// Seed idempotente: pode rodar várias vezes sem duplicar dados (usa upsert).
// Senhas vêm de variáveis de ambiente — nunca ficam no código.
import { PrismaClient, Papel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function senhaObrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor || valor.length < 8) {
    throw new Error(`Defina ${nome} (mínimo 8 caracteres) para rodar o seed.`);
  }
  return valor;
}

const produtos = [
  { nome: 'Coxinha', descricao: 'Massa de batata com frango desfiado', preco: '6.50', estoque: 40, categoria: 'Salgados' },
  { nome: 'Pão de queijo', descricao: 'Porção com 3 unidades, saído do forno', preco: '4.00', estoque: 60, categoria: 'Salgados' },
  { nome: 'Esfiha de carne', descricao: 'Esfiha aberta de carne temperada', preco: '5.50', estoque: 30, categoria: 'Salgados' },
  { nome: 'Misto quente', descricao: 'Pão de forma, presunto e queijo', preco: '7.00', estoque: 2, categoria: 'Salgados' },
  { nome: 'Suco natural', descricao: 'Laranja ou maracujá, 300 ml', preco: '5.00', estoque: 35, categoria: 'Bebidas' },
  { nome: 'Água mineral', descricao: 'Garrafa 500 ml', preco: '3.00', estoque: 80, categoria: 'Bebidas' },
  { nome: 'Achocolatado', descricao: 'Caixinha 200 ml', preco: '3.50', estoque: 50, categoria: 'Bebidas' },
  { nome: 'Brigadeiro', descricao: 'Brigadeiro de colher no copinho', preco: '3.00', estoque: 45, categoria: 'Doces' },
  { nome: 'Bolo de cenoura', descricao: 'Fatia com cobertura de chocolate', preco: '4.50', estoque: 20, categoria: 'Doces' },
];

async function main() {
  const senhaAdmin = await bcrypt.hash(senhaObrigatoria('SEED_ADMIN_PASSWORD'), 10);
  const senhaAluno = await bcrypt.hash(senhaObrigatoria('SEED_ALUNO_PASSWORD'), 10);

  await prisma.usuario.upsert({
    where: { email: 'cantina@estulanches.local' },
    update: {},
    create: { nome: 'Cantina', email: 'cantina@estulanches.local', senhaHash: senhaAdmin, papel: Papel.ADMIN },
  });
  await prisma.usuario.upsert({
    where: { email: 'aluno@estulanches.local' },
    update: {},
    create: { nome: 'Aluno Demo', email: 'aluno@estulanches.local', senhaHash: senhaAluno, papel: Papel.ALUNO },
  });

  const categorias: Record<string, number> = {};
  for (const nome of ['Salgados', 'Bebidas', 'Doces']) {
    const c = await prisma.categoria.upsert({ where: { nome }, update: {}, create: { nome } });
    categorias[nome] = c.id;
  }

  // Produto não tem campo único além do id; procuramos pelo nome para não duplicar.
  for (const p of produtos) {
    const existe = await prisma.produto.findFirst({ where: { nome: p.nome } });
    if (!existe) {
      await prisma.produto.create({
        data: {
          nome: p.nome,
          descricao: p.descricao,
          preco: p.preco,
          estoque: p.estoque,
          categoriaId: categorias[p.categoria],
        },
      });
    }
  }

  console.log('Seed concluído.');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
