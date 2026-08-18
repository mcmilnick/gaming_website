import { neon } from "@neondatabase/serverless";

// HTTP-based (not a persistent TCP connection), which is what makes this
// safe to call from a serverless function - no connection pool to exhaust
// under concurrent requests. Fine for the request-sized reads the app does;
// the ingestion script (a long-running batch job, not a request handler)
// uses a regular pg connection instead - see scripts/fetch-igdb-games.js.
export const sql = neon(process.env.DATABASE_URL!);
