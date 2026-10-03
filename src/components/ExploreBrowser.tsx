"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PAGE_SIZE, filterAndSortGames, paginate } from "@/lib/games";
import { parseSortParam, getDistinctConsoles, compareForSort, SORT_OPTIONS, type SortOption } from "@/lib/catalogSearch";
import { useLibrary } from "@/hooks/useLibrary";
import { useCustomGames } from "@/hooks/useCustomGames";
import { useCatalogConsoles } from "@/hooks/useCatalogConsoles";
import type { GameRecord } from "@/lib/types";
import { GameCard } from "./GameCard";
import { FilterBar } from "./FilterBar";
import { Pagination } from "./Pagination";
import { Panel } from "./Panel";

const VALID_SOURCES = ["base", "custom", "all"] as const;
type Source = (typeof VALID_SOURCES)[number];

// Merges two already-sorted lists (a is small - your matched custom games;
// b is a server-sorted page of the base catalog) into one correctly-ordered
// list, instead of just concatenating them - which put every custom game
// before every base game regardless of where it actually belonged in the
// current sort order.
function mergeSorted(a: GameRecord[], b: GameRecord[], sort: SortOption, limit: number): GameRecord[] {
  const merged: GameRecord[] = [];
  let i = 0;
  let j = 0;
  while (merged.length < limit && (i < a.length || j < b.length)) {
    if (i >= a.length) merged.push(b[j++]);
    else if (j >= b.length) merged.push(a[i++]);
    else if (compareForSort(a[i], b[j], sort) <= 0) merged.push(a[i++]);
    else merged.push(b[j++]);
  }
  return merged;
}

type SharedParams = {
  search: string;
  consoleFilter: string;
  sort: SortOption;
  source: Source;
  includeMods: boolean;
  statusFilter: string;
  hideInLibrary: boolean;
  page: number;
};

