import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days
    dangerouslyAllowSVG: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=1800, stale-while-revalidate=86400" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      // These two rules apply "immutable, cache for a year" — correct in
      // production where /_next/static chunk filenames are content-hashed
      // (a changed file gets a new filename, so the old cached copy is
      // simply never requested again). In dev, filenames like
      // "app/page.js" do NOT change per edit, so this same rule told the
      // browser to cache every route bundle forever — meaning code edits
      // would compile fine on the server but the browser would keep
      // serving the pre-edit bundle from cache indefinitely, with no
      // visible error. Gating these to production only fixes that.
      ...(isProd
        ? [
            {
              source: "/_next/static/(.*)",
              headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
            },
            {
              source: "/icon-(.*)\\.png",
              headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
            },
          ]
        : []),
    ];
  },
  async redirects() {
    return [];
  },
  experimental: {
    instrumentationHook: true,
    // Every page here is DB-backed and can change at any moment (a seller
    // edits their store colour, a product's stock changes, an admin renames
    // a category...). Next's client Router Cache would otherwise reuse an
    // already-rendered copy of a route for up to 5 minutes after a
    // prefetched <Link> visit (or 30s for a plain one) — so a seller could
    // save a change, click straight into a page that shows it, and still see
    // the old version. Setting both to 0 makes every client-side navigation
    // ask the server fresh, every time. The server-side layers
    // (unstable_cache + Redis, see lib/cache.ts) still keep those fresh
    // requests fast — this only turns off the *browser's* reuse of old
    // renders, not server-side caching.
    staleTimes: { dynamic: 0, static: 0 },
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-accordion",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "sonner",
      "date-fns",
      "recharts",
    ],
    serverComponentsExternalPackages: ["@prisma/client", "firebase-admin"],
  },
  compress: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default withPWAConfig(nextConfig);
