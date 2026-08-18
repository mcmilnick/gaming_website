import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// HTTP-based (not a persistent TCP connection), which is what makes this
// safe to call from a serverless function - no connection pool to exhaust
// under concurrent requests. Fine for the request-sized reads the app does;
// the ingestion script (a long-running batch job, not a request handler)
// uses a regular pg connection instead - see scripts/fetch-igdb-games.js.
//
// Built lazily on first use, not at module load - Next.js's build step
// imports route files to statically analyze them ("Collecting page data"),
// which runs top-level module code even during the build, before
// DATABASE_URL is necessarily available. Calling neon() eagerly at import
// time made the build itself fail with "No database connection string was
// provided".
let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!cachedSql) {
    cachedSql = neon(process.env.DATABASE_URL!);
  }
  return cachedSql;
}
