import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/games";
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

function toGameRecord(row: GameRow): GameRecord {
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

// Mirrors catalogSearch.ts's releaseSortValue tie-breaking (year+month, missing
// year sorts last either direction) and falls back to title as a secondary
// sort so results have a stable order within a tied publisher/date.
const SORT_CLAUSES: Record<string, string> = {
  title: "title ASC",
  publisher: "publisher ASC NULLS LAST, title ASC",
  releaseYear: "release_year ASC NULLS LAST, release_month ASC NULLS LAST, title ASC",
  "-releaseYear": "release_year DESC NULLS LAST, release_month DESC NULLS LAST, title ASC",
};

// The searchable/paginatable base catalog only - custom (user-added) games
// live in the browser's localStorage, not this database, and get merged in
// client-side by the caller. Query-string driven instead of a POST body so
// it stays a plain cacheable GET, matching /api/games.
export async function GET(request: Request) {
  const sql = getSql();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search")?.trim() ?? "";
  const consoleFilter = searchParams.get("console")?.trim() ?? "";
  const sortParam = searchParams.get("sort") ?? "title";
  const includeMods = searchParams.get("includeMods") === "1";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    // Escape LIKE's own wildcard characters so a literal "%" or "_" typed
    // into the search box is matched literally, not as a wildcard.
    params.push(`%${search.replace(/[%_]/g, "\\$&")}%`);
    conditions.push(`title ILIKE $${params.length}`);
  }
  if (consoleFilter) {
    params.push(consoleFilter);
    conditions.push(`console = $${params.length}`);
  }
  if (!includeMods) {
    conditions.push(`is_mod_or_hack = false`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause = SORT_CLAUSES[sortParam] ?? SORT_CLAUSES.title;
  const offset = (page - 1) * PAGE_SIZE;

  const itemsParams = [...params, PAGE_SIZE, offset];
  const itemsQuery = `
    SELECT id, title, console, developer, publisher, release_year, release_month, cover_url, is_mod_or_hack
    FROM games
    ${whereClause}
    ORDER BY ${orderClause}
    LIMIT $${itemsParams.length - 1} OFFSET $${itemsParams.length}
  `;
  const countQuery = `SELECT COUNT(*)::int AS count FROM games ${whereClause}`;

  const [itemRows, countRows] = (await Promise.all([
    sql.query(itemsQuery, itemsParams),
    sql.query(countQuery, params),
  ])) as [GameRow[], { count: number }[]];

  return NextResponse.json({
    items: itemRows.map(toGameRecord),
    count: countRows[0]?.count ?? 0,
  });
}
