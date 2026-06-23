# Kurae

Social commerce platform for launching limited product drops, countdowns, waitlists, checkout, inventory limits, referrals, and campaign analytics. Japanese-inspired clothing — scarce, visual, culture-forward.

## Repositories

Kurae is split into two independent repos.

| Repo | Description | Deploy |
|------|-------------|--------|
| [kurae-web](./kurae-web/) | Next.js storefront and seller dashboard | Vercel |
| [kurae-api](./kurae-api/) | Go REST API, webhooks, workers, migrations | AWS|

## Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Go, PostgreSQL, Redis
- **Payments:** Stripe (MVP); LATAM providers post-MVP
- **Storage:** S3-compatible (product images)
- **Email:** Resend / Postmark
- **Analytics:** PostHog
- **Queue:** Redis for checkout events, emails, and reservation expiry

## MVP scope

**Ship first:**

- Seller auth and account
- Drop builder
- Public drop page (countdown, inventory bar, OG metadata)
- Waitlist signup
- Stripe checkout and order confirmation
- Seller order list

**Defer unless requested:** referrals, discount codes, custom branding, LATAM payments, advanced analytics.

## Getting started

1. Clone or initialize each repo separately (`kurae-web`, `kurae-api`).
2. Follow the README in each repo for setup and environment variables.
3. API exposes OpenAPI; web consumes it via generated client or typed fetch wrapper.
