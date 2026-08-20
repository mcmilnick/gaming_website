// The single source of truth for "how often is the catalog expected to go
// stale" - currently that means how often someone runs
// `npm run fetch-games` by hand (see scripts/fetch-igdb-games.js), not an
// automated schedule (see the README TODO about that).
//
// next.config.ts's image cache TTL is deliberately derived from this same
// constant instead of picking its own number: cover art only ever changes
// when the catalog gets re-ingested, so there's no reason for the image
// cache to expire on a different rhythm than the data actually does. If the
// refresh cadence ever changes (e.g. moving to an automated weekly cron, or
// tightening/loosening how often it's run by hand), bump the number here and
// the image cache TTL follows automatically instead of silently drifting out
// of sync as two separately-maintained numbers.
export const DATA_REFRESH_INTERVAL_DAYS = 7;

export const DATA_REFRESH_INTERVAL_SECONDS = DATA_REFRESH_INTERVAL_DAYS * 24 * 60 * 60;
