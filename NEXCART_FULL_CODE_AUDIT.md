# NexCart — Full Codebase Read-Through (every file)

Every source file in the repo was read: all 91 API routes, all 36 `src/lib` files plus hooks/context/types, all 122 components, all 111 app pages, and the entire independent `nexcart-catalog` app (11 files) — roughly 62,000 lines total. This document consolidates the findings, ranked by severity, followed by what's genuinely well-built, then a per-area reference.

---

## Critical

**1. Admin pages leak data to unauthenticated requests (SSR bypass).**
`src/app/(admin)/admin/layout.tsx` is a *client* component that checks `role === "ADMIN"` after the page loads, and redirects if not. But every page inside it (`orders`, `products`, `sellers`, `delivery-agents`, `page.tsx`) is a *Server Component* that queries Prisma directly and renders the full table server-side. In the Next.js App Router, that server render happens and is sent to the browser regardless of what the client-side layout later decides — the "redirect" only hides the already-delivered HTML after JS runs. Anyone who requests `/admin/orders`, `/admin/products`, `/admin/sellers`, etc. directly (curl, view-source, disabling JS) receives real order, payment, and seller data with no auth check at all. The seller-dashboard equivalent (`(seller)/dashboard/**`) avoids this because every one of its 32 pages is `"use client"` and fetches only after the gate passes — worth using as the template to fix admin.

**2. Inline admin Server Actions have no authorization check.**
The same admin pages define React Server Actions inline (`ApproveButton`, `RejectButton`, `SuspendButton`, `ToggleProductForm`, `UpdateOrderStatus`) to approve/reject sellers and change order/product status. None of these actions re-verify the caller is an admin — Next.js exposes each as a directly callable endpoint, so a crafted request to that action id can mutate seller/order/product state without ever being an admin.

**3. `GET /api/admin/analytics` has no role check.**
Every other admin route (`payouts`, `returns`, `sellers`, `cod-refund`) re-verifies `role === "ADMIN"` against the DB. This one only checks `getVerifiedUid(req)` is truthy, with a comment claiming "role check handled in layout" — which is false for API routes; layouts never run for `route.ts` handlers. Any logged-in customer or seller can currently pull total platform revenue, user/seller counts, and monthly revenue breakdown.

**4. The dominant auth pattern is a raw Firebase UID sent as the bearer token, not a signed ID token.**
Nearly every authenticated `fetch` in the app — across dozens of components and pages (seller dashboard, delivery, most customer pages, `NotificationBell`, `SellerPresencePing`, etc.) — sends `Authorization: Bearer ${user.uid}`. Only `dashboard/SubscriptionClient.tsx` correctly calls `getIdToken()`. This works in production only because `src/lib/firebase.ts` monkey-patches `window.fetch` at module load to detect a non-JWT (no-dot) bearer value and silently swap in a real ID token before the request leaves the browser. That patch is a single point of failure for a huge share of the app's authenticated traffic — if it's ever bypassed (non-fetch HTTP client, patch fails to load, etc.) those calls send a spoofable raw UID. Whether the *server* would actually trust that raw UID wasn't independently confirmed for every route (auth.ts's dev-fallback is correctly fail-closed in production), but the pattern is fragile enough, and prevalent enough, to flag as the single biggest architectural risk in the codebase.

**5. A second, weaker Razorpay webhook handler is live.**
`src/app/api/webhooks/route.ts` duplicates `src/app/api/webhooks/razorpay/route.ts` but: uses a plain `!==` signature comparison (not timing-safe), dereferences `RAZORPAY_WEBHOOK_SECRET!` with no guard (throws uncaught if unset), has no try/catch around JSON parsing, and — critically — never creates `Payout` rows or moves the order to `CONFIRMED` the way the real handler does. It's reachable by anyone (webhooks are exempted from auth middleware by prefix). If the Razorpay dashboard is still pointed at this URL instead of `/api/webhooks/razorpay`, payments succeed but orders/payouts silently never advance. `webhooks/clerk/route.ts` is a harmless intentional 410 stub, not a risk.

