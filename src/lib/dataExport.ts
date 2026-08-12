import { getLibrary, replaceLibrary, type LibraryEntry } from "./library";
import { getCustomGames, replaceCustomGames } from "./customGames";
import { getLists, replaceLists, type GameList } from "./lists";
import type { GameRecord } from "./types";

export const EXPORT_VERSION = 1;

type Section = {
  key: string;
  label: string;
  getAll: () => unknown[];
  replaceAll: (items: unknown[]) => void;
};

// Every locally-stored, per-browser feature registers itself here once.
// That's the only step needed for it to be picked up by export/import -
// add a new row when a new local-storage-backed list/feature ships.
const SECTIONS: Section[] = [
  {
    key: "library",
    label: "Library",
    getAll: () => getLibrary(),
    replaceAll: (items) => replaceLibrary(items as LibraryEntry[]),
  },
  {
    key: "customGames",
    label: "Added Games",
    getAll: () => getCustomGames(),
    replaceAll: (items) => replaceCustomGames(items as GameRecord[]),
  },
  {
    key: "lists",
    label: "My Lists",
    getAll: () => getLists(),
    replaceAll: (items) => replaceLists(items as GameList[]),
  },
];

export type ExportPayload = {
  version: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
};

export function buildExportPayload(): ExportPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(SECTIONS.map((section) => [section.key, section.getAll()])),
  };
}

export function exportAllDataAsJson(): string {
  return JSON.stringify(buildExportPayload(), null, 2);
}

export type ImportMode = "merge" | "replace";

export type ImportResult = {
  key: string;
  label: string;
  before: number;
  after: number;
  added: number;
  updated: number;
};

function hasStringId(value: unknown): value is { id: string } {
  return typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";
}

function mergeById(existing: unknown[], incoming: { id: string }[]): { merged: unknown[]; added: number; updated: number } {
  const byId = new Map<string, unknown>();
  for (const item of existing) {
    if (hasStringId(item)) byId.set(item.id, item);
  }
  let added = 0;
  let updated = 0;
  for (const item of incoming) {
    if (byId.has(item.id)) updated++;
    else added++;
    byId.set(item.id, item);
  }
  return { merged: Array.from(byId.values()), added, updated };
}

export function importFromJson(json: string, mode: ImportMode): ImportResult[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { data?: unknown }).data !== "object" ||
    (parsed as { data?: unknown }).data === null
  ) {
    throw new Error("This doesn't look like an Any Stat Gaming backup file.");
  }

  const data = (parsed as { data: Record<string, unknown> }).data;
  const results: ImportResult[] = [];

  for (const section of SECTIONS) {
    const rawIncoming = data[section.key];
    if (!Array.isArray(rawIncoming)) continue;
    const incoming = rawIncoming.filter(hasStringId);
    const existing = section.getAll();

    if (mode === "replace") {
      section.replaceAll(incoming);
      results.push({
        key: section.key,
        label: section.label,
        before: existing.length,
        after: incoming.length,
        added: incoming.length,
        updated: 0,
      });
    } else {
      const { merged, added, updated } = mergeById(existing, incoming);
      section.replaceAll(merged);
      results.push({
        key: section.key,
        label: section.label,
        before: existing.length,
        after: merged.length,
        added,
        updated,
      });
    }
  }

  return results;
}
