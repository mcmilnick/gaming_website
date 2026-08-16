"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLibrary } from "@/hooks/useLibrary";
import { parseLibrarySortParam, isRatingSort, sortByRating, LIBRARY_SORT_OPTIONS } from "@/lib/library";
import { filterAndSortByCatalog, getDistinctConsoles } from "@/lib/catalogSearch";
import { useGames } from "@/hooks/useGames";
import { isCustomGameId } from "@/lib/customGames";
import { FilterBar } from "@/components/FilterBar";
import { LibraryEntryRow } from "@/components/LibraryEntryRow";
import { Panel } from "@/components/Panel";

const VALID_SOURCES = ["base", "custom", "all"] as const;
type Source = (typeof VALID_SOURCES)[number];

export function LibraryBrowser() {
  const { entries, hydrated } = useLibrary();
  const { gamesById, hydrated: gamesHydrated } = useGames();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const consoleFilter = searchParams.get("console") ?? "";
  const sort = parseLibrarySortParam(searchParams.get("sort"));
  const statusFilter = searchParams.get("status") ?? "";
  const sourceParam = searchParams.get("source");
  // Unlike Explore, "all" is the default here - nothing in your own library
  // should disappear on first load just because a filter exists.
  const source: Source = VALID_SOURCES.includes(sourceParam as Source) ? (sourceParam as Source) : "all";
  const includeMods = searchParams.get("includeMods") === "1";

  const consoles = useMemo(() => getDistinctConsoles(entries), [entries]);

  const filtered = useMemo(() => {
    let eligible = statusFilter ? entries.filter((entry) => entry.status === statusFilter) : entries;
    if (source === "base") eligible = eligible.filter((entry) => !isCustomGameId(entry.id));
    else if (source === "custom") eligible = eligible.filter((entry) => isCustomGameId(entry.id));
    if (!includeMods) {
      eligible = eligible.filter((entry) => !gamesById.get(entry.id)?.isModOrHack);
    }
    if (isRatingSort(sort)) {
      const searched = filterAndSortByCatalog(eligible, { search, console: consoleFilter });
      return sortByRating(searched, sort);
    }
    return filterAndSortByCatalog(eligible, { search, console: consoleFilter, sort });
  }, [entries, statusFilter, source, includeMods, search, consoleFilter, sort, gamesById]);

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
          {filtered.map((entry) => (
            <LibraryEntryRow key={`${entry.id}:${entry.notes}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
