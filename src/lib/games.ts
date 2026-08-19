import type { GameRecord } from "./types";
import { filterAndSortByCatalog, type CatalogFilters } from "./catalogSearch";

// The catalog itself is no longer imported here - it's fetched at runtime
// from /api/games (see gamesStore.ts / useGames()) instead of being bundled
// into the app's JS. Everything in this file operates on a games array
// passed in by the caller.

// Divisible by 2, 3, 4, and 5 - the grid's column count at every
// breakpoint (see ExploreBrowser's grid-cols-2/3/4/5) - so the last row of
// a page is always full instead of trailing off short at whichever
// breakpoint the number doesn't divide evenly into.
export const PAGE_SIZE = 60;

export type { SortOption } from "./catalogSearch";

export type FilterAndSortOptions = CatalogFilters & {
  excludeIds?: ReadonlySet<string>;
  // Mods/hacks are hidden by default (see GameRecord.isModOrHack) - pass
  // true to include them.
  includeMods?: boolean;
};

export function filterAndSortGames(games: GameRecord[], opts: FilterAndSortOptions): GameRecord[] {
  let eligible = games;
  if (opts.excludeIds && opts.excludeIds.size > 0) {
    eligible = eligible.filter((game) => !opts.excludeIds!.has(game.id));
  }
  if (!opts.includeMods) {
    eligible = eligible.filter((game) => !game.isModOrHack);
  }
  return filterAndSortByCatalog(eligible, opts);
}

export function paginate<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): { items: T[]; count: number } {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), count: items.length };
}
