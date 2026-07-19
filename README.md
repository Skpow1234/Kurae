# Kurae

Social commerce platform for launching limited product drops, countdowns, waitlists, checkout, inventory limits, referrals, and campaign analytics. Japanese-inspired clothing — scarce, visual, culture-forward.

## Repositories

Kurae is split into two independent repos. **Both are required for local development** — the web app talks to the API; there is no mock or offline mode.

| Repo | Description | Deploy |
|------|-------------|--------|
| [kurae-web](./kurae-web/) | Next.js storefront and seller dashboard | Vercel |
| [kurae-api](./kurae-api/) | Go REST API, webhooks, workers, migrations | Fly.io / Render / AWS |

## Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Go, PostgreSQL, Redis (Docker locally)
- **Payments:** Stripe, Mercado Pago, Wompi, and PayU
- **Storage:** S3-compatible when configured; data-URL images in local dev without S3
- **Email:** Resend / Postmark
- **Analytics:** First-party campaign analytics + PostHog
- **Queue:** Redis for checkout events, emails, reservation expiry, rate limits, and JWT revocation

## Architecture

- **kurae-web** serves seller storefronts, public drop pages, buyer accounts, checkout UI, and the seller dashboard. Browser calls go through Next.js BFF routes (`/api/*`) which proxy to kurae-api with buyer or seller JWT cookies.
- **kurae-api** runs in **Docker** locally (Postgres, Redis, API, worker). Business logic, payment-provider webhooks, inventory reservations, distributed rate limits, email jobs, and reservation expiry live here.
- Contract: OpenAPI spec at `kurae-api/internal/httpapi/openapi.yaml` (Swagger UI at `/swagger/`).

## Getting started

Run **both** sides. Quick path below; deep docs live in each folder README.

### Start the API (Docker)

Full guide: [kurae-api → Development (Docker)](./kurae-api/README.md#development-docker)

```bash
cd kurae-api
cp .env.example .env
make docker-up      # postgres, redis, migrate, api, worker
make docker-seed    # demo + test catalog (optional, idempotent)
```

- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger/
- Health: `curl http://localhost:8080/health`

More: [Useful Docker commands](./kurae-api/README.md#useful-docker-commands) · [Environment variables](./kurae-api/README.md#environment-variables) · [Stripe Block A](./kurae-api/README.md#stripe-block-a-e2e) · [Testing](./kurae-api/README.md#testing)

### Start the web

Full guide: [kurae-web → Development](./kurae-web/README.md#development)

```bash
cd kurae-web
cp .env.example .env.local
npm install
npm run dev
```

- App: http://localhost:3000

More: [Useful npm commands](./kurae-web/README.md#useful-npm-commands) · [Local test accounts](./kurae-web/README.md#local-test-accounts) · [Stripe browser checkout](./kurae-web/README.md#stripe-checkout-browser) · [Routes](./kurae-web/README.md#routes) · [Environment variables](./kurae-web/README.md#environment-variables)

### Local test accounts (after seed)

| Role | Login | Open |
|------|-------|------|
| Seller | `test.seller@kurae.dev` / `KuraeTest123!` | [/dashboard](http://localhost:3000/dashboard), [/kurae-test-store](http://localhost:3000/kurae-test-store) |
| Buyer | `test.buyer@kurae.dev` / `KuraeTest123!` | [/login](http://localhost:3000/login) |

Hana Studio demo: `demo@hana.studio` / `demo1234`. Details: [web test accounts](./kurae-web/README.md#local-test-accounts).

## Useful commands (cheat sheet)

Run API commands from `kurae-api/`. Run web commands from `kurae-web/`.

### API — Docker (`kurae-api`)

| Command | What it does |
|---------|----------------|
| `make docker-up` | Build and start postgres, redis, migrate, api, worker |
| `make docker-down` | Stop the stack |
| `make docker-restart-api` | Rebuild and restart API after Go code changes |
| `make docker-restart-worker` | Rebuild and restart worker |
| `make docker-logs` | Follow API + worker logs |
| `make docker-seed` | Rebuild seed image and load demo/test data (idempotent) |
| `make deps-up` | Start only postgres + redis |
| `make deps-restart` | Restart postgres + redis |
| `make deps-down` | Same as `docker-down` |
| `make migrate-up` | Apply migrations on the host (needs Go + `DATABASE_URL`) |
| `make migrate-down` | Roll back one migration on the host |
| `make seed` | Seed via host `go run` (not Docker) |
| `make run-api` / `make run-worker` | Run API/worker on the host against Docker deps |
| `make test` | `go test ./...` |
| `make stripe-block-a` | Stripe Block A E2E against a running API |
| `make build` | Build `bin/api` and `bin/worker` |
| `curl http://localhost:8080/health` | Deep health (Postgres + Redis) |
| `docker compose logs -f api worker` | Same as `make docker-logs` |
| `docker compose exec -T postgres psql -U kurae -d kurae` | Open Postgres shell |

Canonical list with context: [kurae-api Useful Docker commands](./kurae-api/README.md#useful-docker-commands).

### Web — npm (`kurae-web`)

| Command | What it does |
|---------|----------------|
| `npm install` | Install dependencies |
| `npm run dev` | Next.js dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript `tsc --noEmit` |

Canonical list: [kurae-web Useful npm commands](./kurae-web/README.md#useful-npm-commands).
