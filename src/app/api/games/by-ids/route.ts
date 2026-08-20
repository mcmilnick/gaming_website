import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { GAME_COLUMNS, toGameRecord, type GameRow } from "@/lib/gameRow";

// Looks up a small set of already-known game ids - shared by pages that
// need details for games they already have ids for (Library's mod/hack
// check, a List's cover art/title) rather than a search over the whole
// catalog. Custom (user-added) game ids aren't in this database at all -
// callers already have those from localStorage and merge them in
// themselves, same as everywhere else custom games are handled.
export async function GET(request: Request) {
  const sql = getSql();
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  const rows = (await sql.query(`SELECT ${GAME_COLUMNS} FROM games WHERE id = ANY($1)`, [ids])) as GameRow[];

  return NextResponse.json(rows.map(toGameRecord), {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
