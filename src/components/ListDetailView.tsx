"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLists } from "@/hooks/useLists";
import { useLibrary } from "@/hooks/useLibrary";
import {
  addEntryToList,
  deleteList,
  moveEntry,
  removeEntryFromList,
  renameList,
  sortEntriesByValue,
  LIST_SORT_OPTIONS,
  type ListSortOption,
} from "@/lib/lists";
import type { LibraryEntry } from "@/lib/library";

export function ListDetailView({ id }: { id: string }) {
  const { lists, hydrated } = useLists();
  const { entries: libraryEntries } = useLibrary();
  const router = useRouter();
  const [addQuery, setAddQuery] = useState("");
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ListSortOption>("user");

  const list = lists.find((candidate) => candidate.id === id);
  const libraryById = useMemo(() => {
    const map = new Map<string, LibraryEntry>();
    for (const entry of libraryEntries) map.set(entry.id, entry);
    return map;
  }, [libraryEntries]);

  const displayedEntries = useMemo(() => {
    if (!list) return [];
    return sortBy === "value" ? sortEntriesByValue(list.entries) : list.entries;
  }, [list, sortBy]);

  const addResults = useMemo(() => {
    const query = addQuery.trim().toLowerCase();
    if (!query || !list) return [];
    const existingIds = new Set(list.entries.map((entry) => entry.gameId));
    return libraryEntries
      .filter((entry) => !existingIds.has(entry.id) && entry.title.toLowerCase().includes(query))
      .slice(0, 8);
  }, [addQuery, libraryEntries, list]);

  if (!hydrated) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-zinc-500">Loading…</div>;
  }

  if (!list) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">List not found</h1>
        <p className="mt-3 text-sm text-zinc-400">
          <Link href="/lists" className="underline hover:text-zinc-200">
            Back to My Lists
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/lists" className="text-sm text-zinc-400 hover:text-zinc-200">
        &larr; Back to My Lists
      </Link>

      <div className="mt-2 flex items-center justify-between gap-4">
        <input
          value={nameDraft ?? list.name}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            if (nameDraft !== null && nameDraft.trim() && nameDraft.trim() !== list.name) {
              renameList(list.id, nameDraft);
            }
            setNameDraft(null);
          }}
          className="w-full rounded border border-transparent bg-transparent px-1 text-2xl font-bold text-zinc-100 hover:border-zinc-700 focus:border-emerald-600 focus:bg-zinc-900 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${list.name}"? This can't be undone.`)) {
              deleteList(list.id);
              router.push("/lists");
            }
          }}
          className="flex-shrink-0 text-xs text-red-400 hover:text-red-300"
        >
          Delete list
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">
          {list.entries.length} game{list.entries.length === 1 ? "" : "s"}, in order.
        </p>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as ListSortOption)}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          {LIST_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {sortBy === "value" && (
        <p className="mt-1 text-xs text-zinc-500">
          Sorted by the value field, low to high — entries without a valid number sink to the
          bottom. Switch back to User order to reorder manually.
        </p>
      )}

      <div className="relative mt-6">
        <label className="text-xs text-zinc-400" htmlFor="addToList">
          Add from your Library
        </label>
        <input
          id="addToList"
          value={addQuery}
          onChange={(e) => setAddQuery(e.target.value)}
          placeholder="Search your library..."
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
        />
        {addResults.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border border-zinc-700 bg-zinc-950 shadow-lg">
            {addResults.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onMouseDown={() => {
                    addEntryToList(list.id, entry.id);
                    setAddQuery("");
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-zinc-800"
                >
                  <span className="text-sm text-zinc-100">{entry.title}</span>
                  <span className="text-xs text-zinc-500">
                    {[entry.console, entry.publisher, entry.releaseYear].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {displayedEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing in this list yet.</p>
        ) : (
          displayedEntries.map((entry, index) => {
            const libraryEntry = libraryById.get(entry.gameId);
            const title = libraryEntry?.title ?? entry.gameId;
            const canReorder = sortBy === "user";

            return (
              <div
                key={entry.gameId}
                className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveEntry(list.id, entry.gameId, "up")}
                    disabled={!canReorder || index === 0}
                    title={canReorder ? undefined : "Switch to User order to reorder"}
                    className="text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-20"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveEntry(list.id, entry.gameId, "down")}
                    disabled={!canReorder || index === displayedEntries.length - 1}
                    title={canReorder ? undefined : "Switch to User order to reorder"}
                    className="text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-20"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                <span className="w-6 flex-shrink-0 text-center text-xs text-zinc-500">{index + 1}</span>

                <Link href={`/game/${entry.gameId}`} className="flex-1 text-sm text-zinc-100 hover:underline">
                  {title}
                </Link>

                <input
                  defaultValue={entry.value ?? ""}
                  onBlur={(e) => addEntryToList(list.id, entry.gameId, e.target.value.trim() || null)}
                  placeholder="value (e.g. 32:15)"
                  className="w-36 flex-shrink-0 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600"
                />

                <button
                  type="button"
                  onClick={() => removeEntryFromList(list.id, entry.gameId)}
                  className="flex-shrink-0 text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
