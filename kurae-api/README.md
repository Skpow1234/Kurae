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
- Drop and product CRUD
- Public drop data endpoints
- Atomic inventory reservations with expiry
- Stripe checkout and webhook processing
- Waitlist with rate limiting
- Paginated seller orders
- Phase 2: referrals, discount codes, branding, LATAM providers, analytics jobs

## Prerequisites

- Go 1.22+
- PostgreSQL 15+
- Redis 7+

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `STRIPE_SECRET_KEY` | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `S3_BUCKET` | Product image bucket |
| `S3_REGION` | Bucket region |
| `AWS_ACCESS_KEY_ID` | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials |

Copy `.env.example` to `.env` when available.

## Development

```bash
# Start Postgres + Redis
docker compose up -d

# Copy env and run migrations
cp .env.example .env
make migrate-up

# Optional: seed demo seller + drops (matches kurae-web mocks)
make seed

# Start API server
go run ./cmd/api

# Start worker (reservation expiry)
go run ./cmd/worker
```

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
| POST | `/auth/register` | — | Returns `{ session, token }` |
| POST | `/auth/login` | — | Returns `{ session, token }` |
| GET | `/public/{seller}/{drop}` | — | `PublicDrop` JSON (camelCase) |
| POST | `/drops/{id}/waitlist` | — | `{ email }` — 429 when rate limited |
| POST | `/checkout` | — | Atomic reservation + payment intent |
| POST | `/webhooks/stripe` | Stripe sig | Idempotent payment events |
| GET/PATCH | `/drops`, `/drops/{id}` | Bearer JWT | Seller drop CRUD |
| GET | `/orders`, `/orders/{id}` | Bearer JWT | Paginated seller orders |

Set `NEXT_PUBLIC_API_URL` in `kurae-web` to point at this API. Seller routes expect `Authorization: Bearer <token>` from login/register.

## Design

Feature specifications live in `docs/design.md` (local only, gitignored).

## Related

- [kurae-web](../kurae-web/) — frontend storefront and dashboard
- [Kurae root README](../README.md) — project overview
