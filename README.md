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
- **Storage:** S3-compatible (product images)
- **Email:** Resend / Postmark
- **Analytics:** First-party campaign analytics + PostHog
- **Queue:** Redis for checkout events, emails, and reservation expiry

## Architecture

- **kurae-web** serves seller storefronts, public drop pages, buyer accounts, checkout UI, and the seller dashboard. Browser calls go through Next.js BFF routes (`/api/*`) which proxy to kurae-api with buyer or seller JWT cookies.
- **kurae-api** runs in **Docker** locally (Postgres, Redis, API, worker). Business logic, payment-provider webhooks, inventory reservations, distributed rate limits, email jobs, and reservation expiry live here.
- Contract: OpenAPI spec at `kurae-api/internal/httpapi/openapi.yaml` (Swagger UI at `/swagger/`).

## Product status

The MVP and Phase 2 feature set are implemented:

- Seller and buyer authentication, profiles, buyer order history, and seller team RBAC
- Seller storefronts and a drop builder with products, variants, inventory, schedules, cloning, and previews
- Public drop pages with countdowns, live inventory, waitlists, referral links, campaign tracking, and OG metadata
- Guest or account checkout with shipping, discounts, referrals, atomic reservations, and webhook-confirmed payments
- Stripe Elements plus redirect checkout through Mercado Pago, Wompi, and PayU
- Seller orders with pagination, CSV export, shipment tracking, fulfillment, refunds, and payment-event history
- Branding, referral rewards, inventory alerts, waitlist email campaigns, first-party analytics, and PostHog
- Redis-backed email jobs, distributed rate limits, reservation expiry, and JWT revocation

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

After seeding, use these local-only test accounts:

- Seller: `test.seller@kurae.dev` / `KuraeTest123!`
- Buyer: `test.buyer@kurae.dev` / `KuraeTest123!`

The original Hana Studio demo remains available at `demo@hana.studio` / `demo1234`. See the repository READMEs for seeded-data details.

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
