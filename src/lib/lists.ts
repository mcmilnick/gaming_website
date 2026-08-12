import { createLocalStore } from "./localStore";

export type ListEntry = {
  gameId: string;
  value: string | null;
  addedAt: string;
};

export type GameList = {
  id: string;
  name: string;
  entries: ListEntry[];
  createdAt: string;
  updatedAt: string;
};

const store = createLocalStore<GameList>("retroexplore:lists:v1", "retroexplore:lists:change");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getLists(): GameList[] {
  return store.readAll();
}

export function subscribeToLists(callback: () => void): () => void {
  return store.subscribe(callback);
}

export function replaceLists(lists: GameList[]): void {
  store.writeAll(lists);
}

export function getListById(id: string): GameList | undefined {
  return store.readAll().find((list) => list.id === id);
}

function findListByName(name: string): GameList | undefined {
  const target = name.trim().toLowerCase();
  return store.readAll().find((list) => list.name.trim().toLowerCase() === target);
}

export function createList(name: string): GameList {
  const trimmed = name.trim();
  const existing = findListByName(trimmed);
  if (existing) return existing;

  const now = new Date().toISOString();
  const list: GameList = {
    id: `list-${slugify(trimmed)}-${Date.now().toString(36)}`,
    name: trimmed,
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
  store.writeAll([...store.readAll(), list]);
  return list;
}

export function renameList(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const lists = store.readAll();
  const index = lists.findIndex((list) => list.id === id);
  if (index === -1) return;
  const next = [...lists];
  next[index] = { ...next[index], name: trimmed, updatedAt: new Date().toISOString() };
  store.writeAll(next);
}

export function deleteList(id: string): void {
  store.writeAll(store.readAll().filter((list) => list.id !== id));
}

export function addEntryToList(listId: string, gameId: string, value: string | null = null): void {
  const lists = store.readAll();
  const index = lists.findIndex((list) => list.id === listId);
  if (index === -1) return;

  const list = lists[index];
  const entryIndex = list.entries.findIndex((entry) => entry.gameId === gameId);
  const nextEntries = [...list.entries];
  if (entryIndex === -1) {
    nextEntries.push({ gameId, value, addedAt: new Date().toISOString() });
  } else {
    nextEntries[entryIndex] = { ...nextEntries[entryIndex], value };
  }

  const next = [...lists];
  next[index] = { ...list, entries: nextEntries, updatedAt: new Date().toISOString() };
  store.writeAll(next);
}

export function removeEntryFromList(listId: string, gameId: string): void {
  const lists = store.readAll();
  const index = lists.findIndex((list) => list.id === listId);
  if (index === -1) return;
  const next = [...lists];
  next[index] = {
    ...next[index],
    entries: next[index].entries.filter((entry) => entry.gameId !== gameId),
    updatedAt: new Date().toISOString(),
  };
  store.writeAll(next);
}

export function moveEntry(listId: string, gameId: string, direction: "up" | "down"): void {
  const lists = store.readAll();
  const index = lists.findIndex((list) => list.id === listId);
  if (index === -1) return;

  const entries = [...lists[index].entries];
  const from = entries.findIndex((entry) => entry.gameId === gameId);
  if (from === -1) return;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= entries.length) return;

  [entries[from], entries[to]] = [entries[to], entries[from]];
  const next = [...lists];
  next[index] = { ...next[index], entries, updatedAt: new Date().toISOString() };
  store.writeAll(next);
}

// Used by the Notes bracket-tag shortcut ([List Name] / [List Name: value]):
// creates the list if it doesn't exist yet and upserts this game into it.
export function upsertGameInListByName(name: string, gameId: string, value: string | null): GameList {
  const list = createList(name);
  addEntryToList(list.id, gameId, value);
  return list;
}

export function getListsForGame(gameId: string): { list: GameList; value: string | null }[] {
  const results: { list: GameList; value: string | null }[] = [];
  for (const list of store.readAll()) {
    const entry = list.entries.find((e) => e.gameId === gameId);
    if (entry) results.push({ list, value: entry.value });
  }
  return results;
}

export type ListSortOption = "user" | "value";

export const LIST_SORT_OPTIONS: { value: ListSortOption; label: string }[] = [
  { value: "user", label: "User order" },
  { value: "value", label: "Custom field (numeric)" },
];

function parseNumericValue(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

// Sorts ascending by the entry's custom `value` field, treating it as a
// plain number. Anything that isn't a valid number (missing, blank, or text
// like "32:15") sinks to the bottom, keeping its relative order.
export function sortEntriesByValue(entries: ListEntry[]): ListEntry[] {
  return [...entries].sort((a, b) => {
    const aNum = parseNumericValue(a.value);
    const bNum = parseNumericValue(b.value);
    if (aNum === null && bNum === null) return 0;
    if (aNum === null) return 1;
    if (bNum === null) return -1;
    return aNum - bNum;
  });
}
