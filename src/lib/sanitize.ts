// ── Search / filter sanitization ─────────────────────────────────────────────

/**
 * Sanitizes a user-supplied search string for use in PostgREST `.or()` filters.
 * Strips characters that would break the filter syntax, trims, and caps length.
 *
 * Characters stripped: , ( ) ' " ; \ — all have special meaning in PostgREST.
 */
export function sanitizeSearchQuery(value: string, maxLength = 200): string {
  return value
    .trim()
    .replace(/[,()'";\\%_]/g, '')   // PostgREST + LIKE metacharacters
    .slice(0, maxLength)
}

// ── General input sanitization ────────────────────────────────────────────────

/**
 * Sanitizes a form input value: trims whitespace and enforces a max length.
 * Use for names, descriptions, and any free-text field stored to DB.
 */
export function sanitizeInput(value: string, maxLength = 500): string {
  return value.trim().slice(0, maxLength)
}

/**
 * Converts a string to a URL-safe slug.
 * Strips non-alphanumeric characters, lowercases, collapses dashes.
 */
export function sanitizeSlug(value: string, maxLength = 80): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

/**
 * Ensures an enum value is one of the allowed options.
 * Falls back to `defaultValue` if the input is not in the allowed set.
 */
export function sanitizeEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  defaultValue: T,
): T {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : defaultValue
}
