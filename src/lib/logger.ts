/**
 * Centralized error/event logger.
 *
 * Currently writes structured JSON to stderr/stdout (captured by your
 * hosting platform's log viewer — e.g. Vercel "Logs" tab). This gives every
 * error a consistent shape (timestamp, scope, message, stack, extra context)
 * that's easy to grep or pipe into a log aggregator later.
 *
 * To wire up a real error-tracking service (Sentry, etc.) later:
 *  1. `npm install @sentry/nextjs` and run `npx @sentry/wizard@latest -i nextjs`
 *  2. In `captureError` below, after the console.error call, add:
 *       const Sentry = await import("@sentry/nextjs");
 *       Sentry.captureException(error, { extra: { scope, ...context } });
 *  3. Set SENTRY_DSN in your environment.
 *
 * Until then, this module is a safe, dependency-free drop-in that the rest
 * of the app can call without caring whether a tracking service is configured.
 */

type LogContext = Record<string, unknown>;

function serialize(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: error };
}

/**
 * Log an error with a scope (e.g. "api/orders", "webhook/razorpay") and
 * optional extra context (ids, payload summaries, etc.). Never throws.
 */
export function captureError(scope: string, error: unknown, context?: LogContext): void {
  try {
    const entry = {
      level: "error",
      scope,
      time: new Date().toISOString(),
      error: serialize(error),
      ...(context ? { context } : {}),
    };
    console.error(JSON.stringify(entry));
  } catch {
    // Last resort — never let logging itself throw
    console.error(`[${scope}]`, error);
  }
}

/**
 * Log a non-error but notable event (e.g. "payout blocked: missing GSTIN").
 */
export function captureMessage(scope: string, message: string, context?: LogContext): void {
  try {
    const entry = {
      level: "info",
      scope,
      time: new Date().toISOString(),
      message,
      ...(context ? { context } : {}),
    };
    console.log(JSON.stringify(entry));
  } catch {
    console.log(`[${scope}] ${message}`);
  }
}
