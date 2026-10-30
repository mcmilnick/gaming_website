import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

// Every title for one console - used by the Backward Compatibility tab's
// "main catalog" source, which needs the whole console's games (thousands,
// for a console like Xbox 360) rather than one paginated page of results.
// Deliberately just id/title, not the full GAME_COLUMNS set: the tab only
// displays a title list, so cover art/developer/etc. would be wasted
// payload across that many rows.
export async function GET(request: Request) {
  const sql = getSql();
  const { searchParams } = new URL(request.url);
  const console = searchParams.get("console");

  if (!console) {
    return NextResponse.json([]);
  }

  const rows = await sql.query(
    `SELECT id, title FROM games WHERE console = $1 AND is_mod_or_hack = false ORDER BY title`,
    [console]
  );

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
