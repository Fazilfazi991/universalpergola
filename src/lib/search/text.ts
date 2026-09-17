const MAX_SEARCH_TERM_LENGTH = 100;

/**
 * Collapse text into a comparable form: Unicode-normalized, case-folded,
 * punctuation-insensitive, with runs of separators reduced to single spaces.
 *
 * The same function must be applied to the user's search term and to every
 * indexed value it is compared against. Normalizing only the term (or only the
 * value) makes otherwise identical text fail to match whenever the two sides
 * differ in punctuation, for example the site value
 * `[UAT] Dubai Hills, Dubai` against the term `Dubai Hills Dubai`.
 */
export function normalizeSearchText(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Normalize a raw user-entered search term, bounded to a sane length. */
export function normalizeSearchTerm(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return normalizeSearchText(value.slice(0, MAX_SEARCH_TERM_LENGTH));
}

/** True when `search` (already normalized) appears in any of the given values. */
export function matchesNormalizedSearch(values: (string | null | undefined)[], search: string) {
  if (!search) return true;
  return normalizeSearchText(values.filter(Boolean).join(" ")).includes(search);
}
