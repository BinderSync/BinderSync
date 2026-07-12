# Binder Sync

A digital binder app for Pokémon TCG collectors: browse every set, flip through a virtual binder
(base + master/reverse-holo mode), track your collection, and build a shareable "Sell Binder" to
list cards for sale. Built from the design handoff in [`design_handoff_binder_app/`](design_handoff_binder_app/README.md).

## Stack

Next.js 16 (App Router) · TypeScript · Prisma 7 + PostgreSQL · Auth.js v5 (credentials) · Stripe

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Database** — two options:

   - **Local Postgres via Docker** (matches production): `docker compose up -d`, then set
     `DATABASE_URL` in `.env` to `postgresql://bindersync:bindersync@localhost:5432/bindersync?schema=public`.
   - **Prisma's built-in dev server** (no Docker/WSL2 required): `npx prisma dev --detach`, then
     copy the printed `postgres://...` connection string (with its query params) into `DATABASE_URL`.

   Either way, then run:

   ```bash
   npx prisma db push      # or `npx prisma migrate dev` against a real Postgres instance
   npx prisma generate
   ```

3. **Seed card data** — pulls series/sets/cards from tcgdex (digital-only TCG Pocket is excluded),
   optionally with rarity/reverse-holo/pricing detail. The `--details` pass also overlays
   pokemontcg.io data (works without an API key, rate-limited): its reverseHolofoil prices fill in
   reverse-holo variants that tcgdex is missing for the EX/BW/XY/SM eras.

   ```bash
   npm run ingest -- --series=lc            # metadata only, fast
   npm run ingest -- --series=base --details  # + rarity, reverse-holo flag, pricing
   npm run ingest                            # all series, metadata only (slow, no --details)
   ```

4. **Env vars** — copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — see above
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_MASTER` — optional; without these, checkout fails gracefully with a "billing not configured" message
   - `POKEMONTCG_API_KEY` — optional; enables the pokemontcg.io price overlay during ingestion

5. **Run it**

   ```bash
   npm run dev
   ```

## Project layout

- `app/` — routes: `/` (home/set browser), `/sets/[setId]` (binder view), `/dashboard` (collection),
  `/sell`, `/sell/[binderId]` (sell binder editor), `/s/[shareId]` (public buyer view), `/login`, `/register`
- `app/api/` — route handlers (auth, collection, sell-binders, Stripe checkout/webhook, card search)
- `components/` — screen and shared UI components
- `lib/` — `prisma.ts`, `auth.ts`, `theme.ts` (design tokens), `binder.ts` (page-flip/pricing logic),
  `data.ts` (Prisma queries), `tcgdex.ts` / `pokemontcg.ts` (ingestion sources), `stripe.ts`
- `prisma/schema.prisma` — data model
- `scripts/ingest.ts` — card data ingestion job (see step 3 above)
- `design_handoff_binder_app/` — the original design spec and interactive HTML prototype this app is built from

## Deployment (Vercel + Supabase + Cloudflare DNS)

1. **GitHub**: push this repo. The generated Prisma client is gitignored; `npm run build` runs
   `prisma generate` first, so CI/Vercel builds work from a clean checkout.
2. **Supabase**: create a project, then grab both connection strings from Connect → ORMs:
   the **transaction pooler** URL (port 6543) for the app on Vercel, and the **direct/session**
   URL (port 5432) for migrations and ingestion. From your machine run
   `DATABASE_URL=<direct-url> npm run migrate:deploy` and seed with
   `DATABASE_URL=<direct-url> npm run ingest -- --details` (30–45 min for the full catalog).
   Use the direct URL for the GitHub Actions ingest secret too.
3. **Vercel**: import the GitHub repo. Env vars: `DATABASE_URL` (the pooled 6543 URL),
   `AUTH_SECRET` (fresh: `openssl rand -base64 32`), `POKEMONTCG_API_KEY`, and the four
   `STRIPE_*` values.
4. **Cloudflare DNS** for `bindersync.com`: add the records Vercel's "Domains" tab shows
   (A `76.76.21.21` for the apex, CNAME `cname.vercel-dns.com` for `www`). Set them to
   **DNS-only (grey cloud)** — Vercel terminates TLS itself; proxying through Cloudflare
   causes redirect loops unless SSL mode is Full (Strict).
5. **Stripe**: create Pro ($3/mo) and Master ($6/mo) recurring prices (test mode first), fill the
   price-ID env vars, and add a webhook endpoint for `https://bindersync.com/api/stripe/webhook`
   with events `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Enable the customer Billing Portal (Settings → Billing) so
   "Manage subscription" works.
6. **Nightly ingest**: the GitHub Action in `.github/workflows/ingest.yml` refreshes the catalog
   daily — add `DATABASE_URL` and `POKEMONTCG_API_KEY` as repo Actions secrets. It can also be
   run manually from the Actions tab (optionally scoped to specific series).

## Known gaps (see `design_handoff_binder_app/README.md` for the full list)

- Card dataset refresh is manual (`npm run ingest`) — no cron/scheduled job wired up yet.
- Stripe price IDs are placeholders; plan copy follows the prototype ($3 Pro / $6 Master). Use
  `npx tsx -r dotenv/config scripts/set-plan.ts <email> <plan>` to test plan-gated features locally.
- Sell Binder analytics are deterministic placeholder numbers seeded from the shareId (prototype
  parity) — real view/scan tracking needs a server-side counter on the `/s/[shareId]` route.
- Buyer contact is a `mailto:` link to the seller's email — in-app messaging is an open product question.
