# kurae-api

Backend for [Kurae](https://github.com/your-org/kurae) — REST API, payment webhooks, background workers, and database migrations.

## Stack

- Go
- PostgreSQL
- Redis (job queue)
- Stripe (MVP payments)
- S3-compatible storage (product images)
- Deployed on Fly.io / Render / AWS

## Responsibilities

- Seller auth and RBAC
- Drop and product CRUD (including delete when no orders exist)
- Public drop data endpoints
- Atomic inventory reservations with expiry
- Stripe checkout and webhook processing
- Waitlist with rate limiting
- Paginated seller orders with date filters
- Phase 2: referrals, discount codes, branding, LATAM providers, analytics jobs

## Prerequisites

- Docker + Docker Compose
- Go 1.22+ (for tests and optional host-side `go run`)

## Development (Docker — recommended)

The full stack runs in Docker: **Postgres, Redis, migrations, API, and worker**.

```bash
cd kurae-api
cp .env.example .env
docker compose up -d --build
# or: make docker-up
```

First-time demo data:

```bash
make docker-seed
```

| Service | URL / port |
|---------|------------|
| API | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger/ |
| Postgres | `localhost:5432` |
| Redis | `localhost:6379` |

Smoke check: `curl http://localhost:8080/health` → `{"status":"ok","checks":{"postgres":"ok","redis":"ok"}}` (redis may be `"skipped"` in dev without Redis).

### Restarting services (Docker)

```bash
cd kurae-api

# Rebuild and restart API after code changes
docker compose up -d --build api
# or: make docker-restart-api

# Restart worker
docker compose up -d --build worker
# or: make docker-restart-worker

# Restart entire stack (postgres, redis, api, worker)
docker compose up -d --build

# Restart only Postgres + Redis
docker compose restart postgres redis

# View API + worker logs
docker compose logs -f api worker
# or: make docker-logs

# Stop everything
docker compose down
# or: make docker-down
```

### Stripe Block A E2E (pre-ship)

1. Add Stripe **test** keys to `.env`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (any placeholder is fine in development)
2. Rebuild API: `docker compose up -d --build api`
3. Run automated test:

```bash
make stripe-block-a
# or: bash scripts/stripe-block-a.sh
```

4. **Browser check (Elements + pending page):** set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` in `kurae-web/.env.local`, run `npm run dev`, checkout a live drop, pay with card `4242 4242 4242 4242`, confirm pending → confirmation.

In **development**, the pending page polls `GET /checkout/orders/{id}/status`; the API syncs payment state from Stripe when webhooks are not forwarded (no Stripe CLI required). Optional: `stripe listen --forward-to http://localhost:8080/webhooks/stripe` for real webhook flow.

### Optional: run API on the host

If you prefer `go run` while Postgres/Redis stay in Docker:

```bash
make deps-up          # postgres + redis only
make migrate-up
make seed
make run-api          # terminal 1
make run-worker       # terminal 2
```

Host `.env` uses `localhost` for `DATABASE_URL` / `REDIS_URL` (see `.env.example`).

## Development vs production payments

| Variable | Description |
|----------|-------------|
| `ENV` | `development` (default) or `production` — enables prod guards |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Session signing secret (32+ chars required in production) |
| `STRIPE_SECRET_KEY` | Stripe API secret (required in production) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (required in production) |
| `RESEND_API_KEY` | Resend API key for order confirmation emails |
| `POSTMARK_SERVER_TOKEN` | Postmark server token (alternative to Resend) |
| `EMAIL_FROM` | Sender address for transactional email |
| `S3_BUCKET` | Product image bucket |
| `S3_REGION` | Bucket region |
| `AWS_ACCESS_KEY_ID` | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials |

Copy `.env.example` to `.env` when available.

- **Development (Docker):** Set Stripe test keys in `.env` for real PaymentIntents. Leave empty for noop `pi_dev_*` (no card payments).
- **Production:** Set `ENV=production`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. The API refuses to start without a strong `JWT_SECRET` and Stripe credentials.

## Environment variables

```bash
go test ./...
```

Required coverage: inventory reservation, checkout lifecycle, webhook idempotency, sold-out races.

## API contract

OpenAPI 3 spec: [`internal/httpapi/openapi.yaml`](internal/httpapi/openapi.yaml)

**Swagger UI:** `http://localhost:8080/swagger/` (serves `/openapi.yaml`)

Base URL: `http://localhost:8080` (configurable via `PORT`).

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | — | Liveness |
| POST | `/auth/register` | — | Rate limited; returns `{ session, token }` |
| POST | `/auth/login` | — | Rate limited; returns `{ session, token }` |
| GET | `/public/{seller}/{drop}` | — | `PublicDrop` JSON (camelCase) |
| POST | `/drops/{id}/waitlist` | — | `{ email }` → `{ ok, waitlistCount }`; 429 when rate limited |
| POST | `/checkout` | — | Rate limited; atomic reservation + payment intent |
| GET | `/checkout/orders/{id}/status` | — | Buyer order status (`?email=`) |
| POST | `/webhooks/stripe` | Stripe sig | Idempotent payment events |
| GET/PATCH/DELETE | `/drops`, `/drops/{id}` | Bearer JWT | Seller drop CRUD; DELETE blocked if orders exist |
| GET | `/orders`, `/orders/{id}` | Bearer JWT | Paginated seller orders (`from`, `to`, `status`, `sort`) |
| PATCH | `/orders/{id}` | Bearer JWT | `{ action: fulfill \| refund }` — orders are not hard-deleted (audit) |
| GET/PATCH | `/auth/me`, `/auth/profile`, `/auth/password` | Bearer JWT | Seller settings |
| POST | `/uploads/presign` | Bearer JWT | S3 presigned upload (`sizeBytes` max 5MB) |

Set `NEXT_PUBLIC_API_URL` in `kurae-web` to point at this API. Seller routes expect `Authorization: Bearer <token>` from login/register.

## Security

- Per-IP rate limits on auth (10/min), checkout (20/min), and waitlist (5/min)
- Security headers (HSTS when TLS), 1 MiB request body cap
- Input validation for slugs, emails, and inventory edits
- Production env guards for JWT and Stripe secrets
- Stripe webhook signature required when using the Stripe provider

## Design

Feature specifications live in `docs/design.md` (local only, gitignored).

## Related

- [kurae-web](../kurae-web/) — frontend storefront and dashboard
- [Kurae root README](../README.md) — project overview
