import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { GAME_COLUMNS, toGameRecord, type GameRow } from "@/lib/gameRow";

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
  const rows = (await sql.query(`SELECT ${GAME_COLUMNS} FROM games`)) as GameRow[];

  return NextResponse.json(rows.map(toGameRecord), {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
