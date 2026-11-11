# External Services Setup Guide

This guide covers the external services NexCart's code already supports (or
is ready to support) but that need *your own accounts and API keys* to
activate. None of these are required for the app to run — it degrades
gracefully without them — but each closes a real gap for a production
launch.

For each service: what it's for, how to sign up, and exactly which
environment variables to add to `.env` (and to your hosting provider's env
settings, e.g. Vercel → Project → Settings → Environment Variables).

---

## 1. Upstash Redis — Rate Limiting

**Why:** `src/lib/ratelimit.ts` already implements rate limiting for orders,
payments, seller registration, auth, product creation, and uploads — but it
silently no-ops if these env vars aren't set. Without it, those endpoints
have no abuse protection.

**Setup:**
1. Go to https://console.upstash.com and sign up (free tier is generous).
2. Create a new Redis database — choose a region close to your app's hosting
   region (e.g. same AWS region as your Vercel deployment).
3. Open the database → "REST API" tab → copy the `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`.
4. Add to `.env` / hosting env vars:
   ```
   UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```
5. Install the SDK if not already present:
   ```
   npm install @upstash/ratelimit @upstash/redis
   ```
6. Redeploy. No code changes needed — `lib/ratelimit.ts` detects the env
   vars automatically and starts enforcing limits.

---

## 2. Sentry — Error Monitoring

**Why:** Right now errors only go to `console.error`, which disappears once
your hosting platform rotates logs. Sentry captures stack traces, request
context, and alerts you in real time.

**Setup:**
1. Sign up at https://sentry.io (free tier covers small apps).
2. Create a new project → choose "Next.js" as the platform.
3. Sentry will give you a DSN like `https://xxxx@oyyyy.ingest.sentry.io/zzzz`.
4. Run the setup wizard from your project root:
   ```
   npx @sentry/wizard@latest -i nextjs
   ```
   This creates `sentry.client.config.ts`, `sentry.server.config.ts`,
   `sentry.edge.config.ts`, and updates `next.config.mjs` automatically.
5. Add to `.env` / hosting env vars:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oyyyy.ingest.sentry.io/zzzz
   SENTRY_AUTH_TOKEN=your_auth_token   # for source map uploads at build time
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-slug
   ```
6. Redeploy and trigger a test error to confirm it shows up in the Sentry
   dashboard.

---

## 3. ~~S3-Compatible Storage~~ — Already Done (Cloudinary)

**Status: Already implemented.** `src/lib/cloudinary.ts` +
`src/app/api/upload/route.ts` already handle product image uploads via
Cloudinary, which is durable cloud storage (no local-disk issue on Vercel).

Just make sure these are set in `.env` / hosting env vars with your real
Cloudinary account values:
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
No further code work needed for this item.

---

## 4. Meilisearch / Typesense — Product Search

**Why:** If product search currently uses Postgres `contains`/`ILIKE`
queries, it won't scale well or support typo-tolerance, filters, and
ranking once your catalog grows past a few thousand products.

**Recommended: Meilisearch Cloud** (simplest managed option) or self-host
via Docker.

**Setup (Meilisearch Cloud):**
1. Sign up at https://www.meilisearch.com/cloud.
2. Create a project/instance → copy the Host URL and Admin API Key.
3. Add to `.env` / hosting env vars:
   ```
   MEILISEARCH_HOST=https://xxxx.meilisearch.io
   MEILISEARCH_API_KEY=your_admin_key
   ```
4. Install the SDK:
   ```
   npm install meilisearch
   ```
5. This requires code changes: a sync job that pushes products into a
   Meilisearch index on create/update/delete, and a search API route that
   queries Meilisearch instead of Prisma. This is a larger change — let me
   know once you have the credentials and I can implement the integration.

---

## 5. Shiprocket — Courier Integration

**Status: Already implemented.** The full integration exists in code:
- `src/lib/shiprocket.ts` — auth (token caching), create shipment, assign
  courier/AWB, schedule pickup, generate label, live tracking, cancel,
  serviceability check, reverse pickup for returns.
- `src/app/api/sellers/orders/[id]/ship/route.ts` — one-click "Ship" for
  sellers: creates the shipment, assigns AWB, schedules pickup, generates
  the label, and updates the order to `SHIPPED`.
- `src/app/api/orders/[id]/tracking/route.ts` — buyers get live tracking.

**Setup (just credentials — no more code needed):**
1. Sign up at https://www.shiprocket.in (requires business KYC documents —
   GST certificate, PAN, bank details).
2. Once approved, go to Settings → API → generate API credentials (email +
   password used for token-based auth).
3. In Shiprocket dashboard, add a Pickup Location named exactly `Primary`
   (or update the `pickup_location` default in `ship/route.ts` to match
   whatever name you create).
4. Add to `.env` / hosting env vars:
   ```
   SHIPROCKET_EMAIL=your_account_email
   SHIPROCKET_PASSWORD=your_account_password
   ```
5. Redeploy. The "Ship" button on the seller dashboard will start creating
   real Shiprocket shipments.

---

## Suggested Order of Setup

1. **Cloudinary, Supabase, Firebase, Razorpay, Shiprocket** — all already
   built into the code. Just confirm real credentials are set in `.env` /
   hosting env vars (see `.env.example` for the full list).
2. **Upstash** (5 minutes, immediate security benefit, no code changes needed)
3. **Sentry** (10 minutes, immediate visibility into production errors)
4. **Meilisearch** (do this once your catalog is large enough that search
   quality/speed becomes a user complaint — requires code changes)

Once you've created accounts and have the env vars, share them (or just
confirm they're set in your hosting provider) and I'll verify the wiring.
