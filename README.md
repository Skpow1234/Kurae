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
- **Backend:** Go, PostgreSQL, Redis
- **Payments:** Stripe (MVP); LATAM providers post-MVP
- **Storage:** S3-compatible (product images)
- **Email:** Resend / Postmark
- **Analytics:** PostHog
- **Queue:** Redis for checkout events, emails, and reservation expiry

## Architecture

- **kurae-web** serves public drop pages, checkout UI, and the seller dashboard. Browser calls go through Next.js BFF routes (`/api/*`) which proxy to kurae-api with the seller JWT cookie.
- **kurae-api** owns business logic, PostgreSQL, Stripe webhooks, inventory reservations, and background workers.
- Contract: OpenAPI spec at `kurae-api/internal/httpapi/openapi.yaml` (Swagger UI at `/swagger/`).

## MVP status

**Implemented:**

- Seller auth, profile, and password change
- Drop builder with image upload (S3 when configured; local embed fallback)
- Public drop pages (countdown, live inventory polling, waitlist, OG metadata)
- Stripe Elements checkout, pending polling, confirmation, and failure states
- Seller orders (paginated, filterable), fulfill, and refund
- Dashboard stats and dynamic storefront preview links

**Deferred (phase 2):** referrals, discount codes, custom branding UI, LATAM payments, advanced analytics.

## Getting started

1. Start **kurae-api** (Postgres, Redis, migrations, seed) — see [kurae-api/README.md](./kurae-api/README.md).
2. Start **kurae-web** with `NEXT_PUBLIC_API_URL` pointing at the API — see [kurae-web/README.md](./kurae-web/README.md).
3. Sign in with the seeded demo seller or create an account at `/dashboard/signup`.

### Restarting the API locally

Postgres and Redis run in Docker; the API runs on your machine:

```bash
cd kurae-api
docker compose restart   # restart Postgres + Redis
make run-api             # restart API after Ctrl+C
```

Health check: `curl http://localhost:8080/health`
