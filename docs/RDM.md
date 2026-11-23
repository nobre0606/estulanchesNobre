---
pdf_options:
  format: A4
  margin: 9mm 11mm
  printBackground: true
css: |-
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 8.3pt; line-height: 1.25; color: #0f172a; }
  h1 { font-size: 14pt; margin: 0 0 2px; border-bottom: 2px solid #4f46e5; padding-bottom: 3px; color: #0f172a; }
  h2 { font-size: 9.5pt; margin: 6px 0 2px; color: #4f46e5; }
  table { border-collapse: collapse; width: 100%; margin: 0 !important; }
  th, td { border: 1px solid #cbd5e1; padding: 2px 5px !important; vertical-align: top; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; color: #1e293b; }
  code { font-family: Consolas, monospace; font-size: 7.6pt !important; background: #f8fafc; padding: 0 2px !important; }
  p, ul { margin: 2px 0; } ul { padding-left: 16px; }
---

# Formulário de Registro de Mudança (RDM) — EstuLanches

| Atributo | Detalhamento Operacional |
|---|---|
| **Solução / Sistema** | EstuLanches — Plataforma Digital de Cardápio e Gestão da Fila de Atendimento Escolar |
| **Responsável Técnico** | Gustavo Nobre — Analista de Implantação e Infraestrutura |
| **Classificação da Mudança** | Mudança Padrão — Publicação inicial do ecossistema conteinerizado via Docker Compose |
| **Artefato Implantado** | Release v1.0.0 · Imagem `estulanches-app:1.0.0` (Digest `sha256:2c79e2270b9a`) · Hash do commit `3f82318` |
| **Janela de Execução** | 22/11/2026 · Período: 12:53 às 12:56 (Horário de Brasília) |
| **Infraestrutura Hospedeira** | Windows 11 Pro + Docker Desktop (WSL2, arquitetura linux/amd64) · Docker Engine 29.9.3 · Docker Compose v5.7.0 · Runtime Node 22.23.5 · PostgreSQL 16.16 |
| **Topologia de Serviços** | `app` (Fastify + build React, porta 3000) e `db` (postgres:16-alpine, porta restrita interna, volume persistente `pgdata`) |

## Parâmetros e Variáveis Estabelecidas

| Diretiva de Configuração | Definição Aplicada | Diretiva de Configuração | Definição Aplicada |
|---|---|---|---|
| `NODE_ENV` | production | `JWT_EXPIRES_IN` | 8h |
| `APP_PORT` | 3000 | `CORS_ORIGIN` | http://localhost:3000 |
| `POSTGRES_DB` / `POSTGRES_USER` | estulanches | `RATE_LIMIT_LOGIN` | 5 requisições/minuto por IP |
| `POSTGRES_PASSWORD`, `DATABASE_URL` | Carregado via arquivo .env | `SEED` | true |
| `JWT_SECRET` | Carregado via arquivo .env | `SEED_ADMIN_PASSWORD`, `SEED_ALUNO_PASSWORD` | Carregado via arquivo .env |

Restrições operacionais aplicadas: Alocação máxima de 512 MB de RAM / 1 núcleo de CPU para `app` · 512 MB de RAM para `db` · Política `restart: unless-stopped` · Execução interna do processo `app` delegada ao usuário sem privilégios `node`.

## Roteiro de Testes e Homologação (Evidências em `docs/evidencias/`)

| Item | Instrução Executada | Critério de Aceite | Resultado Aferido |
|---|---|---|---|
| 1 | `docker compose build` | Geração íntegra das camadas da imagem sem inconsistências | Conforme — Artefato `estulanches-app:1.0.0` sintetizado com êxito |
| 2 | `docker compose up -d` + `ps` | Serviços instanciados e sinalizando condição *healthy* | Conforme — Instâncias operacionais e saudáveis; inicialização do app em ~9s |
| 3 | `docker compose logs db/app --tail=100` | Processamento de migrations, injeção de seed e escuta HTTP ativa | Conforme — 2 migrações estruturais aplicadas, carga de dados concluída, servidor escutando na porta 3000 |
| 4 | `grep -i -E "error\|fatal\|panic"` nos logs | Nenhuma menção a incidentes críticos nos registros de saída | Conforme — Zero inconformidades registradas em ambos os serviços |
| 5 | `curl -s localhost:3000/api/health` | Emissão de payload `{"status":"ok","db":"up"}` | Conforme — Endpoint responde com sucesso e status do banco ativo |
| 6 | `docker compose --profile test run --rm tests` | Execução bem-sucedida de toda a suíte com cobertura mínima de 70% | Conforme — 64 testes aprovados (28 unitários, 36 de integração); coberturas: 97,19% statements · 93,33% branches · 100% funções |
| 7 | Requisições via curl: Autenticação aluno → Submissão de pedido → Login cantina → Transição de fase | Status 201, cálculo soberano pelo backend, status 200 | Conforme — Pedido #1 totalizado em R$ 18,00 (preço forjado no cliente desconsiderado), saldo do item abatido de 40 para 38, avanço regular RECEBIDO→EM_PREPARO→PRONTO; transição ilícita rejeitada com 422 |
| 8 | Execução de `docker compose down` (sem flag `-v`) seguido de `up -d` | Manutenção da persistência das transações no banco de dados | Conforme — Pedido #1 preservado intacto (PRONTO, R$ 18,00); rotina de seed manteve a integridade sem duplicar registros |
| 9 | `docker image ls estulanches-app` | Registro do identificador da imagem e tag 1.0.0 no repositório local | Conforme — Tag 1.0.0 presente, com tamanho de 159 MB (camadas da aplicação) e 661 MB totais em disco |

## Diretrizes de Contingência e Reversão (Plano de Rollback)

1. **Procedimento Preventivo Obrigatório:** antes da subida de qualquer versão subsequente, extrair o dump completo da base relacional: `docker compose exec -T db sh -c 'pg_dump -U $POSTGRES_USER $POSTGRES_DB' > backup_AAAAMMDD.sql`.
2. **Reversão do Artefato da Aplicação:** no arquivo `docker-compose.yml`, redirecionar a propriedade `image:` para o identificador anterior estável (exemplo: `estulanches-app:1.0.0`) e reiniciar com `docker compose up -d app` — dispensando nova etapa de compilação, uma vez que a versão prévia permanece no cache do host.
3. **Tratamento de Incompatibilidade de Esquema (Migrations):** executar `docker compose down`, reiniciar a instância limpa do banco e carregar o arquivo de segurança: `docker compose exec -T db sh -c 'psql -U $POSTGRES_USER $POSTGRES_DB' < backup_AAAAMMDD.sql`.
4. **Homologação Pós-Recuperação:** confirmar status com `docker compose ps` (ambos *healthy*) e requisição a `curl localhost:3000/api/health`. Estando diante da publicação inicial da plataforma, o plano de reversão para esta versão v1.0.0 consiste no encerramento e remoção dos contêineres via `docker compose down`.

## Parecer e Encerramento

**Implantação Concluída e Homologada com Êxito** — todos os 9 passos de validação técnica foram rigorosamente atendidos, com ausência de falhas nos registros de telemetria; ambiente disponibilizado para utilização através do endereço http://localhost:3000.
