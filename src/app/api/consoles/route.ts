import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

// Just the console names, for the filter dropdown - lets the fast search
// path populate that list without pulling in the full catalog. Changes only
// when platforms are added to the catalog (rare), so a longer browser cache
// is safe here.
export async function GET() {
  const sql = getSql();
  const rows = (await sql`SELECT DISTINCT console FROM games ORDER BY console`) as { console: string }[];
  return NextResponse.json(
    rows.map((row) => row.console),
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
