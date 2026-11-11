/**
 * Prisma Database Client — Safe Singleton Pattern
 * 
 * Handles gracefully when:
 * 1. @prisma/client not generated yet → returns safe defaults, logs setup instructions
 * 2. Database not reachable → actual Prisma errors surface normally
 * 
 * Run: npx prisma generate && npx prisma db push
 */

let PrismaClientConstructor: any;
let prismaAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PrismaClientConstructor = require("@prisma/client").PrismaClient;
  prismaAvailable = true;
} catch {
  console.warn(
    "\n⚠️  Prisma client not generated. Running in demo mode.\n" +
    "   To connect a database, run:\n" +
    "   npx prisma generate\n" +
    "   npx prisma db push\n"
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
};

/**
 * When Prisma isn't available, return a proxy that provides safe defaults
 * instead of crashing the app. This lets the UI render with empty data.
 */
function createFallbackProxy(): any {
  const handler: ProxyHandler<object> = {
    get: (_target, modelName: string) => {
      if (modelName.startsWith("$") || modelName === "then" || typeof modelName === "symbol") {
        return undefined;
      }
      return new Proxy({}, {
        get: (_t, method: string) => {
          return async (..._args: any[]) => {
            // Return safe defaults based on method name
            switch (method) {
              case "findMany":   return [];
              case "findUnique": return null;
              case "findFirst":  return null;
              case "count":      return 0;
              case "aggregate":  return {};
              case "groupBy":    return [];
              case "create":     return { id: "setup-required" };
              case "update":     return { id: "setup-required" };
              case "updateMany": return { count: 0 };
              case "delete":     return null;
              case "deleteMany": return { count: 0 };
              case "upsert":     return { id: "setup-required" };
              default:           return null;
            }
          };
        },
      });
    },
  };
  return new Proxy({}, handler);
}

/**
 * For serverless (Vercel), each function instance should hold at most 1
 * connection to Postgres so PgBouncer can pool them efficiently.
 * We append connection_limit=1 unless the caller already set it.
 * With pgbouncer=true in the URL (Supabase Transaction mode), this means
 * Prisma never opens more than 1 connection per cold-start instance —
 * PgBouncer handles the pooling from there.
 *
 * DEV NOTE: `next dev` is one long-running process, not one-instance-per-
 * request like serverless. A single shared connection there means every
 * concurrent query across the whole app — the homepage's own parallel
 * queries plus every API route the browser fires on page load — queues
 * behind that one connection and can hit pool_timeout waiting its turn.
 * That's a real, measured cause of multi-second responses in dev.
 *
 * IMPORTANT: `npm run start` is ALSO one long-running process (not
 * serverless) — it's just a production build of the same persistent Node
 * server. Gating this on NODE_ENV === "production" therefore starved a
 * normal `npm run start` deployment down to a single DB connection for the
 * *entire app*, which is what caused the
 * "Timed out fetching a new connection from the connection pool
 * (connection limit: 1)" errors — any two concurrent queries (a page load's
 * own parallel fetches, the search autocomplete's 3 parallel queries,
 * notification polling, etc.) had to queue behind that one connection.
 * Vercel sets VERCEL=1 in its serverless runtime, so use that as the actual
 * signal instead of NODE_ENV — every other environment (dev, and a normal
 * `npm run start` on your own machine) gets Prisma's regular pool size.
 */
function getDbUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  if (url.includes("connection_limit=")) return url; // already set
  if (!process.env.VERCEL) return url; // not actual serverless: use Prisma's default pool size
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=1&pool_timeout=10`;
}

function createClient() {
  if (!prismaAvailable) return createFallbackProxy();

  return new PrismaClientConstructor({
    log: ["error"], // no query/warn logging — eliminates overhead in dev
    datasources: { db: { url: getDbUrl() } },
  });
}

export const db = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = db;
