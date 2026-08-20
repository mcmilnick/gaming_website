"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLibrary } from "@/hooks/useLibrary";
import {
  parseLibrarySortParam,
  isRatingSort,
  sortByRating,
  isDateAddedSort,
  sortByDateAdded,
  LIBRARY_SORT_OPTIONS,
} from "@/lib/library";
import { filterAndSortByCatalog, getDistinctConsoles } from "@/lib/catalogSearch";
import { paginate } from "@/lib/games";
import { isCustomGameId } from "@/lib/customGames";
import type { GameRecord } from "@/lib/types";
import { FilterBar } from "@/components/FilterBar";
import { LibraryEntryRow } from "@/components/LibraryEntryRow";
import { Panel } from "@/components/Panel";
import { Pagination } from "@/components/Pagination";

const VALID_SOURCES = ["base", "custom", "all"] as const;
type Source = (typeof VALID_SOURCES)[number];
const LIBRARY_PAGE_SIZE = 40;

export function LibraryBrowser() {
  const { entries, hydrated } = useLibrary();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const search = searchParams.get("search") ?? "";
  const consoleFilter = searchParams.get("console") ?? "";
  const sort = parseLibrarySortParam(searchParams.get("sort"));
  const statusFilter = searchParams.get("status") ?? "";
  const sourceParam = searchParams.get("source");
  // Unlike Explore, "all" is the default here - nothing in your own library
  // should disappear on first load just because a filter exists.
  const source: Source = VALID_SOURCES.includes(sourceParam as Source) ? (sourceParam as Source) : "all";
  const includeMods = searchParams.get("includeMods") === "1";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const consoles = useMemo(() => getDistinctConsoles(entries), [entries]);

  // Only need the mod/hack flag for games actually in the library - a
  // small, known set of ids - not the whole ~150k-game catalog. Custom
  // games always have isModOrHack: false (see customGames.ts), so they're
  // excluded from the lookup rather than sent to a database that doesn't
  // have them at all.
  const baseEntryIds = useMemo(
    () => entries.filter((entry) => !isCustomGameId(entry.id)).map((entry) => entry.id),
    [entries]
  );
  const [modFlagsById, setModFlagsById] = useState<Map<string, boolean>>(new Map());
  const [gamesHydrated, setGamesHydrated] = useState(false);

  useEffect(() => {
    if (baseEntryIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModFlagsById(new Map());
      setGamesHydrated(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/games/by-ids?ids=${baseEntryIds.join(",")}`)
      .then((res) => res.json())
      .then((games: GameRecord[]) => {
        if (cancelled) return;
        setModFlagsById(new Map(games.map((game) => [game.id, game.isModOrHack])));
        setGamesHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [baseEntryIds]);

  const filtered = useMemo(() => {
    let eligible = statusFilter ? entries.filter((entry) => entry.status === statusFilter) : entries;
    if (source === "base") eligible = eligible.filter((entry) => !isCustomGameId(entry.id));
    else if (source === "custom") eligible = eligible.filter((entry) => isCustomGameId(entry.id));
    if (!includeMods) {
      eligible = eligible.filter((entry) => !modFlagsById.get(entry.id));
    }
    if (isRatingSort(sort)) {
      const searched = filterAndSortByCatalog(eligible, { search, console: consoleFilter });
      return sortByRating(searched, sort);
    }
    if (isDateAddedSort(sort)) {
      const searched = filterAndSortByCatalog(eligible, { search, console: consoleFilter });
      return sortByDateAdded(searched, sort);
    }
    return filterAndSortByCatalog(eligible, { search, console: consoleFilter, sort });
  }, [entries, statusFilter, source, includeMods, search, consoleFilter, sort, modFlagsById]);

  const { items: results, count } = paginate(filtered, page, LIBRARY_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(count / LIBRARY_PAGE_SIZE));

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  if (!hydrated || !gamesHydrated) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-zinc-500">Loading your library…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Your library is empty</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Browse{" "}
          <Link href="/" className="underline hover:text-zinc-200">
            All Games
          </Link>{" "}
          and add games you own, are playing, or want to play. Everything here is saved in this
          browser&apos;s local storage.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">My Library</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {filtered.length} of {entries.length} game{entries.length === 1 ? "" : "s"} — stored locally
        in this browser.
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        Type <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">[List Name]</code> or{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">[List Name: value]</code> in a
        game&apos;s Notes below to create or add it to a list in{" "}
        <Link href="/lists" className="underline hover:text-zinc-200">
          My Lists
        </Link>
        .
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        EX: <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">[speedrunning times: 39:34]</code>
      </p>

      <Panel className="mt-6">
        <FilterBar
          consoles={consoles}
          currentSearch={search}
          currentConsole={consoleFilter}
          currentSort={sort}
          sortOptions={LIBRARY_SORT_OPTIONS}
          currentSource={source}
          currentIncludeMods={includeMods}
          currentStatus={statusFilter}
        />
      </Panel>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-zinc-500">No library entries matched your filters.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {results.map((entry) => (
            <LibraryEntryRow key={`${entry.id}:${entry.notes}`} entry={entry} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
