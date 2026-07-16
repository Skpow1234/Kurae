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

### Restarting services (Docker)

```bash
# Rebuild and restart API after code changes
make docker-restart-api

# Restart worker / full stack / logs / stop
make docker-restart-worker
make docker-up
make docker-logs
make docker-down
```

### Stripe Block A E2E (pre-ship)

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

## Design

Feature specifications live in `docs/design.md` (local only, gitignored).

## Related

- [kurae-web](../kurae-web/) — frontend storefront and dashboard
- [Kurae root README](../README.md) — project overview
