# kurae-web

Frontend for [Kurae](https://github.com/your-org/kurae) — public drop pages, buyer checkout, and the seller dashboard.

**Requires [kurae-api](../kurae-api/)** running locally or deployed. All data comes from the API; there is no mock mode.

## Stack

- Next.js (App Router)
- React, TypeScript
- Tailwind CSS, shadcn-style UI
- Stripe Elements (checkout)
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

### Demo seller (after `make seed`)

| | |
|--|--|
| **Login** | `demo@hana.studio` / `demo1234` |
| **Dashboard** | http://localhost:3000/dashboard |
| **Sample drops** | 4 seeded (live, upcoming, sold out, expired) under `/hana-studio/...` |
| **Orders** | 6 sample orders |

You can also **sign up** at `/dashboard/signup` for your own seller account. The home page adapts when signed in (dashboard + preview link) vs signed out (seller landing).

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

## How the web talks to the API

Browser code calls **BFF routes** under `/api/*` (same origin). Those routes attach the seller JWT from cookies and proxy to kurae-api.

Examples:

- `POST /api/auth/login` → `POST /auth/login`
- `GET /api/drops` → `GET /drops`
- `GET /api/public/{seller}/{drop}` → `GET /public/{seller}/{drop}`
- `POST /api/checkout` → `POST /checkout`

Server Components use `apiServerFetch` against `NEXT_PUBLIC_API_URL` directly with the token cookie.

## Routes

### Storefront (buyer)

| Route | Description |
|-------|-------------|
| `/` | Seller landing (signed out) or welcome + preview (signed in) |
| `/[seller]/[drop]` | Public drop page — live inventory polling from API |
| `/[seller]/[drop]?preview=1` | Draft preview (seller session, same slug) |
| `/checkout` | Cart checkout — Stripe Elements when configured |
| `/checkout/pending` | Polls order status until paid or failed |
| `/checkout/failed` | Contextual payment / sold-out errors |
| `/orders/[id]/confirmation` | Buyer order confirmation |

### Dashboard (seller)

| Route | Description |
|-------|-------------|
| `/dashboard/login`, `/dashboard/signup` | Auth |
| `/dashboard` | Overview stats from API |
| `/dashboard/drops`, `/dashboard/drops/new`, `/dashboard/drops/[id]` | Drop CRUD (delete when no orders) |
| `/dashboard/orders`, `/dashboard/orders/[id]` | Orders — paginated list, fulfill, refund |
| `/dashboard/settings` | Brand name and password |
| `/dashboard/analytics`, `/referrals`, `/discounts`, `/branding` | Phase 2 UI placeholders |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Dev default | Base URL of kurae-api (`http://localhost:8080` in dev) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For checkout | Stripe publishable key |
| `NEXT_PUBLIC_S3_IMAGE_HOSTNAME` | Optional | S3 bucket hostname for Next.js Image optimization |

Production builds require `NEXT_PUBLIC_API_URL` to be set explicitly.

## Design

Feature specifications: `docs/design.md`

## Related

- [kurae-api](../kurae-api/) — backend API and webhooks
- [Kurae root README](../README.md) — project overview
