/**
 * Store handles — the vanity URL for a storefront: nexcart.com/<handle>
 *
 * Handles live at the ROOT of the site, so every handle competes with every
 * top-level route the app has or will ever have. Next.js App Router resolves
 * static segments before dynamic ones, so an existing route like /cart always
 * wins — which means a seller who claimed "cart" would get a store that is
 * silently unreachable, with no error anywhere to explain why.
 *
 * RESERVED_HANDLES below is what prevents that. It deliberately includes routes
 * that do NOT exist yet (careers, help, blog, ...) because those are already
 * linked from the site footer; the day one of them is built, it would shadow
 * whichever seller had taken that handle.
 *
 * >>> Adding a new top-level route? Add it to RESERVED_HANDLES in the same
 * >>> commit, and check no seller already owns it.
 */

/** Handles nobody may claim. Compared lowercase. */
export const RESERVED_HANDLES = new Set<string>([
  // ── Existing top-level routes ────────────────────────────────────────────
  "about", "become-seller", "cart", "categories", "checkout", "deals",
  "delivery", "flash-sale", "gallery", "new", "notifications", "onboarding",
  "orders", "privacy", "product", "products", "refund-policy", "registry",
  "search", "sign-in", "sign-up", "store", "terms", "trending",
  "verify-email", "verify-email-pending", "wishlist", "account", "dashboard",
  "admin", "api",

  // ── Linked in the footer but not built yet — reserving these now stops a
  //    future page from shadowing a live storefront ────────────────────────
  "careers", "press", "blog", "help", "pricing", "cookies", "returns",

  // ── Framework / infrastructure paths ─────────────────────────────────────
  "_next", "static", "assets", "public", "images", "img", "fonts", "media",
  "favicon", "favicon.ico", "robots", "robots.txt", "sitemap", "sitemap.xml",
  "manifest", "manifest.json", "sw", "service-worker", "health", "status",
  "well-known", ".well-known",

  // ── Auth / account surfaces we may add later ─────────────────────────────
  "login", "logout", "signin", "signout", "signup", "register", "auth",
  "settings", "profile", "password", "reset", "verify", "invite",

  // ── Singular/plural variants of existing routes ──────────────────────────
  "seller", "sellers", "user", "users", "order", "category", "collection",
  "collections", "review", "reviews", "coupon", "coupons", "payment",
  "payments", "payout", "payouts", "invoice", "invoices", "return",
  "subscription", "subscriptions", "notification", "wishlists",

  // ── Brand / impersonation defence ────────────────────────────────────────
  "nexcart", "nexcart-official", "official", "support", "helpdesk", "contact",
  "team", "staff", "moderator", "mod", "root", "system", "security", "billing",
  "legal", "abuse", "postmaster", "webmaster", "www", "mail", "email", "ftp",
  "cdn", "app", "apps", "web", "mobile", "test", "demo", "example", "null",
  "undefined", "true", "false",
]);

/** Length bounds. 3 minimum discourages landgrabbing 1–2 char handles. */
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

/**
 * Allowed shape: lowercase letters, digits, dot, underscore.
 * These are Instagram's own rules, which is what sellers will expect since
 * most of them are copying their Instagram handle across.
 */
export const HANDLE_REGEX = /^[a-z0-9._]{3,30}$/;

/**
 * Normalise raw user input into a candidate handle.
 * Accepts what people actually paste: "@pickles_02",
 * "instagram.com/pickles_02", "https://www.instagram.com/pickles_02/",
 * " Pickles_02 " — all become "pickles_02".
 *
 * This only cleans the string; call `validateHandle` to decide if it is usable.
 */
export function normalizeHandle(input: string): string {
  let h = (input ?? "").trim().toLowerCase();

  // Strip a pasted profile URL down to its last meaningful path segment.
  h = h.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (h.includes("/")) {
    const segments = h.split("/").filter(Boolean);
    h = segments[segments.length - 1] ?? "";
  }

  // Drop query strings / fragments left over from a copied link.
  h = h.split("?")[0].split("#")[0];

  // Leading @ from an Instagram-style mention.
  h = h.replace(/^@+/, "");

  return h;
}

