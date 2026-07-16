# kurae-web

Frontend for [Kurae](https://github.com/your-org/kurae) — public drop pages, buyer checkout, and the seller dashboard.

**Requires [kurae-api](../kurae-api/)** running locally or deployed. All data comes from the API; there is no mock mode.

## Stack

- Next.js (App Router)
- React, TypeScript
- Tailwind CSS, shadcn-style UI
- Stripe Elements and redirect checkout for LATAM providers
- PostHog alongside first-party campaign analytics
- Deployed on Vercel

## Development

**Prerequisites:** kurae-api running in Docker on port 8080 (see kurae-api README).

```bash
# Terminal 1 — API (Docker)
cd ../kurae-api
cp .env.example .env
docker compose up -d --build
make docker-seed   # optional demo seller + drops

# After API code changes:
docker compose up -d --build api

# Terminal 2 — Web
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local test accounts (after `make seed`)

These credentials are local seed data only. Do not use them in production.

| Role | Login | Entry point |
|------|-------|-------------|
| **Seller** | `test.seller@kurae.dev` / `KuraeTest123!` | http://localhost:3000/dashboard/login |
| **Buyer** | `test.buyer@kurae.dev` / `KuraeTest123!` | http://localhost:3000/login |

The test seller includes 32 varied drops for dashboard, storefront, pagination, inventory, scheduling, and sold-out-state testing. Open the storefront at http://localhost:3000/kurae-test-store.

The original Hana Studio demo seller is also available:

| | |
|--|--|
| **Login** | `demo@hana.studio` / `demo1234` |
| **Dashboard** | http://localhost:3000/dashboard |
| **Sample drops** | 4 seeded (live, upcoming, sold out, expired) under `/hana-studio/...` |
| **Orders** | 6 sample orders |

You can also **sign up** at `/dashboard/signup` for your own seller account. The home page adapts when signed in (dashboard + preview link) vs signed out (seller landing).

Buyer accounts use `/login` and `/signup`. Guest checkout remains available without an account; signing in adds order history and referral progress under `/account`.

### Stripe checkout (Block A)

Add Stripe **test** keys to both repos:

| Where | Variable |
|-------|----------|
| kurae-api `.env` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| kurae-web `.env.local` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |

Rebuild API after changing keys: `docker compose up -d --build api`

Automated API test: `cd kurae-api && make stripe-block-a`

**Browser checkout (no Stripe CLI needed):** in development, after you pay with test card `4242 4242 4242 4242`, the pending page polls the API; the API checks Stripe and marks the order paid. Rebuild API after key changes: `docker compose up -d --build api`.

Optional — forward webhooks like production:

```bash
stripe listen --forward-to http://localhost:8080/webhooks/stripe
```

Use test card `4242 4242 4242 4242` in Elements. Pending page polls until paid → confirmation.

### Image uploads (optional in dev)

Drop builder uploads via S3 presign when `S3_BUCKET` and AWS credentials are set on kurae-api. Otherwise images are embedded as data URLs for local dev. Set `NEXT_PUBLIC_S3_IMAGE_HOSTNAME` on web when using S3 public URLs with Next.js Image.

## Shipped features

- Seller storefronts and public drop pages with countdowns, inventory polling, waitlists, referral attribution, and share metadata
- Multi-item cart, guest or account checkout, shipping addresses, discounts, and referral savings
- Stripe checkout plus Mercado Pago, Wompi, and PayU redirects when configured by the API
- Buyer order list/detail, payment confirmation, shipment tracking, and referral rewards
- Seller drop/product management, scheduled publishing, cloning, orders, CSV export, fulfillment, and refunds
- Seller team RBAC, branding, referrals, discounts, analytics exports, inventory alerts, and payment-event history
- Optional PostHog page and funnel events; first-party seller analytics remain the source for dashboard reports

## How the web talks to the API

Browser code calls **BFF routes** under `/api/*` (same origin). Those routes attach the buyer or seller JWT from cookies when needed and proxy to kurae-api.

Examples:

- `POST /api/auth/login` → `POST /auth/login`
- `POST /api/auth/buyer/login` → `POST /auth/buyer/login`
- `GET /api/drops` → `GET /drops`
- `GET /api/public/{seller}/{drop}` → `GET /public/{seller}/{drop}`
- `POST /api/checkout` → `POST /checkout`

Server Components use `apiServerFetch` against `NEXT_PUBLIC_API_URL` directly with the token cookie.

## Routes

### Storefront (buyer)

| Route | Description |
|-------|-------------|
| `/` | Seller landing (signed out) or welcome + preview (signed in) |
| `/[seller]` | Seller storefront with branding and active drops |
| `/[seller]/[drop]` | Public drop page — live inventory polling from API |
| `/[seller]/[drop]?preview=1` | Draft preview (seller session, same slug) |
| `/login`, `/signup` | Buyer authentication |
| `/checkout` | Cart checkout — Stripe Elements or provider redirect |
| `/checkout/pending` | Polls order status until paid or failed |
| `/checkout/failed` | Contextual payment / sold-out errors |
| `/orders/[orderId]/confirmation` | Buyer order confirmation |
| `/account` | Buyer profile and password settings |
| `/account/orders`, `/account/orders/[id]` | Buyer order list and detail |
| `/account/referrals` | Buyer referral reward progress |
| `/privacy`, `/terms` | Legal pages |

### Dashboard (seller)

| Route | Description |
|-------|-------------|
| `/dashboard/login`, `/dashboard/signup` | Auth |
| `/dashboard` | Overview stats from API |
| `/dashboard/drops`, `/dashboard/drops/new`, `/dashboard/drops/[id]` | Drop and product CRUD, scheduling, cloning, preview |
| `/dashboard/orders`, `/dashboard/orders/[id]` | Paginated orders, CSV export, ship, fulfill, refund |
| `/dashboard/analytics` | Date-range, per-drop, and campaign analytics with CSV exports |
| `/dashboard/referrals` | Referral codes and buyer reward settings |
| `/dashboard/discounts` | Create, edit, deactivate, and inspect discount codes |
| `/dashboard/branding` | Seller logo, bio, and accent customization |
| `/dashboard/webhooks` | Seller-scoped payment webhook event history |
| `/dashboard/settings` | Brand name and password |
| `/dashboard/settings/team` | Team members and role-based access |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Dev default | Base URL of kurae-api (`http://localhost:8080` in dev) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For checkout | Stripe publishable key |
| `NEXT_PUBLIC_S3_IMAGE_HOSTNAME` | Optional | S3 bucket hostname for Next.js Image optimization |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | PostHog project key; tracking is disabled when empty |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional | PostHog ingestion host (defaults to US cloud) |

Production builds require `NEXT_PUBLIC_API_URL` to be set explicitly.

## Related

- [kurae-api](../kurae-api/) — backend API and webhooks
- [Kurae root README](../README.md) — project overview
