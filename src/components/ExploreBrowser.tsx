"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ALL_GAMES, PAGE_SIZE, filterAndSortGames, getConsoles, paginate } from "@/lib/games";
import { parseSortParam, type SortOption } from "@/lib/catalogSearch";
import { useLibrary } from "@/hooks/useLibrary";
import { useCustomGames } from "@/hooks/useCustomGames";
import { GameCard } from "./GameCard";
import { FilterBar } from "./FilterBar";
import { Pagination } from "./Pagination";

const VALID_SOURCES = ["base", "custom", "all"] as const;
type Source = (typeof VALID_SOURCES)[number];

export function ExploreBrowser() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { entries } = useLibrary();
  const { games: customGames } = useCustomGames();

  const search = searchParams.get("search") ?? "";
  const consoleFilter = searchParams.get("console") ?? "";
  const sort: SortOption = parseSortParam(searchParams.get("sort"));
  const sourceParam = searchParams.get("source");
  const source: Source = VALID_SOURCES.includes(sourceParam as Source) ? (sourceParam as Source) : "base";
  const includeMods = searchParams.get("includeMods") === "1";
  const hideInLibrary = searchParams.get("hideInLibrary") === "1";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const libraryIds = useMemo(() => new Set(entries.map((entry) => entry.id)), [entries]);
  const consoles = useMemo(() => getConsoles(), []);

  const sourceGames = useMemo(() => {
    switch (source) {
      case "custom":
        return customGames;
      case "all":
        return [...ALL_GAMES, ...customGames];
      case "base":
      default:
        return ALL_GAMES;
    }
  }, [source, customGames]);

  const filtered = useMemo(
    () =>
      filterAndSortGames(sourceGames, {
        search,
        console: consoleFilter,
        sort,
        includeMods,
        excludeIds: hideInLibrary ? libraryIds : undefined,
      }),
    [sourceGames, search, consoleFilter, sort, includeMods, hideInLibrary, libraryIds]
  );

  const { items: results, count } = paginate(filtered, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
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

      <div className="mt-6">
        <FilterBar
          consoles={consoles}
          currentSearch={search}
          currentConsole={consoleFilter}
          currentSort={sort}
          currentSource={source}
          currentIncludeMods={includeMods}
          currentHideInLibrary={hideInLibrary}
        />
      </div>

      {results.length === 0 ? (
        <p className="mt-12 text-center text-zinc-500">No games matched your filters.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
