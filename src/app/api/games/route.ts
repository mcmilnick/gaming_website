import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
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
// search/sort/filter in memory.
//
// Cache-Control is deliberately short. A long cache here previously meant a
// database refresh (like adding a batch of new consoles) could stay
// invisible on the live site for up to the cache duration, even though the
// data was already live in Postgres - the exact "confusing stale cache"
// failure the old version-hashed games.json/manifest setup existed to
// avoid. Traffic here is low (a handful of users) so there's no real cost
// reason to cache hard; a minute is just enough to avoid a live DB query on
// every single click while still making a refresh show up almost
// immediately.
export async function GET() {
  const sql = getSql();
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
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
