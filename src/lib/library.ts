import { createLocalStore } from "./localStore";
import { SORT_OPTIONS, type SortOption } from "./catalogSearch";

export type LibraryStatus = "want" | "playing" | "completed" | "abandoned";

export const STATUS_LABELS: Record<LibraryStatus, string> = {
  want: "Backlog",
  playing: "Playing",
  completed: "Completed",
  abandoned: "Dropped",
};

export const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = (
  Object.entries(STATUS_LABELS) as [LibraryStatus, string][]
).map(([value, label]) => ({ value, label }));

export type LibraryEntry = {
  id: string;
  title: string;
  console: string | null;
  developer: string | null;
  publisher: string | null;
  releaseYear: number | null;
  releaseMonth: number | null;
  status: LibraryStatus;
  userRating: number | null;
  notes: string;
  addedAt: string;
  updatedAt: string;
};

export type LibraryEntryInput = Pick<
  LibraryEntry,
  "id" | "title" | "console" | "developer" | "publisher" | "releaseYear" | "releaseMonth"
>;

const store = createLocalStore<LibraryEntry>(
  "retroexplore:library:v1",
  "retroexplore:library:change",
  // Entries saved before `console` was tracked on the Library don't have it -
  // every base title at the time was Game Boy, so that's a safe backfill.
  // Entries saved before `releaseMonth` existed just don't have it - null
  // (year-only) is the correct read for those regardless.
  (entry) => ({ ...entry, console: entry.console ?? "Game Boy", releaseMonth: entry.releaseMonth ?? null })
);

export function getLibrary(): LibraryEntry[] {
  return store.readAll();
}

export function subscribeToLibrary(callback: () => void): () => void {
  return store.subscribe(callback);
}

export function replaceLibrary(entries: LibraryEntry[]): void {
  store.writeAll(entries);
}

export function isInLibrary(id: string): boolean {
  return store.readAll().some((entry) => entry.id === id);
}

export function addToLibrary(game: LibraryEntryInput, status: LibraryStatus = "want"): void {
  const entries = store.readAll();
  if (entries.some((entry) => entry.id === game.id)) return;
  const now = new Date().toISOString();
  store.writeAll([
    ...entries,
    { ...game, status, userRating: null, notes: "", addedAt: now, updatedAt: now },
  ]);
}

export function removeFromLibrary(id: string): void {
  store.writeAll(store.readAll().filter((entry) => entry.id !== id));
}

export function updateEntry(
  id: string,
  patch: Partial<Pick<LibraryEntry, "status" | "userRating" | "notes">>
): void {
  const entries = store.readAll();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const next = [...entries];
  next[index] = { ...next[index], ...patch, updatedAt: new Date().toISOString() };
  store.writeAll(next);
}

// The Library adds sort dimensions the base catalog doesn't have (your own
// rating, when you added it), layered on top of the shared search/console/sort
// core rather than forking it. Both are Library-only - the base catalog has
// no "added" or "rating" concept, since those are about your relationship to
// the game, not the game itself.
export type LibrarySortOption = SortOption | "rating" | "-rating" | "addedAt" | "-addedAt";

export const LIBRARY_SORT_OPTIONS: { value: LibrarySortOption; label: string }[] = [
  ...SORT_OPTIONS,
  { value: "-rating", label: "My rating (high to low)" },
  { value: "rating", label: "My rating (low to high)" },
  { value: "-addedAt", label: "Added to Lib (recent to old)" },
  { value: "addedAt", label: "Added to Lib (old to recent)" },
];

const VALID_LIBRARY_SORTS: LibrarySortOption[] = LIBRARY_SORT_OPTIONS.map((option) => option.value);

export function parseLibrarySortParam(value: string | null): LibrarySortOption {
  return VALID_LIBRARY_SORTS.includes(value as LibrarySortOption) ? (value as LibrarySortOption) : "title";
}

export function isRatingSort(sort: LibrarySortOption): sort is "rating" | "-rating" {
  return sort === "rating" || sort === "-rating";
}

export function sortByRating<T extends { userRating: number | null }>(entries: T[], sort: LibrarySortOption): T[] {
  return [...entries].sort((a, b) => {
    const diff = (a.userRating ?? 0) - (b.userRating ?? 0);
    return sort === "rating" ? diff : -diff;
  });
}

export function isDateAddedSort(sort: LibrarySortOption): sort is "addedAt" | "-addedAt" {
  return sort === "addedAt" || sort === "-addedAt";
}

export function sortByDateAdded<T extends { addedAt: string }>(entries: T[], sort: LibrarySortOption): T[] {
  return [...entries].sort((a, b) => {
    const diff = a.addedAt.localeCompare(b.addedAt);
    return sort === "addedAt" ? diff : -diff;
  });
}
