/**
 * Detects a Postgres "column does not exist" error for a specific column,
 * so raw-SQL call sites can degrade gracefully instead of hard-failing.
 *
 * Why this exists: several tables in this app (StoreCollection is one) are
 * managed entirely through hand-written SQL migration FILES rather than
 * Prisma models — see prisma/migrations. A migration file existing in the
 * repo does NOT mean it has actually been run against a given database
 * (this bit twice already: Supabase Realtime's publication/grant, and the
 * StoreCollection "fontStyle" column). When a new nullable column is added
 * this way and a database hasn't been migrated yet, every query that
 * references the new column throws — which would otherwise take down an
 * entire working feature (viewing collections, adding a collection) over a
 * single optional field.
 *
 * Call sites should: try the query WITH the new column, and if this
 * function returns true for the thrown error, retry the same operation
 * WITHOUT that column (defaulting its value to null in the app instead).
 * Any other kind of error should still propagate/fail normally — this must
 * only swallow this one specific, recoverable failure mode.
 */
export function isMissingColumnError(err: unknown, column: string): boolean {
  const message = err instanceof Error ? err.message : String(err);
  // Postgres's actual error text is: column "fontStyle" of relation
  // "StoreCollection" does not exist (INSERT/UPDATE) or column "fontStyle"
  // does not exist (SELECT). Checking for the quoted column name plus
  // "does not exist" avoids false-matching unrelated errors that merely
  // mention the column name in passing.
  return message.includes(`"${column}"`) && message.includes("does not exist");
}
