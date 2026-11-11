/**
 * Server-side input sanitization helpers.
 * Strips HTML tags from user-generated text before storing in the database.
 * React JSX auto-escapes on render, but stripping tags at write-time is
 * a defence-in-depth measure against stored XSS.
 */

/** Remove all HTML/XML tags and trim whitespace, then cap length. */
export function stripHtml(input: string, maxLen = 2000): string {
  return input
    .replace(/<[^>]*>/g, "")   // strip literal HTML tags
    .slice(0, maxLen)
    .trim();
}

/** Validate that every item in an array is a non-empty string (URL). */
export function validateStringArray(arr: unknown, maxItems = 10): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, maxItems);
}