export type HandleValidationResult =
  | { ok: true; handle: string }
  | { ok: false; error: string };

/**
 * Validate a normalised handle against shape, length and reserved words.
 * Does NOT check the database — uniqueness is enforced separately, since that
 * requires a query and a unique constraint.
 */
export function validateHandle(input: string): HandleValidationResult {
  const handle = normalizeHandle(input);

  if (!handle) {
    return { ok: false, error: "Please enter a store handle." };
  }
  if (handle.length < HANDLE_MIN_LENGTH) {
    return { ok: false, error: `Handle must be at least ${HANDLE_MIN_LENGTH} characters.` };
  }
  if (handle.length > HANDLE_MAX_LENGTH) {
    return { ok: false, error: `Handle cannot be longer than ${HANDLE_MAX_LENGTH} characters.` };
  }
  if (!HANDLE_REGEX.test(handle)) {
    return {
      ok: false,
      error: "Only lowercase letters, numbers, dots and underscores are allowed.",
    };
  }
  if (/^[._]/.test(handle) || /[._]$/.test(handle)) {
    return { ok: false, error: "Handle cannot start or end with a dot or underscore." };
  }
  if (/\.\./.test(handle) || /__/.test(handle)) {
    return { ok: false, error: "Handle cannot contain two dots or underscores in a row." };
  }
  // A purely numeric handle would be ambiguous against any future numeric
  // ID route (e.g. /12345) and reads like an accident.
  if (/^[0-9]+$/.test(handle)) {
    return { ok: false, error: "Handle must contain at least one letter." };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "That handle is reserved. Please choose another." };
  }

  return { ok: true, handle };
}

/**
 * Trim a base handle so that appending `reserve` more characters still fits
 * inside HANDLE_MAX_LENGTH, then strip any separator left dangling at the end
 * (a trailing dot or underscore would fail validation).
 */
function clipBase(base: string, reserve: number): string {
  return base.slice(0, Math.max(1, HANDLE_MAX_LENGTH - reserve)).replace(/[._]+$/, "");
}

/**
 * Alternatives to offer when the handle someone wants is unavailable —
 * the "pickles_02 is taken, try pickles_02_official" behaviour from Instagram.
 *
 * Pure and synchronous: it only produces *candidates*. Checking which are
 * actually free is `suggestAvailableHandles` in `store-handle-db.ts`, which
 * does it in a fixed two queries rather than one per candidate.
 *
 * Every candidate is run through `validateHandle`, so reserved words and
 * malformed results can never be suggested.
 */
export function generateHandleCandidates(input: string, count = 15): string[] {
  const base = normalizeHandle(input).replace(/[._]+$/, "");
  if (!base) return [];

  const out = new Set<string>();
  const add = (candidate: string) => {
    if (out.size >= count) return;
    const result = validateHandle(candidate);
    if (result.ok && result.handle !== base) out.add(result.handle);
  };

  // Descriptive suffixes first — these read best on a storefront.
  for (const suffix of ["official", "store", "shop", "hq", "in"]) {
    add(`${clipBase(base, suffix.length + 1)}_${suffix}`);
  }

  // Then short numeric variants, which is what people usually settle for.
  const year = new Date().getFullYear();
  for (const n of [1, 2, 3, 7, 24, 99, year % 100, year]) {
    const s = String(n);
    add(`${clipBase(base, s.length)}${s}`);
    add(`${clipBase(base, s.length + 1)}_${s}`);
  }

  // Finally a prefixed form, for when the bare name is simply gone.
  add(`the_${clipBase(base, 4)}`);
  add(`${clipBase(base, 3)}_co`);

  return Array.from(out);
}

/**
 * Best-effort handle suggestion derived from a store name.
 * Used to pre-fill the signup field — never written without the seller
 * confirming, because names like "AK FOOT WEARuuulkjh" do not slugify into
 * anything a seller would actually want printed on a QR code.
 * Returns null when nothing usable can be derived.
 */
export function suggestHandleFromStoreName(storeName: string): string | null {
  const base = (storeName ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/_+$/g, "");

  const result = validateHandle(base);
  return result.ok ? result.handle : null;
}
