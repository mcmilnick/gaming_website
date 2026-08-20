import type { GameRecord } from "./types";

// Shared by every /api/games* route so the column list and row-to-GameRecord
// mapping exist in exactly one place, instead of each route redefining its
// own copy (which is how /api/games and /api/games/search had already
// drifted into duplicates of each other).
export const GAME_COLUMNS =
  "id, title, console, developer, publisher, release_year, release_month, cover_url, is_mod_or_hack";

export type GameRow = {
  id: string;
  title: string;
  console: string;
  developer: string | null;
  publisher: string | null;
  release_year: number | null;
  release_month: number | null;
  cover_url: string | null;
  is_mod_or_hack: boolean;
};

export function toGameRecord(row: GameRow): GameRecord {
  return {
    id: row.id,
    title: row.title,
    console: row.console,
    developer: row.developer,
    publisher: row.publisher,
    releaseJapan: null,
    releaseNA: null,
    releasePAL: null,
    releaseYear: row.release_year,
    releaseMonth: row.release_month,
    coverUrl: row.cover_url,
    isModOrHack: row.is_mod_or_hack,
  };
}
