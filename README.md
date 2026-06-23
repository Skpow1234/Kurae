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
- **Payments:** Stripe (MVP); LATAM providers post-MVP
- **Storage:** S3-compatible (product images)
- **Email:** Resend / Postmark
- **Analytics:** PostHog
- **Queue:** Redis for checkout events, emails, and reservation expiry

## Architecture

- **kurae-web** serves public drop pages, checkout UI, and the seller dashboard. Browser calls go through Next.js BFF routes (`/api/*`) which proxy to kurae-api with the seller JWT cookie.
- **kurae-api** runs in **Docker** locally (Postgres, Redis, API, worker). Business logic, Stripe webhooks, inventory reservations, and background jobs live here.
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

```bash
# Terminal 1 — API stack (Docker)
cd kurae-api
cp .env.example .env
docker compose up -d --build
make docker-seed   # optional demo data

# Terminal 2 — Web
cd kurae-web
cp .env.example .env.local
npm install && npm run dev
```

Open http://localhost:3000 — API at http://localhost:8080.

### Restarting the API (Docker)

```bash
cd kurae-api

# After code changes — rebuild and restart API
docker compose up -d --build api

# Restart entire stack
docker compose up -d --build

# Logs
docker compose logs -f api worker
```

Health check: `curl http://localhost:8080/health`

See [kurae-api/README.md](./kurae-api/README.md) for Stripe Block A E2E and full Docker commands.
