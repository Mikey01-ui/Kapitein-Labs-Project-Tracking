#!/bin/sh
set -e

cd /app

npx prisma migrate deploy --schema=server/prisma/schema.prisma

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "RUN_SEED=true — creating the initial admin if the database is empty"
  npm run prisma:seed --workspace=server
fi

exec node server/dist/server.js
