#!/usr/bin/env bash
# Pre-ship Block A — requires Stripe test keys in .env and API in Docker.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Starting Docker stack (postgres, redis, migrate, api, worker)"
docker compose up -d --build

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env and add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> Running Block A E2E test against http://localhost:8080"
API_URL=http://localhost:8080 make stripe-block-a
