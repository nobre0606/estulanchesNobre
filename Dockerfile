# syntax=docker/dockerfile:1
# =============================================================================
# EstuLanches — imagem única da aplicação (API Fastify + front React compilado)
# Multi-stage: ferramentas de build e devDependencies ficam nos estágios
# intermediários e NÃO vão para a imagem final de produção.
# =============================================================================

# -----------------------------------------------------------------------------
# Estágio 1 — web-build: compila o front-end React (Vite) para arquivos estáticos
# -----------------------------------------------------------------------------
# Versão fixa da imagem base = build reproduzível
FROM node:22-alpine AS web-build
WORKDIR /web
# Copia só os package*.json primeiro: se o código mudar mas as dependências não,
# o Docker reaproveita o cache desta camada e não roda "npm ci" de novo.
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Estágio 2 — api-build: instala dependências, gera o Prisma Client e compila o TS
# -----------------------------------------------------------------------------
FROM node:22-alpine AS api-build
# O Prisma precisa do OpenSSL no Alpine para baixar o engine certo (musl + openssl 3)
RUN apk add --no-cache openssl
ENV CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/tsconfig*.json ./
COPY backend/src ./src
RUN npx tsc -p tsconfig.build.json

# -----------------------------------------------------------------------------
# Estágio 3 — test: mesma base do build + código de testes.
# Usado pelo serviço "tests" do compose (profile test), contra o Postgres db-test.
# -----------------------------------------------------------------------------
FROM api-build AS test
COPY backend/vitest.config.mts ./
COPY backend/tests ./tests
ENV NODE_ENV=test
CMD ["npm", "run", "test:all"]

# -----------------------------------------------------------------------------
# Estágio auxiliar — prod-deps: remove as devDependencies (TypeScript, Vitest...)
# O CLI do Prisma fica em "dependencies" porque o "migrate deploy" roda no start.
# -----------------------------------------------------------------------------
FROM api-build AS prod-deps
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Estágio 4 — runtime: imagem final de produção, só com o necessário para rodar
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    PORT=3000 \
    PUBLIC_DIR=/app/public \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false
# (as três últimas só silenciam avisos de "nova versão" que poluem o log)
WORKDIR /app

# Arquivos pertencem ao usuário "node" (não root), que já existe na imagem oficial
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=api-build --chown=node:node /app/package.json ./
COPY --from=api-build --chown=node:node /app/prisma ./prisma
COPY --from=api-build --chown=node:node /app/dist ./dist
# Build do front servido pela própria API como arquivos estáticos
COPY --from=web-build --chown=node:node /web/dist ./public
COPY --chown=node:node backend/docker-entrypoint.sh ./
# Remove CR do Windows (CRLF) por segurança e torna o script executável
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Segurança: se a aplicação for invadida, o atacante NÃO é root no container
USER node

EXPOSE 3000

# O Docker considera o container "healthy" só se a API responde E o banco está ok.
# 127.0.0.1 (e não "localhost") porque o servidor escuta em IPv4 (0.0.0.0).
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Entrypoint: aplica migrations → seed opcional → inicia o servidor
ENTRYPOINT ["./docker-entrypoint.sh"]