**6. A seller can convert any registered user into their delivery agent without consent.**
`POST /api/sellers/delivery-agents` looks up a target user by email and flips their global `role` to `DELIVERY_AGENT`, with no invitation/opt-in step and no check that the target isn't already a seller/admin.

**7. COD wallet-credit double-credit race.**
Both `PATCH /api/sellers/orders/[id]/delivery` and `POST /api/delivery/orders/[id]/confirm` gate a seller-wallet credit on reading `order.codCollectedAt` *before* their transaction runs, rather than an atomic claim. Two concurrent requests (a seller override racing the delivery agent's own OTP confirm) can both pass the check and both credit the wallet. The returns/refund flow was fixed for exactly this class of bug (see "What's solid" below) — this COD path wasn't.

**8. Catalog app's cross-app "Buy Now" link is broken.**
`nexcart-catalog/src/app/products/[id]/page.tsx` builds the link to the main app as `` `${MAIN_APP_URL}/products/${productId}` `` (plural). The main app's real route is `/product/[productId]` (singular). Every "Buy Now" click from the catalog app 404s.

**9. Catalog app never retracts suspended sellers or deactivated products.**
`nexcart-catalog/src/lib/catalog-sync.ts` only pulls rows matching `status='APPROVED'` / `isActive=true` from the source DB. It upserts matching rows but never updates or deletes rows that fell out of that filter. A seller suspended in the main app keeps their storefront and every product live and publicly crawlable on the catalog app indefinitely.

---

## High

- **Checkout sends no `Authorization` header.** `(customer)/checkout/page.tsx`'s calls to `POST /api/orders` and `POST/PUT /api/payments` — the two most sensitive money-moving calls in the app — carry no auth header at all, unlike every sibling customer page.
- **`SettingsClient.tsx`'s profile-save PATCH sends no auth header.** Confirmed independently that `PATCH /api/sellers/profile` *does* correctly re-verify auth server-side (`getVerifiedUid` at the top of the handler), so this is a client-side-only bug, not a security hole — but it means the save silently depends on the route's own defense rather than the intended header.
- **`MobileMenu.tsx` role check is dead code from a different auth stack.** It reads `user.publicMetadata.role` — a Clerk pattern — on a Firebase `User` object, which is always `undefined`. Result: the Dashboard/Admin links never render in the mobile menu for any user, regardless of actual role.
- **`ProtectedRoute`'s `requireRole` prop is accepted but never implemented.** Only checks "is logged in," not role, even though the prop exists in its API.
- **Subscription pricing/limits are defined in four disagreeing places**: `src/lib/constants.ts` (`SUBSCRIPTION_PLANS`, keys TRIAL/STANDARD/PREMIUM), `src/lib/utils.ts` (`SUBSCRIPTION_LIMITS`, different keys/prices), `src/types/index.ts` (a third key set), and hardcoded prices inside `email.ts`'s HTML template (a fourth set of numbers). A seller could see different prices in different places.
- **`GET /api/products/variants/bulk` has no auth check** — variant pricing/stock for any product is readable by anyone who knows the `productId`, inconsistent with the rest of the variant/product access pattern.
- **Two rate limiters with near-identical names, incompatible signatures, and very different guarantees.** `src/lib/rate-limit.ts` (in-memory `Map`, ineffective across serverless instances) is used by `coupons`, `search`, `autocomplete`, `check-handle`. `src/lib/ratelimit.ts` (Upstash Redis-backed, actually enforces globally) is used by `auth`, `orders`, `payments`, `products`, `sellers`, `upload`. Neither is dead code, but the naming makes it easy to grab the weaker one by accident.
- **Payment-signature verification logic is duplicated** near-verbatim between `payments/route.ts` (PUT) and `payments/verify/route.ts` rather than a shared helper — a security-critical check that could be patched in one place and missed in the other.
- **Non-timing-safe HMAC comparison** in `src/lib/razorpay.ts`'s `verifyPaymentSignature` (`===` instead of `crypto.timingSafeEqual`) — inconsistent with the correctly timing-safe check in the main webhook handler.

---

## Medium

- Coupon discount-calculation logic is duplicated between `coupons/route.ts` (checkout preview) and `orders/route.ts` (order placement) instead of a shared function — the safety cap in one isn't explicitly mirrored in the other.
- No **per-user** coupon usage limit — only a global `maxUses`/`usedCount` cap, so one user can reuse a coupon repeatedly until the global cap is hit.
- `POST /api/sellers/ratings` trusts the client-supplied `sellerId` without verifying that seller actually had items in the order being rated — a user could attach a rating to an unrelated seller.
- `PATCH /api/sellers/gallery` doesn't verify submitted product IDs belong to the seller before saving them to the gallery selection.
- `ReturnRequestForm.tsx` reads images via `FileReader.readAsDataURL()` and ships raw base64 inline in the JSON body to `/api/returns`, bypassing the Cloudinary `/api/upload` path every other image-upload flow in the app uses — inconsistent, and risks very large request payloads.
- Several storefront features are cosmetic/mocked rather than wired to real services: `checkout/DeliverySelection.tsx` (hardcoded delivery options/prices), `product/PincodeChecker.tsx` (serviceability derived from the pincode's first digit), and `checkout/PaymentSection.tsx`'s UPI/netbanking tabs (no real verification).
- Three independent caching systems with no shared invalidation contract: `src/lib/cache.ts` (Redis cache-aside), `src/lib/db-cache.ts` (Next.js `unstable_cache` tags), `src/lib/dashboard-cache.ts` (localStorage). Adding a new cached endpoint requires knowing which of three systems applies.
- `src/lib/db.ts`'s fallback proxy (used when the Prisma client isn't generated) returns empty defaults instead of erroring — safe against hard crashes, but a genuinely broken Prisma setup in production would look like "no data" rather than a loud failure.
- Real duplicated implementations found: three separate debounced search-autocomplete implementations (`Navbar`, `SearchCommand`, `SearchWithAutocomplete`); two parallel sign-up/registration flows (`SignPage.tsx` vs. `auth/RegisterForm.tsx` + `PhoneLogin.tsx`); two near-identical revenue-chart components (`AnalyticsChart`, `RevenueChart`).
- Cron secret check is inconsistent: `cron/inventory-alerts` and `cron/process-payouts` check `Authorization: Bearer <CRON_SECRET>`; `cron/subscription-reminders` checks an `x-cron-secret` header instead — whichever the actual scheduler doesn't send will permanently reject.
- `sitemap.ts` links every seller via the legacy `/store/[sellerId]` URL even when a vanity `storeHandle` exists (which the canonical-URL logic in `store-view.tsx` prefers) — minor duplicate-content SEO risk via the ensuing redirect.
- `nexcart-catalog`'s `storeHandle` field is synced into the catalog DB and referenced only in the sync SQL — no page in that app ever reads it, so vanity URLs don't resolve on the catalog app despite the data pipeline existing for it.
- The main product page's JSON-LD (`ProductJsonLd`) divides `price` by 100 for `offers.price`, while every other price display in the app treats `price` as already denominated in rupees — worth a direct check for a possible unit bug in structured data (search engines / rich results would show the wrong price).
- `nexcart-catalog`'s homepage "Top Sellers" section actually renders products sorted by `salesCount`, not seller cards — the label doesn't match the content.

---

## What's genuinely solid

- **The returns/refund money flow is correctly and consistently hardened.** `sellers/returns/[id]/confirm`, `admin/returns` (`MARK_REFUNDED`), and `admin/returns/[id]/cod-refund` all use the same pattern: an atomic `updateMany` claim (so concurrent submits get a 409 instead of double-processing), a `$transaction` for stock restoration + wallet debit, and an order-level status flip to `REFUNDED` that only fires once *every* item in the order has been refunded. This matches exactly what the project's own prior audit (`HANDOFF_NOTES.md`) said it fixed, and independent reading confirms the fix landed correctly in all three places.
- **`src/lib/auth.ts`'s production fail-closed behavior is real**, not just documented — the dev-only unverified-token fallback is gated behind `NODE_ENV === "production"` before any fallback logic runs at all.
- **The vanity store-handle system** (`store-handle.ts`, `store-handle-db.ts`, `[handle]/page.tsx`, `StoreHandleHistory`) is carefully engineered: reserved-word protection for routes that don't exist yet, case-insensitive normalization, permanent redirects for retired handles so printed QR codes never break, and a race-safe claim flow.
- **Ownership-via-relation-filter** (folding "look up user → look up resource → check owner" into a single Prisma `where` clause) is used consistently and correctly across cart, wishlist, notifications, orders, addresses, registry, and returns.
- **Order placement's stock decrement is genuinely race-safe** — a transactional conditional `updateMany` (`WHERE stock >= qty`) that maps a zero-row result to a 409, applied per item inside the order-creation transaction.
- **Payment amount is correctly re-validated server-side** against the real order total before a Razorpay order is created, closing the client-under-payment gap the project's own audit flagged as previously fixed.
- **CSV product import** isolates errors per row so one bad row doesn't abort the batch, with clear per-row error reporting back to the seller.
- **The seller dashboard's page-level architecture avoids the admin SSR-leak problem** — all 32 pages are client components that only fetch after the auth gate passes, unlike the admin section.
- Small well-built utility touches worth noting: GST intra/inter-state CGST+SGST vs IGST splitting (with unit tests), the seller QR-code page (multi-format share/print), the multi-vendor GST-correct order invoice page, and the store-handle-suggestion algorithm that batches availability checks into two queries instead of one per keystroke.

---

## Architecture recap

Two independent Next.js 14 apps share one conceptual product: the root app (this repo's `src/`) is the transactional system of record — auth, cart, checkout, orders, payments, payouts, all four dashboards (customer/seller/admin/delivery). `nexcart-catalog/` is a second app with its own database, built to serve read-heavy browse/search pages without competing with checkout for DB connections; data flows one-way from the main DB via a scheduled sync script. Four roles (`CUSTOMER`, `SELLER`, `ADMIN`, `DELIVERY_AGENT`) are modeled in Prisma across 25+ models. Firebase Auth (client + Admin SDK), Razorpay (payments + Route payouts), Shiprocket (courier), Cloudinary (images), Resend (email), Firebase Cloud Messaging (push), and optional Upstash Redis (rate limiting/cache) round out the integration surface. There is no centralized authorization middleware — `src/middleware.ts` only distinguishes public vs. non-public paths — so every API route is individually responsible for its own auth/ownership checks, which is mostly done well (see "What's solid") with the specific gaps enumerated above.

---

## Suggested priority order if you want to act on this

1. Fix the admin SSR data leak — move the Prisma fetches behind a server-side role check (e.g., verify in the page/layout as a Server Component reading a real session, not a client-side `fetch` after mount), and add role checks inside each Server Action.
2. Add the missing role check to `/api/admin/analytics`.
3. Confirm the Razorpay dashboard points at `/api/webhooks/razorpay`, then delete `/api/webhooks/route.ts`.
4. Decide whether the raw-UID-as-bearer-token pattern should be replaced with real `getIdToken()` calls everywhere (the "correct" fix already exists as an example in `SubscriptionClient.tsx`), or at minimum confirm every server route independently verifies the token rather than trusting the header.
5. Add the missing `Authorization` header to the checkout page's order/payment calls (or confirm those routes require it and checkout is currently working by accident/another mechanism).
6. Fix the COD double-credit race with the same atomic-claim pattern already used in the returns flow.
7. Fix the catalog app's buy-now URL and decide whether to add retraction logic (or at least a manual suspension check) to the sync script.
8. Consolidate the subscription pricing constants into one source of truth.
