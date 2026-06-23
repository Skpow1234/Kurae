# kurae-web

Frontend for [Kurae](https://github.com/your-org/kurae) — public drop pages, buyer checkout, and the seller dashboard.

## Stack

- Next.js (App Router)
- React, TypeScript
- Tailwind CSS, shadcn-style UI
- Deployed on Vercel

## Development

Sign in at `/dashboard/login` with any password (demo: `seller@hanastudio.com`).

```bash
npm install
npm run dev
```

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
