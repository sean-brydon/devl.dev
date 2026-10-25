# devl.dev
<img width="1200" height="630" alt="og" src="https://github.com/user-attachments/assets/35c5aa90-d18e-401b-be1e-9634fe38e488" />

Components, blocks, screens, motion and illustrations I've built, shared for free. Built on [coss ui](https://coss.com/ui) (Base UI + Tailwind v4). Charts are [bklit](https://ui.bklit.com) and the Filters category runs on [Qnot](https://coss.com/qnot).

Every item installs with the shadcn CLI (`npx shadcn@latest add https://devl.dev/r/<slug>.json`), or grab the raw source at `https://devl.dev/raw/<slug>.tsx`. Agents can read `https://devl.dev/llms.txt`.

## Stack

- Next.js 16 (App Router, Cache Components), React 19, Tailwind v4, coss ui
- `motion` for animation, shiki for build-time highlighting
- Effect for the server code (`src/server`)
- Cloudflare Workers via OpenNext: D1 for sponsor bookings, R2 for the cache and sponsor images
- Stripe Checkout for sponsor slots (REST + Web Crypto webhook verification)

## Layout

```
src/registry/items/<slug>/   one folder per item: meta.json, <slug>.tsx, demo.tsx
scripts/registry.mjs         builds the index, highlighted code, raw files, shadcn JSON and llms.txt
src/app/(site)               the catalogue, item pages, advertise flow, admin
src/app/(preview)            full-screen previews (also the item page iframe)
src/server                   Effect services: bookings, payments, inventory, stats
migrations/                  D1 schema
```

`REGISTRY.md` is the contract for adding an item and `AUDIT.md` is the bar it has to clear.

## Develop

```bash
pnpm install
cp .dev.vars.example .env.local   # next dev reads this
pnpm dev                           # runs the registry generator, then next dev
```

Without Stripe keys the advertise flow uses a simulated checkout in dev. In production it's switched off until Stripe is configured.

## Deploy (Cloudflare)

```bash
pnpm cf:migrate:remote   # apply D1 migrations
pnpm cf:deploy           # opennextjs-cloudflare build && deploy
```

Secrets (`wrangler secret put <NAME>`): `ADMIN_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optionally `SITE_URL`.
