#!/bin/sh
# Roda toda vez que o container da aplicação inicia.
# set -e: se qualquer passo falhar, o container para (e o Docker mostra o erro)
set -e

echo "[entrypoint] Aplicando migrations do banco..."
# Garante que o banco está na versão certa do schema ANTES de aceitar requisições
npx prisma migrate deploy

if [ "$SEED" = "true" ]; then
  echo "[entrypoint] SEED=true: populando dados iniciais (idempotente)..."
  node dist/prisma/seed.js
fi

echo "[entrypoint] Iniciando o servidor..."
# exec: o Node vira o processo principal (PID 1) e recebe o SIGTERM do Docker,
# permitindo o graceful shutdown
exec node dist/src/server.js
