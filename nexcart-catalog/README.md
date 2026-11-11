# NexCart Catalog (split-out browse/search app)

This is a **second, independent Next.js app** that serves the read-heavy parts
of NexCart — homepage, category pages, search, product pages, and seller
storefronts — from their **own database**, so that heavy browse traffic
doesn't compete with the main app's order/payment/cart database connections.

It is **browse-only**. Cart, checkout, login, orders, reviews-writing, etc.
all stay on the main app (`nexcart_final`). "Buy Now" / "Add to Cart" buttons
link back to the main app.

## How it fits together

```
                    ┌─────────────────────┐
   Shoppers ───────▶│  nexcart-catalog     │  (this app, port 3001 locally)
   (browse/search)  │  own DB (read-heavy) │
                    └──────────┬───────────┘
                               │ "Buy Now" links to
                               ▼
                    ┌─────────────────────┐
   Shoppers ───────▶│  nexcart_final       │  (main app, port 3000)
   (cart/checkout,  │  own DB (writes:     │
    seller/admin,   │  orders, users,      │
    auth)           │  payments, wallets)  │
                    └─────────────────────┘
```

Data flows ONE WAY: main DB → catalog DB, via `scripts/sync.ts`. The catalog
app never writes back to either database.

## 1. Setup

```bash
cd nexcart-catalog
npm install
cp .env.example .env.local
```

### Create the catalog database

1. Create a **second Supabase project** (separate from your main one).
2. Copy its `DATABASE_URL` / `DIRECT_URL` (pooler connection strings) into
   `.env.local`.
3. Push the schema:
   ```bash
   npm run db:push
   ```

### Connect the sync script to your main DB

Set `SOURCE_DATABASE_URL` in `.env.local` to your **main app's** `DIRECT_URL`
(non-pooled, since the sync script runs a handful of larger queries, not
many small ones). This is the ONLY place the main DB connection string is
used — never put it in the Next.js app's runtime config.

### Run the first sync

```bash
npm run sync
```

This copies categories, approved sellers, active products, variants, recent
reviews, and store collections into the catalog DB.

### Run the app

```bash
npm run dev    # http://localhost:3001
```

## 2. Keeping data fresh

Run `npm run sync` on a schedule (every 5–15 min is plenty for a catalog —
prices/stock don't need to be real-time on browse pages since checkout on
the main app always re-validates against the live DB).

Options:
- **Vercel Cron** → an API route (e.g. `/api/cron/sync`) that calls the same
  logic as `scripts/sync.ts`, triggered by `vercel.json` cron config. Note
  Vercel functions have a max duration — fine for moderate catalogs, but for
  very large catalogs use the option below.
- **Small always-on worker** (Railway/Render/cheap VPS) running
  `npm run sync` on a cron loop — better for large catalogs / long syncs.

## 3. Deploying

Deploy as its **own Vercel project** (e.g. `nexcart-catalog`), pointing at
this folder (`nexcart-catalog/`) as the project root if using a monorepo, or
its own repo if you split it out fully later. Set env vars from
`.env.example` in that project's Settings → Environment Variables.

Point your domain's root (`/`) routing (or a reverse proxy / Vercel rewrite
in the main app) at this app for browse pages, while `/cart`, `/checkout`,
`/account`, `/seller`, `/admin` etc. continue to route to `nexcart_final`.
The simplest setup to start: run this app on a subdomain (e.g.
`shop.yourapp.com` or `catalog.yourapp.com`) and link to it from the main
app's nav, while the main app keeps its current domain for everything else.

## 4. What's intentionally NOT here

- Auth (Firebase) — browsing doesn't require login.
- Cart / Wishlist / Orders / Payments / Returns / Wallet — all writes, stay
  on the main app's DB.
- Seller/Admin dashboards — management stays on the main app.
- Rate limiting / Upstash — add later if this app's traffic needs it; it's
  separate from the main app's Redis usage either way.

## 5. Rollback

This app is fully additive — nothing in `nexcart_final` was changed to build
this. If you don't want it, just don't deploy it; the main app continues to
work exactly as before.
