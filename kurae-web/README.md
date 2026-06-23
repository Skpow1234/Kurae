# kurae-web

Frontend for [Kurae](https://github.com/your-org/kurae) — public drop pages, buyer checkout, and the seller dashboard.

## Stack

- Next.js (App Router)
- React, TypeScript
- Tailwind CSS, shadcn/ui
- Deployed on Vercel

## Responsibilities

- Public shareable drop pages with countdown, inventory bar, and OG metadata
- Waitlist signup UI
- Stripe checkout flow (driven by `kurae-api`)
- Seller dashboard: drop builder, order list
- Phase 2: referrals, discount codes, custom branding, analytics views

## Prerequisites

- Node.js 20+
- Running `kurae-api` instance (local or staging)

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Base URL of `kurae-api` |

Copy `.env.example` to `.env.local` when available.

## Development

Sign in at `/dashboard/login` with any password (demo: `seller@hanastudio.com`).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo routes

| Route | Description |
|-------|-------------|
| `/hana-studio/sakura-hoodie` | Live drop (inventory ticks down) |
| `/hana-studio/sakura-tee` | Upcoming drop + waitlist |
| `/hana-studio/sakura-cap` | Sold out + waitlist |
| `/hana-studio/winter-bloom` | Expired drop |
| `/checkout?seller=…&drop=…&size=…` | Checkout flow (mock) |
| `/orders/demo-ord-001/confirmation` | Order confirmed |
| `/dashboard` | Seller dashboard shell |

## Design

Feature specifications live in `docs/design.md` (local only, gitignored).

## Related

- [kurae-api](../kurae-api/) — backend API and webhooks
- [Kurae root README](../README.md) — project overview
