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

- Go 1.22+
- PostgreSQL 15+
- Redis 7+

## Environment variables

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

### Development vs production payments

- **Development:** Leave `STRIPE_SECRET_KEY` empty to use the noop payment provider. Checkout returns `pi_dev_*` client secrets; webhooks are not processed.
- **Production:** Set `ENV=production`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. The API refuses to start without a strong `JWT_SECRET` and Stripe credentials.

## Development

```bash
# Start Postgres + Redis (Docker)
docker compose up -d
# or: make deps-up

# Copy env and run migrations
cp .env.example .env
make migrate-up

# Optional: seed demo seller + drops for local testing
make seed

# Start API server (runs on the host, not in Docker)
make run-api

# Start worker (reservation expiry + email queue)
make run-worker
```

### Restarting local services

Docker Compose only runs **Postgres and Redis**. The Go API and worker run as local processes.

**Postgres + Redis (Docker):**

```bash
cd kurae-api

# Restart both dependency containers
docker compose restart
# or: make deps-restart

# Stop and start fresh
docker compose down && docker compose up -d

# View logs
docker compose logs -f postgres redis
```

**API server** (after code or route changes — stop with `Ctrl+C`, then):

```bash
cd kurae-api
make run-api
# equivalent: go run ./cmd/api
```

**Worker:**

```bash
cd kurae-api
make run-worker
# equivalent: go run ./cmd/worker
```

**Full local stack reset** (keeps database volume):

```bash
cd kurae-api
docker compose restart
make run-api    # terminal 1
make run-worker # terminal 2 (optional)
```

Smoke check: `curl http://localhost:8080/health` → `{"status":"ok"}`.

## Testing

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
