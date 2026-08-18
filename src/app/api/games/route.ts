import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { GameRecord } from "@/lib/types";

type GameRow = {
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

// The whole catalog, same shape the client used to get from games.json -
// gamesStore.ts still loads it once per page session and does all
// search/sort/filter in memory. Cached for an hour so the (currently
// weekly) ingestion job doesn't mean every visitor's load is a live query.
export async function GET() {
  const rows = (await sql`
    SELECT id, title, console, developer, publisher, release_year, release_month, cover_url, is_mod_or_hack
    FROM games
  `) as GameRow[];

  const games: GameRecord[] = rows.map((row) => ({
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
  }));

  return NextResponse.json(games, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
