# kurae-api

Backend for Kurae — REST API, payment webhooks, background workers, and database migrations.

## Stack

- Go 1.24
- PostgreSQL
- Redis (job queue, distributed rate limits, JWT revocation)
- Payments: Stripe, Mercado Pago, Wompi, PayU
- S3-compatible storage (product images; optional in development)
- Deployed on Fly.io / Render / AWS

## Responsibilities

- Seller and buyer auth (JWT), seller team RBAC, optional Redis token revocation on logout
- Drop and product CRUD (including delete when no orders exist), scheduled publish, clone
- Public drop data, waitlists, referrals, discounts, branding, and analytics endpoints
- Atomic inventory reservations with configurable TTL (`RESERVATION_TTL`) and expiry audit events
- Checkout with Stripe Elements or LATAM redirect providers; webhook-driven payment confirmation
- Paginated seller orders, CSV export, shipping/fulfillment, refunds, payment-event history
- Redis-backed email jobs (Resend/Postmark), waitlist notify campaigns, inventory alerts

## Prerequisites

- Docker + Docker Compose
- Go 1.24+ (for tests and optional host-side `go run`)

## Development (Docker)

The full stack runs in Docker: **Postgres, Redis, migrations, API, and worker**.

```bash
cd kurae-api
cp .env.example .env
make docker-up      # or: docker compose up -d --build
make docker-seed    # first-time (or refresh) demo + test catalog
```

The seed is idempotent and creates local-only test credentials (never use against production):

| Role | Email | Password |
|------|-------|----------|
| Seller | `test.seller@kurae.dev` | `KuraeTest123!` |
| Buyer | `test.buyer@kurae.dev` | `KuraeTest123!` |

The test seller owns 32 catalog drops spanning live, upcoming, scheduled, draft, expired, and sold-out states (varied inventory, waitlists, sizes, prices, images, and USD/COP/MXN/BRL). Re-running seed resets the test-account passwords. Hana Studio demo: `demo@hana.studio` / `demo1234`.

| Service | URL / port |
|---------|------------|
| API | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger/ |
| Postgres | `localhost:5432` |
| Redis | `localhost:6379` |

Smoke check: `curl http://localhost:8080/health` → `{"status":"ok","checks":{"postgres":"ok","redis":"ok"}}` (redis may be `"skipped"` in dev without Redis).

### Useful Docker commands

All commands assume you are in `kurae-api/` with a `.env` present.

| Command | What it does |
|---------|----------------|
| `make docker-up` | Build and start postgres, redis, migrate, api, worker |
| `make docker-down` | Stop containers (`docker compose down`) |
| `make docker-restart-api` | Rebuild and restart **api** after Go changes |
| `make docker-restart-worker` | Rebuild and restart **worker** |
| `make docker-logs` | Tail API + worker logs |
| `make docker-seed` | Rebuild seed binary and load demo/test data (idempotent) |
| `make deps-up` | Start only postgres + redis |
| `make deps-restart` | Restart postgres + redis |
| `make deps-down` | Stop the compose stack |
| `docker compose ps` | Show container status |
| `docker compose logs -f api` | Tail API only |
| `docker compose logs -f worker` | Tail worker only |
| `docker compose exec -T postgres psql -U kurae -d kurae` | Postgres shell |
| `curl http://localhost:8080/health` | Deep health check |
| `curl http://localhost:8080/swagger/` | OpenAPI UI |

Host-side (Go on the machine, deps still in Docker): `make migrate-up`, `make migrate-down`, `make seed`, `make run-api`, `make run-worker`, `make test`, `make build`, `make stripe-block-a`. See [Optional: run API on the host](#optional-run-api-on-the-host).

### Stripe Block A E2E

1. Add Stripe **test** keys to `.env`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (any placeholder is fine in development)
2. Rebuild API: `make docker-restart-api`
3. Run automated test:

```bash
make stripe-block-a
# or: bash scripts/stripe-block-a.sh
```

4. Browser Elements flow is documented in [kurae-web/README.md](../kurae-web/README.md) (publishable key + test card `4242…`).

In **development**, the pending page polls `GET /checkout/orders/{id}/status`; the API can sync payment state from Stripe when webhooks are not forwarded. Optional: `stripe listen --forward-to http://localhost:8080/webhooks/stripe`.

### Optional: run API on the host

```bash
make deps-up          # postgres + redis only
make migrate-up
make seed
make run-api          # terminal 1
make run-worker       # terminal 2
```

Host `.env` uses `localhost` for `DATABASE_URL` / `REDIS_URL` (see `.env.example`).

## Environment variables

Copy [`.env.example`](.env.example) to `.env`. Highlights:

| Variable | Description |
|----------|-------------|
| `ENV` | `development` (default) or `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis (required in production) |
| `CORS_ORIGINS` | Comma-separated web origins |
| `RESERVATION_TTL` | Inventory hold duration (Go duration; default `15m`) |
| `JWT_SECRET` | Session signing secret (32+ chars required in production) |
| `API_PUBLIC_URL` | Public API base for provider webhook callbacks |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe (required in production; test keys rejected when `ENV=production`) |
| `MERCADOPAGO_*` / `WOMPI_*` / `PAYU_*` | Optional LATAM providers (routed by drop currency) |
| `RESEND_API_KEY` / `POSTMARK_SERVER_TOKEN` / `EMAIL_FROM` | Transactional email (provider required in production) |
| `S3_BUCKET` / `S3_REGION` / `AWS_*` | Optional product image uploads |

- **Development:** Stripe test keys for real PaymentIntents; leave empty for noop `pi_dev_*`. LATAM keys optional.
- **Production:** `ENV=production`, strong `JWT_SECRET`, Stripe live credentials, Redis, and an email provider. See `.env.example` for the full list.

## Testing

```bash
go test ./...
```

Required coverage areas: inventory reservation, checkout lifecycle, webhook idempotency, sold-out races, reservation expiry.

## API contract

OpenAPI 3: [`internal/httpapi/openapi.yaml`](internal/httpapi/openapi.yaml)

**Swagger UI:** http://localhost:8080/swagger/ (also serves `/openapi.yaml`)

Base URL: `http://localhost:8080` (`PORT`). Prefer Swagger over a hand-maintained route list — auth (seller + buyer), public drops, checkout, webhooks (Stripe / Mercado Pago / Wompi / PayU), seller drops/orders/analytics/referrals/discounts/branding/team, and `/webhook-events` are all documented there.

Point `NEXT_PUBLIC_API_URL` in kurae-web at this API. Protected seller routes expect `Authorization: Bearer <token>`.

## Security

- Per-IP rate limits on auth (10/min), checkout (20/min), waitlist (5/min), referrals (60/min), and analytics views (120/min)
- Rate limits use Redis when `REDIS_URL` is set; in-memory fallback in development if Redis is down
- Security headers (HSTS when TLS), 1 MiB request body cap
- Input validation for slugs, emails, and inventory edits
- Production env guards for JWT, Stripe, Redis, email, and CORS
- Payment webhook signature verification per provider

## Related

- [kurae-web](../kurae-web/) — frontend storefront and dashboard
- [Kurae root README](../README.md) — project overview
