import rawGames from "@/data/games.json";
import type { GameRecord } from "./types";
import { filterAndSortByCatalog, getDistinctConsoles, type CatalogFilters } from "./catalogSearch";

// Sourced by scripts/fetch-igdb-games.js - each record already carries its
// own `console`, since the dataset spans multiple platforms.
export const ALL_GAMES: GameRecord[] = rawGames as GameRecord[];

export const PAGE_SIZE = 24;

export type { SortOption } from "./catalogSearch";

export function getGameById(id: string): GameRecord | undefined {
  return ALL_GAMES.find((game) => game.id === id);
}

export function getConsoles(): string[] {
  return getDistinctConsoles(ALL_GAMES);
}

export type FilterAndSortOptions = CatalogFilters & {
  excludeIds?: ReadonlySet<string>;
};

export function filterAndSortGames(games: GameRecord[], opts: FilterAndSortOptions): GameRecord[] {
  const eligible =
    opts.excludeIds && opts.excludeIds.size > 0
      ? games.filter((game) => !opts.excludeIds!.has(game.id))
      : games;
  return filterAndSortByCatalog(eligible, opts);
}

export function paginate<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): { items: T[]; count: number } {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), count: items.length };
}
