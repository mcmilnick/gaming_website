"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PAGE_SIZE, filterAndSortGames, paginate } from "@/lib/games";
import { parseSortParam, getDistinctConsoles, SORT_OPTIONS, type SortOption } from "@/lib/catalogSearch";
import { useLibrary } from "@/hooks/useLibrary";
import { useCustomGames } from "@/hooks/useCustomGames";
import { useGames } from "@/hooks/useGames";
import type { GameRecord } from "@/lib/types";
import { GameCard } from "./GameCard";
import { FilterBar } from "./FilterBar";
import { Pagination } from "./Pagination";
import { Panel } from "./Panel";

const VALID_SOURCES = ["base", "custom", "all"] as const;
type Source = (typeof VALID_SOURCES)[number];

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

// The shell every mode below renders into, so the two data-fetching
// strategies can never visually drift apart - only what feeds `results`,
// `count`, and `consoles` differs between them.
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

// "Hide games already in my library" and the status filter both depend on
// your local library data, which the database can't see (no accounts, no
// server-side notion of "you"). Rather than force that into a SQL query,
// this mode keeps today's original approach: load the full catalog once and
// filter/sort/paginate it in memory. It's the slower path, but it's an
// opt-in combination, not the default experience.
function ExploreFullCatalogMode({ params }: { params: SharedParams }) {
  const { entries } = useLibrary();
  const { games: customGames } = useCustomGames();
  const { games: allGames, hydrated: gamesHydrated } = useGames();

  const libraryIds = useMemo(() => new Set(entries.map((entry) => entry.id)), [entries]);
  const libraryStatusById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry.status])),
    [entries]
  );
  const consoles = useMemo(() => getDistinctConsoles(allGames), [allGames]);

  const sourceGames = useMemo(() => {
    switch (params.source) {
      case "custom":
        return customGames;
      case "all":
        return [...allGames, ...customGames];
      case "base":
      default:
        return allGames;
    }
  }, [params.source, customGames, allGames]);

  const filtered = useMemo(() => {
    const base = filterAndSortGames(sourceGames, {
      search: params.search,
      console: params.consoleFilter,
      sort: params.sort,
      includeMods: params.includeMods,
      excludeIds: params.hideInLibrary ? libraryIds : undefined,
    });
    if (!params.statusFilter) return base;
    return base.filter((game) => libraryStatusById.get(game.id) === params.statusFilter);
  }, [sourceGames, params, libraryIds, libraryStatusById]);

  const { items: results, count } = paginate(filtered, params.page, PAGE_SIZE);

  return (
    <ExploreLayout params={params} consoles={consoles} count={count} results={results} loading={!gamesHydrated} />
  );
}

// The fast path: search/console-filter/sort/pagination run as real indexed
// queries in the database instead of filtering the whole ~150k-game catalog
// in the browser. Custom (user-added) games aren't in that database - they
// live in this browser's localStorage - so they're matched against the same
// filters client-side (cheap, there are never many) and merged onto page 1
// only, rather than solving "one seamlessly sorted/paginated list across two
// different-latency sources," which isn't worth the complexity for what's
// usually 0-10 extra games.
function ExploreFastSearchMode({ params }: { params: SharedParams }) {
  const { games: customGames } = useCustomGames();
  const [baseConsoles, setBaseConsoles] = useState<string[]>([]);
  const [serverResult, setServerResult] = useState<{ items: GameRecord[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetched once - the base catalog's console list changes rarely (only
  // when platforms are added). Custom consoles are merged in reactively
  // below instead of being folded in here, so adding a game with a new
  // console (e.g. "PC") shows up in the dropdown right away, not just after
  // the next full page load.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/consoles")
      .then((res) => res.json())
      .then((data: string[]) => {
        if (!cancelled) setBaseConsoles(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const consoles = useMemo(() => {
    const customConsoles = getDistinctConsoles(customGames);
    return Array.from(new Set([...baseConsoles, ...customConsoles])).sort((a, b) => a.localeCompare(b));
  }, [baseConsoles, customGames]);

  // Re-fetches whenever the search/filter/sort/page params change - syncing
  // fetched state from changing props is one of the legitimate uses of an
  // effect (React's own docs call this out), hence the lint override below.
  useEffect(() => {
    if (params.source === "custom") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.consoleFilter) query.set("console", params.consoleFilter);
    if (params.sort) query.set("sort", params.sort);
    if (params.includeMods) query.set("includeMods", "1");
    query.set("page", String(params.page));

    fetch(`/api/games/search?${query.toString()}`)
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
  }, [params.source, params.search, params.consoleFilter, params.sort, params.includeMods, params.page]);

  const matchedCustomGames = useMemo(() => {
    if (params.source === "base") return [];
    return filterAndSortGames(customGames, {
      search: params.search,
      console: params.consoleFilter,
      sort: params.sort,
      includeMods: params.includeMods,
    });
  }, [customGames, params.source, params.search, params.consoleFilter, params.sort, params.includeMods]);

  if (params.source === "custom") {
    const { items: results, count } = paginate(matchedCustomGames, params.page, PAGE_SIZE);
    return <ExploreLayout params={params} consoles={consoles} count={count} results={results} loading={false} />;
  }

  const serverItems = serverResult?.items ?? [];
  const serverCount = serverResult?.count ?? 0;
  const results = params.page === 1 ? [...matchedCustomGames, ...serverItems].slice(0, PAGE_SIZE) : serverItems;
  const count = serverCount + matchedCustomGames.length;

  return (
    <ExploreLayout params={params} consoles={consoles} count={count} results={results} loading={loading} />
  );
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

  // hideInLibrary/statusFilter need local library data the database can't
  // see - that combination stays on the full-catalog path (see comment on
  // ExploreFullCatalogMode). Everything else takes the fast, paginated path.
  if (hideInLibrary || statusFilter) {
    return <ExploreFullCatalogMode params={params} />;
  }
  return <ExploreFastSearchMode params={params} />;
}