// The shell every result set renders into, so the layout can't drift from
// one data path to another - only what feeds `results` and `count` differs.
function ExploreLayout({
  params,
  consoles,
  count,
  results,
  loading,
}: {
  params: SharedParams;
  consoles: string[];
  count: number;
  results: GameRecord[];
  loading: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(targetPage));
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">All Games</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {count.toLocaleString()} games — sourced from{" "}
        <a
          href="https://www.igdb.com/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-zinc-200"
        >
          IGDB
        </a>{" "}
        plus anything you&apos;ve added yourself
      </p>

      <Panel className="mt-6">
        <FilterBar
          consoles={consoles}
          currentSearch={params.search}
          currentConsole={params.consoleFilter}
          currentSort={params.sort}
          sortOptions={SORT_OPTIONS}
          currentSource={params.source}
          currentIncludeMods={params.includeMods}
          currentStatus={params.statusFilter}
          currentHideInLibrary={params.hideInLibrary}
        />
      </Panel>

      {loading ? (
        <p className="mt-12 text-center text-zinc-500">Loading…</p>
      ) : results.length === 0 ? (
        <p className="mt-12 text-center text-zinc-500">No games matched your filters.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      <Pagination page={params.page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

// Search, console, sort, and pagination run as indexed queries in the
// database, so the browser never downloads the whole catalog. Two things
// the database can't see - your local Library ("hide games in my library"
// and the status filter) - are sent along as id lists: POST when they're
// in use (the lists can be long), GET otherwise.
//
// Custom (user-added) games aren't in that database - they live in this
// browser's localStorage - so they're matched against the same filters
// client-side (cheap, there are never many) and merged onto page 1 only.
function ExploreResults({ params }: { params: SharedParams }) {
  const { search, consoleFilter, sort, source, includeMods, statusFilter, hideInLibrary, page } = params;
  const { entries } = useLibrary();
  const { games: customGames } = useCustomGames();
  const { consoles: baseConsoles } = useCatalogConsoles();
  const [serverResult, setServerResult] = useState<{ items: GameRecord[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const libraryIds = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const libraryIdSet = useMemo(() => new Set(libraryIds), [libraryIds]);
  const libraryStatusById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry.status])),
    [entries]
  );
  const statusIds = useMemo(
    () => (statusFilter ? entries.filter((entry) => entry.status === statusFilter).map((entry) => entry.id) : null),
    [entries, statusFilter]
  );

  const consoles = useMemo(() => {
    const customConsoles = getDistinctConsoles(customGames);
    return Array.from(new Set([...baseConsoles, ...customConsoles])).sort((a, b) => a.localeCompare(b));
  }, [baseConsoles, customGames]);

  // Re-fetches whenever the search/filter/sort/page values change. Syncing
  // fetched state from changing props is one of the legitimate uses of an
  // effect (React's own docs call this out), hence the lint override below.
  useEffect(() => {
    if (source === "custom") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const request = hideInLibrary || statusIds !== null
      ? fetch("/api/games/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search,
            console: consoleFilter,
            sort,
            includeMods,
            page,
            excludeIds: hideInLibrary ? libraryIds : undefined,
            includeIds: statusIds ?? undefined,
          }),
        })
      : fetch(`/api/games/search?${buildSearchQuery({ search, consoleFilter, sort, includeMods, page })}`);

    request
      .then((res) => res.json())
      .then((data: { items: GameRecord[]; count: number }) => {
        if (!cancelled) setServerResult(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, search, consoleFilter, sort, includeMods, page, hideInLibrary, statusIds, libraryIds]);

  // Same rule the database query applies, for the custom games in memory.
  const matchedCustomGames = useMemo(() => {
    if (source === "base") return [];
    return filterAndSortGames(customGames, { search, console: consoleFilter, sort, includeMods }).filter((game) => {
      if (hideInLibrary && libraryIdSet.has(game.id)) return false;
      if (statusFilter && libraryStatusById.get(game.id) !== statusFilter) return false;
      return true;
    });
  }, [customGames, source, search, consoleFilter, sort, includeMods, hideInLibrary, statusFilter, libraryIdSet, libraryStatusById]);

  if (source === "custom") {
    const { items: results, count } = paginate(matchedCustomGames, page, PAGE_SIZE);
    return <ExploreLayout params={params} consoles={consoles} count={count} results={results} loading={false} />;
  }

  const serverItems = serverResult?.items ?? [];
  const serverCount = serverResult?.count ?? 0;
  const results = page === 1 ? mergeSorted(matchedCustomGames, serverItems, sort, PAGE_SIZE) : serverItems;
  const count = serverCount + matchedCustomGames.length;

  return (
    <ExploreLayout params={params} consoles={consoles} count={count} results={results} loading={loading} />
  );
}

function buildSearchQuery(params: Pick<SharedParams, "search" | "consoleFilter" | "sort" | "includeMods" | "page">): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.consoleFilter) query.set("console", params.consoleFilter);
  if (params.sort) query.set("sort", params.sort);
  if (params.includeMods) query.set("includeMods", "1");
  query.set("page", String(params.page));
  return query.toString();
}

export function ExploreBrowser() {
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const consoleFilter = searchParams.get("console") ?? "";
  const sort: SortOption = parseSortParam(searchParams.get("sort"));
  const sourceParam = searchParams.get("source");
  // "All Games" (base catalog + your own added games) is the default now -
  // defaulting to base-only used to hide a game right after you added it,
  // unless you knew to switch this filter.
  const source: Source = VALID_SOURCES.includes(sourceParam as Source) ? (sourceParam as Source) : "all";
  const includeMods = searchParams.get("includeMods") === "1";
  const hideInLibrary = searchParams.get("hideInLibrary") === "1";
  const statusFilter = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const params: SharedParams = {
    search,
    consoleFilter,
    sort,
    source,
    includeMods,
    statusFilter,
    hideInLibrary,
    page,
  };

  return <ExploreResults params={params} />;
}
