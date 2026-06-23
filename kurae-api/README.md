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
# Run migrations (command TBD at scaffold)
# make migrate

# Start API server
go run ./cmd/api

# Start worker (separate process)
go run ./cmd/worker
```

## Testing

```bash
go test ./...
```

Required coverage: inventory reservation, checkout lifecycle, webhook idempotency, sold-out races.

## API contract

OpenAPI spec will be published from this repo for `kurae-web` to consume.

## Design

Feature specifications live in `docs/design.md` (local only, gitignored).

## Related

- [kurae-web](../kurae-web/) — frontend storefront and dashboard
- [Kurae root README](../README.md) — project overview
