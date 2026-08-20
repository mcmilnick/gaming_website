"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLists } from "@/hooks/useLists";
import { useLibrary } from "@/hooks/useLibrary";
import { useCustomGames } from "@/hooks/useCustomGames";
import { isCustomGameId } from "@/lib/customGames";
import {
  addEntryToList,
  deleteList,
  moveEntryRelativeTo,
  removeEntryFromList,
  renameList,
  sortEntriesByValue,
  updateListNotes,
  LIST_SORT_OPTIONS,
  type ListSortOption,
} from "@/lib/lists";
import type { LibraryEntry } from "@/lib/library";
import type { GameRecord } from "@/lib/types";
import { normalizeForSearch } from "@/lib/catalogSearch";
import { igdbCoverSmall } from "@/lib/igdbImage";
import { StatusPole } from "@/components/StatusPole";

export function ListDetailView({ id }: { id: string }) {
  const { lists, hydrated } = useLists();
  const { entries: libraryEntries } = useLibrary();
  const { games: customGames } = useCustomGames();
  const router = useRouter();
  const [addQuery, setAddQuery] = useState("");
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ListSortOption>("user");
  const [draggedGameId, setDraggedGameId] = useState<string | null>(null);
  const [dragOverGameId, setDragOverGameId] = useState<string | null>(null);

  const list = lists.find((candidate) => candidate.id === id);
  const libraryById = useMemo(() => {
    const map = new Map<string, LibraryEntry>();
    for (const entry of libraryEntries) map.set(entry.id, entry);
    return map;
  }, [libraryEntries]);

  // A list only stores gameIds - this looks up just the games actually in
  // this list (a small, known set), not the whole ~150k-game catalog, to
  // get their cover art/title. Custom games are already available from
  // localStorage and don't need fetching.
  const baseEntryIds = useMemo(
    () => (list ? list.entries.map((entry) => entry.gameId).filter((gameId) => !isCustomGameId(gameId)) : []),
    [list]
  );
  const [baseGames, setBaseGames] = useState<GameRecord[]>([]);
  const [gamesHydrated, setGamesHydrated] = useState(false);

  useEffect(() => {
    if (baseEntryIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseGames([]);
      setGamesHydrated(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/games/by-ids?ids=${baseEntryIds.join(",")}`)
      .then((res) => res.json())
      .then((games: GameRecord[]) => {
        if (!cancelled) {
          setBaseGames(games);
          setGamesHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baseEntryIds]);

  const catalogById = useMemo(() => {
    const map = new Map<string, GameRecord>();
    for (const game of baseGames) map.set(game.id, game);
    for (const game of customGames) map.set(game.id, game);
    return map;
  }, [baseGames, customGames]);

  const displayedEntries = useMemo(() => {
    if (!list) return [];
    return sortBy === "value" ? sortEntriesByValue(list.entries) : list.entries;
  }, [list, sortBy]);

  const addResults = useMemo(() => {
    const query = normalizeForSearch(addQuery.trim());
    if (!query || !list) return [];
    const existingIds = new Set(list.entries.map((entry) => entry.gameId));
    return libraryEntries
      .filter((entry) => !existingIds.has(entry.id) && normalizeForSearch(entry.title).includes(query))
      .slice(0, 8);
  }, [addQuery, libraryEntries, list]);

  if (!hydrated || !gamesHydrated) {
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

  const canReorder = sortBy === "user";

  function handleDragStart(gameId: string) {
    if (!canReorder) return;
    setDraggedGameId(gameId);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, gameId: string) {
    if (!draggedGameId || draggedGameId === gameId) return;
    e.preventDefault();
    setDragOverGameId(gameId);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetGameId: string) {
    e.preventDefault();
    if (list && draggedGameId && draggedGameId !== targetGameId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY > rect.top + rect.height / 2 ? "after" : "before";
      moveEntryRelativeTo(list.id, draggedGameId, targetGameId, position);
    }
    setDraggedGameId(null);
    setDragOverGameId(null);
  }

  function handleDragEnd() {
    setDraggedGameId(null);
    setDragOverGameId(null);
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

      <textarea
        value={notesDraft ?? list.notes}
        onChange={(e) => setNotesDraft(e.target.value)}
        onBlur={() => {
          if (notesDraft !== null && notesDraft !== list.notes) {
            updateListNotes(list.id, notesDraft);
          }
          setNotesDraft(null);
        }}
        placeholder="Comments about this list..."
        rows={2}
        className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
      />

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
            const catalogGame = catalogById.get(entry.gameId);
            const title = catalogGame?.title ?? libraryEntry?.title ?? entry.gameId;
            const coverUrl = igdbCoverSmall(catalogGame?.coverUrl);

            return (
              <div
                key={entry.gameId}
                onDragOver={(e) => handleDragOver(e, entry.gameId)}
                onDrop={(e) => handleDrop(e, entry.gameId)}
                className={`flex items-center gap-3 rounded border bg-zinc-900 px-3 py-2 transition-colors ${
                  dragOverGameId === entry.gameId
                    ? "border-emerald-600"
                    : "border-zinc-800"
                } ${draggedGameId === entry.gameId ? "opacity-40" : ""}`}
              >
                <span
                  draggable={canReorder}
                  onDragStart={() => handleDragStart(entry.gameId)}
                  onDragEnd={handleDragEnd}
                  title={canReorder ? "Drag to reorder" : "Switch to User order to reorder"}
                  className={`flex-shrink-0 px-1 text-zinc-500 ${
                    canReorder ? "cursor-grab active:cursor-grabbing hover:text-zinc-300" : "opacity-20"
                  }`}
                  aria-label="Drag to reorder"
                >
                  ⠿
                </span>

                <span className="w-6 flex-shrink-0 text-center text-sm font-medium text-zinc-400">{index + 1}</span>

                <Link
                  href={`/game/${entry.gameId}`}
                  className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-zinc-800"
                >
                  {coverUrl && (
                    <Image src={coverUrl} alt={title} fill unoptimized className="object-cover" sizes="40px" />
                  )}
                </Link>

                <Link href={`/game/${entry.gameId}`} className="flex-1 text-sm text-zinc-100 hover:underline">
                  {title}
                </Link>

                <StatusPole status={libraryEntry?.status} />

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
