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
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
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

  return [...results].sort((a, b) => {
    switch (filters.sort) {
      case "publisher":
        return (a.publisher ?? "").localeCompare(b.publisher ?? "");
      case "releaseYear":
        return (a.releaseYear ?? 9999) - (b.releaseYear ?? 9999);
      case "-releaseYear":
        return (b.releaseYear ?? -9999) - (a.releaseYear ?? -9999);
      case "title":
      default:
        return a.title.localeCompare(b.title);
    }
  });
}

export function getDistinctConsoles<T extends { console?: string | null }>(items: T[]): string[] {
  const consoles = new Set<string>();
  for (const item of items) {
    if (item.console) consoles.add(item.console);
  }
  return Array.from(consoles).sort((a, b) => a.localeCompare(b));
}
