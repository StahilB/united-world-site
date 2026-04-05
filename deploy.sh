#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> git pull"
git pull

echo "==> docker compose build"
docker compose build

echo "==> docker compose up -d"
docker compose up -d

echo "==> Next.js rebuild inside container (ISR / production bundle)"
docker compose exec nextjs npm run build

echo "==> done"
