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
  status: LibraryStatus;
  userRating: number | null;
  notes: string;
  addedAt: string;
  updatedAt: string;
};

export type LibraryEntryInput = Pick<
  LibraryEntry,
  "id" | "title" | "console" | "developer" | "publisher" | "releaseYear"
>;

const store = createLocalStore<LibraryEntry>(
  "retroexplore:library:v1",
  "retroexplore:library:change",
  // Entries saved before `console` was tracked on the Library don't have it -
  // every base title at the time was Game Boy, so that's a safe backfill.
  (entry) => ({ ...entry, console: entry.console ?? "Game Boy" })
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

// The Library adds a sort dimension the base catalog doesn't have (your own
// rating), layered on top of the shared search/console/sort core rather than
// forking it.
export type LibrarySortOption = SortOption | "rating" | "-rating";

export const LIBRARY_SORT_OPTIONS: { value: LibrarySortOption; label: string }[] = [
  ...SORT_OPTIONS,
  { value: "-rating", label: "My rating (high to low)" },
  { value: "rating", label: "My rating (low to high)" },
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
