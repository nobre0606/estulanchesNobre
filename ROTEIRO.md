# Roteiro de Gravação em Vídeo — Implantação do Sistema EstuLanches

* **Atividade:** Atividade Prática (SA): Implantação em Produção do Sistema EstuLanches com Docker
* **Habilidades contempladas:** h13, h15, h4, h7
* **Responsável / Apresentador:** Gustavo Nobre (Técnico de Implantação)
* **Tempo estimado:** ~2 minutos e 30 segundos (limite permitido: 2 a 5 minutos)

---

## 📋 Preparação Antes de Iniciar a Gravação

1. **Containers ativos:** deixe os containers rodando no terminal com `docker compose up -d`.
2. **Navegador aberto:**
   * Aba 1: `http://localhost:3000` deslogada ou na tela de login de Aluno.
   * Aba 2 (guia anônima ou outro navegador): logada como Cantina (`cantina@estulanches.local`).
3. **Editor de código (VS Code):** abas fixadas com `Dockerfile`, `docker-compose.yml` e `docs/RDM.md`.
4. **Terminal:** aba limpa pronta para executar `docker compose ps` e os testes.

---

## ⏱️ Cronograma e Falas do Vídeo

```
[0:00 - 0:20] Bloco 1: Abertura e Problema Solucionado
[0:20 - 0:45] Bloco 2: Dockerfile e Docker Compose
[0:45 - 1:10] Bloco 3: Segurança e Arquitetura do Backend
[1:10 - 1:30] Bloco 4: Execução dos Testes Automatizados
[1:30 - 1:55] Bloco 5: Demonstração do Sistema em Funcionamento
[1:55 - 2:15] Bloco 6: Exibição da Ficha RDM
[2:15 - 2:35] Bloco 7: Escalabilidade Nacional e Encerramento
```

---

### Bloco 1: Abertura e Problema Solucionado `[0:00 - 0:20]`
* **O que mostrar na tela:** Câmera aberta ou visualização do repositório/tela inicial do sistema.
* **O que falar:**
  > *"Olá! Meu nome é Gustavo Nobre, Técnico de Implantação responsável por colocar em produção o sistema **EstuLanches**.*  
  > *Nas cantinas escolares, os intervalos causam filas extensas, perda de tempo, comandas de papel ilegíveis, erros de troco e venda de lanches esgotados. O EstuLanches resolve isso: o aluno pede e acompanha o preparo pelo celular, enquanto a cantina despacha pedidos e controla o estoque de forma ágil e centralizada."*

---

### Bloco 2: Dockerfile e Docker Compose `[0:20 - 0:45]`
* **O que mostrar na tela:** Arquivos `Dockerfile` e `docker-compose.yml` no VS Code.
* **O que falar:**
  > *"Para garantir uma implantação isolada e segura, estruturei um **Dockerfile multi-stage**: ele compila o front-end em React pelo Vite, transpila a API Fastify em TypeScript e sintetiza uma imagem final leve de runtime, executada pelo usuário não-root `node`.*  
  > *No **Docker Compose**, temos dois serviços: a `app` e o banco relacional `db` no PostgreSQL 16. Apenas a porta `3000` da aplicação é exposta para o host; a base de dados opera protegida em uma rede interna e seus dados persistem no volume dedicado `pgdata`."*

---

### Bloco 3: Segurança e Arquitetura do Backend `[0:45 - 1:10]`
* **O que mostrar na tela:** Terminal com `docker compose ps` (ambos *healthy*) e trecho do código do backend (`backend/src/modules/pedidos/service.ts`).
* **O que falar:**
  > *"No backend, as regras de negócio e segurança foram tratadas com rigor:*  
  > *Senhas recebem hash via `bcrypt` e a autenticação opera por tokens JWT de 8 horas. Para impedir manipulação de valores no cliente, o front-end envia apenas o identificador e a quantidade; preços unitários e totais são calculados com autoridade exclusiva do servidor.*  
  > *Além disso, o abatimento de estoque ocorre em transação atômica relacional: se o estoque esgotar durante a compra, ocorre rollback total imediato."*

---

### Bloco 4: Execução dos Testes Automatizados `[1:10 - 1:30]`
* **O que mostrar na tela:** Terminal executando `docker compose --profile test run --rm tests` (ou a saída dos 64 testes aprovados).
* **O que falar:**
  > *"A homologação é comprovada por testes automatizados executados em container isolado contra um banco em memória.*  
  > *São 64 testes aprovados: 28 unitários validando cálculos monetários decimais e a máquina de estados do pedido, e 36 de integração cobrindo fluxos de login, permissões e concorrência. Nossa cobertura superou 97% das linhas e 100% das funções de domínio, ultrapassando com folga a meta mínima de 70%."*

---

### Bloco 5: Demonstração do Sistema em Operação `[1:30 - 1:55]`
* **O que mostrar na tela:** Navegador em `http://localhost:3000`.
  1. Login como aluno (`aluno@estulanches.local`) adicionando produto e concluindo pedido.
  2. Alternar para a aba da cantina (`cantina@estulanches.local`) avançando o pedido de `RECEBIDO` para `EM PREPARO` e `PRONTO`.
* **O que falar:**
  > *"Aqui com a aplicação no ar: o estudante acessa o cardápio com identidade visual moderna, monta o pedido e envia. Na mesma hora, o pedido entra na fila da cantina dividida por colunas de status. A equipe avança a preparação em tempo real e o aluno é notificado para retirar no balcão sem enfrentar aglomeração."*

---

### Bloco 6: Exibição da Ficha RDM `[1:55 - 2:15]`
* **O que mostrar na tela:** Arquivo `docs/RDM.md` ou o PDF da Ficha Simplificada de Registro de Mudança.
* **O que falar:**
  > *"Todo o processo está documentado na **Ficha RDM**: versão v1.0.0, data, variáveis de ambiente configuradas, auditoria de zero erros nos logs e o registro de conformidade de todos os 9 testes de validação.*  
  > *Também estruturamos o plano de rollback: dump preventivo com `pg_dump`, retorno rápido de versão pelo Compose e restauração garantida sem perda de dados."*

---

### Bloco 7: Escalabilidade Nacional e Encerramento `[2:15 - 2:35]`
* **O que mostrar na tela:** Diagrama de arquitetura no `README.md` ou câmera.
* **O que falar:**
  > *"Em termos conceituais de escala para o Brasil inteiro — com 1 milhão de cadastros e 100 mil acessos concorrentes no recreio:*  
  > *A API stateless em JWT viabiliza dezenas de réplicas em Kubernetes com HPA e balanceamento de carga; o front-end e cardápio operam sob CDN e cache Redis; o PostgreSQL adota cluster multi-zona com pool de conexões PgBouncer; e usamos filas assíncronas para amortecer o pico do intervalo.*  
  > *A implantação está 100% concluída. O link do repositório está na descrição. Muito obrigado!"*

---

## 📌 Lembretes Finais para o Envio
* [ ] Incluir o link do repositório GitHub nos comentários do vídeo ou na descrição da entrega.
* [ ] Conferir que o arquivo `docs/RDM.pdf` (ou `docs/RDM.md`) esteja commitado no GitHub.
* [ ] O vídeo deve ter entre 2 e 5 minutos (este roteiro fica em ~2m30s).
