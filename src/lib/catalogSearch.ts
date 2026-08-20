// The single source of truth for "search a list of game-like records" -
// used by Explore (over the game catalog) and the Library (over your saved
// entries) so both stay behaviorally identical and never drift apart.
// Add a new sort option here once and it shows up everywhere that imports it.

export type SortOption = "title" | "publisher" | "releaseYear" | "-releaseYear";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "title", label: "Title (A-Z)" },
  { value: "publisher", label: "Publisher (A-Z)" },
  { value: "-releaseYear", label: "Release date (newest)" },
  { value: "releaseYear", label: "Release date (oldest)" },
];

const VALID_SORTS: SortOption[] = SORT_OPTIONS.map((option) => option.value);

export function parseSortParam(value: string | null): SortOption {
  return VALID_SORTS.includes(value as SortOption) ? (value as SortOption) : "title";
}

export type CatalogSearchable = {
  title: string;
  console?: string | null;
  publisher: string | null;
  releaseYear: number | null;
  releaseMonth?: number | null;
};

export type CatalogFilters = {
  search?: string;
  console?: string;
  sort?: SortOption;
};

// Strips accents/diacritics and any non-letter/non-number character (spaces,
// apostrophes, hyphens, colons, ...) before lowercasing, so searching
// "pokemon" finds "Pokémon", "bomberman special" finds "Bomber Man Special",
// and "tail gator" finds "Tail 'Gator" - IGDB's own titles aren't always
// spaced/accented/punctuated the way you'd guess. Used everywhere titles get
// matched against a query.
//
// Memoized: this runs over every title in the ~77k-game catalog on every
// search, but a given title's normalized form never changes for the life of
// the page, so recomputing NFKD normalization from scratch each time was
// pure waste (measured ~115ms per search on the full catalog). Caching by
// input string makes every search after a title's first touch free.
const normalizeCache = new Map<string, string>();
export function normalizeForSearch(text: string): string {
  const cached = normalizeCache.get(text);
  if (cached !== undefined) return cached;
  const normalized = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
  normalizeCache.set(text, normalized);
  return normalized;
}

// A cheap, memoized lowercase key for sorting. Deliberately not reusing
// normalizeForSearch's cache: that strips spaces/punctuation entirely, which
// would make e.g. "Mega Man" and "MegaMan" compare equal and sort
// unpredictably relative to each other. This only lowercases, so titles stay
// fully distinguishable while still sorting case-insensitively.
const sortKeyCache = new Map<string, string>();
function sortKey(text: string): string {
  const cached = sortKeyCache.get(text);
  if (cached !== undefined) return cached;
  const key = text.toLowerCase();
  sortKeyCache.set(text, key);
  return key;
}

function compareSortKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Pulled out from filterAndSortByCatalog's sort step so it can also be used
// to merge two already-sorted lists from different sources by the same
// order (see ExploreBrowser's fast search path, which sorts the base
// catalog in SQL and your own custom games in memory, then needs to
// interleave the two correctly rather than just concatenating them).
export function compareForSort<T extends CatalogSearchable>(a: T, b: T, sort: SortOption | undefined): number {
  switch (sort) {
    case "publisher":
      return compareSortKeys(sortKey(a.publisher ?? ""), sortKey(b.publisher ?? ""));
    case "releaseYear":
      return (releaseSortValue(a) ?? Infinity) - (releaseSortValue(b) ?? Infinity);
    case "-releaseYear":
      return (releaseSortValue(b) ?? -Infinity) - (releaseSortValue(a) ?? -Infinity);
    case "title":
    default:
      return compareSortKeys(sortKey(a.title), sortKey(b.title));
  }
}

export function filterAndSortByCatalog<T extends CatalogSearchable>(items: T[], filters: CatalogFilters): T[] {
  let results = items;

  if (filters.search) {
    const query = normalizeForSearch(filters.search);
    results = results.filter((item) => normalizeForSearch(item.title).includes(query));
  }

  if (filters.console) {
    results = results.filter((item) => item.console === filters.console);
  }

  return [...results].sort((a, b) => compareForSort(a, b, filters.sort));
}

// A single comparable number for year+month, so "Release date" sorts by
// month within a year instead of just year. A missing year sorts to the very
// end either direction (Infinity/-Infinity above). A known year with no
// known month defaults to month 1 - i.e. it sorts as the oldest entry within
// its own year, regardless of sort direction.
function releaseSortValue(item: { releaseYear: number | null; releaseMonth?: number | null }): number | null {
  return item.releaseYear === null ? null : item.releaseYear * 100 + (item.releaseMonth ?? 1);
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Sep 2020" when the month is actually known, "2020" when it's year-only,
// null when there's no release date at all - one place so every game/entry
// display formats it the same way.
export function formatReleaseDate(year: number | null, month?: number | null): string | null {
  if (year === null) return null;
  if (month && month >= 1 && month <= 12) return `${MONTH_ABBR[month - 1]} ${year}`;
  return String(year);
}

export function getDistinctConsoles<T extends { console?: string | null }>(items: T[]): string[] {
  const consoles = new Set<string>();
  for (const item of items) {
    if (item.console) consoles.add(item.console);
  }
  return Array.from(consoles).sort((a, b) => a.localeCompare(b));
}
