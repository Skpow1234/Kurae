# kurae-web

Frontend for [Kurae](https://github.com/your-org/kurae) — public drop pages, buyer checkout, and the seller dashboard.

## Stack

- Next.js (App Router)
- React, TypeScript
- Tailwind CSS, shadcn-style UI
- Deployed on Vercel

## Development

**Prerequisites:** kurae-api running on port 8080 (see kurae-api README).

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:8080` in development if unset. You can also copy `.env.example` to `.env.local`.

```bash
# Terminal 1 — API
cd ../kurae-api
docker compose up -d
cp .env.example .env   # or use the included .env
make migrate-up && make seed && make run-api

# Terminal 2 — Web
cp .env.example .env.local   # optional; localhost default works in dev
npm install
npm run dev
```

### Demo seller account (after `make seed`)

| | |
|--|--|
| **Login** | `demo@hana.studio` / `demo1234` |
| **Dashboard** | http://localhost:3000/dashboard |
| **Drops** | 4 seeded drops (live, upcoming, sold out, expired) |
| **Orders** | 6 sample orders on Sakura Hoodie |

### Buyer storefront

| Drop | URL | State |
|------|-----|--------|
| Sakura Hoodie | `/hana-studio/sakura-hoodie` | Live (checkout) |
| Sakura Tee | `/hana-studio/sakura-tee` | Upcoming |
| Sakura Cap | `/hana-studio/sakura-cap` | Sold out |
| Winter Bloom | `/hana-studio/winter-bloom` | Expired |

You can also **sign up** at `/dashboard/signup` to create your own seller account.

Open [http://localhost:3000](http://localhost:3000).

## Mock views (all routes)

### Storefront (buyer)

| Route | View |
|-------|------|
| `/` | Home + links to demo drops |
| `/[seller]/[drop]` | Public drop page (live, upcoming, sold out, expired) |
| `/[seller]/[drop]?preview=1` | Draft drop preview (seller session) |
| `/checkout` | Checkout + Stripe mock form |
| `/checkout/pending` | Payment pending |
| `/checkout/failed` | Payment failed |
| `/orders/[id]/confirmation` | Order confirmed |

### Dashboard (seller)

| Route | View |
|-------|------|
| `/dashboard/login` | Sign in |
| `/dashboard/signup` | Create account |
| `/dashboard` | Overview + mock stats |
| `/dashboard/drops` | Drops table |
| `/dashboard/drops/new` | Drop builder |
| `/dashboard/drops/[id]` | Edit drop |
| `/dashboard/orders` | Orders list (filter, paginate) |
| `/dashboard/orders/[id]` | Order detail + timeline |
| `/dashboard/settings` | Account settings |
| `/dashboard/analytics` | Analytics mock (phase 2) |
| `/dashboard/referrals` | Referrals mock (phase 2) |
| `/dashboard/discounts` | Discount codes mock (phase 2) |
| `/dashboard/branding` | Branding mock (phase 2) |

### Demo drops

| Route | State |
|-------|--------|
| `/hana-studio/sakura-hoodie` | Live |
| `/hana-studio/sakura-tee` | Upcoming |
| `/hana-studio/sakura-cap` | Sold out |
| `/hana-studio/winter-bloom` | Expired |

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Base URL of `kurae-api` (unset = mock stores) |

Copy `.env.example` to `.env.local` when connecting the API.

## Design

Feature specifications live in `docs/design.md` (local only, gitignored).

## Related

- [kurae-api](../kurae-api/) — backend API and webhooks
- [Kurae root README](../README.md) — project overview
