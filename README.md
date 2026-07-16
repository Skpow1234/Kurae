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
make docker-seed   # optional demo + test catalog

# Terminal 2 — Web
cd kurae-web
cp .env.example .env.local
npm install && npm run dev
```

Open http://localhost:3000 — API at http://localhost:8080 — health: `curl http://localhost:8080/health`.

After seeding, local-only test accounts:

| Role | Login | Open |
|------|-------|------|
| Seller | `test.seller@kurae.dev` / `KuraeTest123!` | [/dashboard](http://localhost:3000/dashboard), [/kurae-test-store](http://localhost:3000/kurae-test-store) |
| Buyer | `test.buyer@kurae.dev` / `KuraeTest123!` | [/login](http://localhost:3000/login) |

Hana Studio demo seller: `demo@hana.studio` / `demo1234`. Seed catalog details live in the [web](./kurae-web/README.md) and [API](./kurae-api/README.md) READMEs.

API Docker restart, Stripe Block A, and env vars: [kurae-api/README.md](./kurae-api/README.md).  
Routes, BFF, and frontend env: [kurae-web/README.md](./kurae-web/README.md).
