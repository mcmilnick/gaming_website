import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/games";
import { normalizeForSearch } from "@/lib/catalogSearch";
import { GAME_COLUMNS, toGameRecord, type GameRow } from "@/lib/gameRow";

// Mirrors catalogSearch.ts's releaseSortValue tie-breaking (year+month, missing
// year sorts last either direction) and falls back to title as a secondary
// sort so results have a stable order within a tied publisher/date.
const SORT_CLAUSES: Record<string, string> = {
  title: "title ASC",
  publisher: "publisher ASC NULLS LAST, title ASC",
  releaseYear: "release_year ASC NULLS LAST, release_month ASC NULLS LAST, title ASC",
  "-releaseYear": "release_year DESC NULLS LAST, release_month DESC NULLS LAST, title ASC",
};

export type SearchOptions = {
  search?: string;
  exact?: boolean;
  console?: string;
  sort?: string;
  includeMods?: boolean;
  page?: number;
  // Restrict to (or exclude) specific game ids - used for the Library-aware
  // filters ("hide games in my library", "status is X"), where the list of
  // ids comes from the browser's local library rather than the database.
  excludeIds?: string[];
  includeIds?: string[];
};

// The one query builder behind both GET and POST. Custom (user-added) games
// live in the browser's localStorage, not this database, and get merged in
// client-side by the caller.
async function runSearch(opts: SearchOptions) {
  const sql = getSql();
  const search = opts.search?.trim() ?? "";
  const page = Math.max(1, opts.page ?? 1);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    // Match against normalized_title (accents, spaces, and punctuation
    // stripped, lowercased) with the same normalization the search term gets,
    // so "pokemon" finds "Pokémon" just like the in-browser search does.
    const normalizedSearch = normalizeForSearch(search);
    if (opts.exact) {
      // Whole-title match (used to find a specific game by name, e.g. from
      // Suggest a Game) rather than "contains".
      params.push(normalizedSearch);
      conditions.push(`normalized_title = $${params.length}`);
    } else {
      // Escape LIKE's own wildcard characters so a literal "%" or "_" typed
      // into the search box is matched literally, not as a wildcard.
      params.push(`%${normalizedSearch.replace(/[%_]/g, "\\$&")}%`);
      conditions.push(`normalized_title ILIKE $${params.length}`);
    }
  }
  if (opts.console) {
    params.push(opts.console);
    conditions.push(`console = $${params.length}`);
  }
  if (!opts.includeMods) {
    conditions.push(`is_mod_or_hack = false`);
  }
  if (opts.excludeIds && opts.excludeIds.length > 0) {
    params.push(opts.excludeIds);
    conditions.push(`id <> ALL($${params.length})`);
  }
  if (opts.includeIds) {
    // An empty list here is meaningful (no library games have that status,
    // so nothing should match) - it's not the same as "no restriction".
    params.push(opts.includeIds);
    conditions.push(`id = ANY($${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause = SORT_CLAUSES[opts.sort ?? "title"] ?? SORT_CLAUSES.title;
  const offset = (page - 1) * PAGE_SIZE;

  const itemsParams = [...params, PAGE_SIZE, offset];
  const itemsQuery = `
    SELECT ${GAME_COLUMNS}
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

  return {
    items: itemRows.map(toGameRecord),
    count: countRows[0]?.count ?? 0,
  };
}

// GET for simple lookups - a plain, cacheable query-string request.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await runSearch({
    search: searchParams.get("search") ?? undefined,
    exact: searchParams.get("exact") === "1",
    console: searchParams.get("console") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    includeMods: searchParams.get("includeMods") === "1",
    page: Number(searchParams.get("page")) || 1,
  });
  return NextResponse.json(result);
}

// POST for the Library-aware filters: the id lists can be long, which would
// make a query-string URL too big, so they travel in the request body.
export async function POST(request: Request) {
  const body = (await request.json()) as SearchOptions;
  const result = await runSearch(body);
  return NextResponse.json(result);
}
