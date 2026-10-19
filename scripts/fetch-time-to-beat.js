// Fills in the `time_to_beat_normally` column (seconds, IGDB's "normally"
// completion-time estimate) on the existing `games` table. This is a
// separate script from fetch-igdb-games.js on purpose: that one truncates
// and rewrites the whole table, where this one only ever runs additive
// UPDATEs against rows that already exist, so a failed or interrupted run
// can't lose catalog data and is safe to just re-run.
//
// Requires IGDB_CLIENT_ID / IGDB_CLIENT_SECRET and GAMES_DB_DATABASE_URL,
// same as fetch-igdb-games.js (see .env.local). Run with:
//   npm run fetch-time-to-beat

const { Client } = require("pg");

const CLIENT_ID = process.env.IGDB_CLIENT_ID;
const CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing IGDB_CLIENT_ID / IGDB_CLIENT_SECRET in .env.local.");
  process.exit(1);
}

// Same pacing fetch-igdb-games.js already uses against IGDB successfully -
// kept identical rather than guessing a different number.
const REQUEST_DELAY_MS = 300;
// IGDB caps how many rows a single request can return (regardless of
// `limit`) at 500, so id batches are capped to match - a bigger batch would
// just mean a bigger request for the same number of rows back.
const IGDB_BATCH_SIZE = 500;
const DB_CHUNK_SIZE = 500;
// This field is crowd-sourced and occasionally has an impossible entry (a
// handful of games came back reporting tens of thousands of hours, and one
// at 567,890 - over 60 years). There's no clean line between "a genuinely
// long-lived MMO" and "a bad entry" in the normal range, so this only
// drops the few that are physically impossible: more hours than exist in a
// year of nonstop, uninterrupted play.
const MAX_PLAUSIBLE_SECONDS = 3600 * 24 * 365;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken() {
  const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Twitch OAuth token request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function igdbQuery(accessToken, endpoint, body) {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`IGDB request to ${endpoint} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

// Catalog row ids look like "igdb-<numericId>-<platform-slug>" (see
// mapGame in fetch-igdb-games.js). The same numeric id can appear in more
// than one row - a game released on several platforms is one IGDB game but
// one catalog row per platform - so ids are grouped by numeric id up front,
// both to ask IGDB for each game once instead of once per platform, and to
// know every row that needs the same answer.
function groupRowIdsByIgdbId(rowIds) {
  const groups = new Map();
  for (const rowId of rowIds) {
    const match = rowId.match(/^igdb-(\d+)-/);
    if (!match) continue;
    const igdbId = match[1];
    const group = groups.get(igdbId);
    if (group) group.push(rowId);
    else groups.set(igdbId, [rowId]);
  }
  return groups;
}

(async () => {
  const startedAt = Date.now();

  // Phase 1: read the ids that exist right now. This connection is closed
  // again immediately after - it doesn't stay open for the several minutes
  // the IGDB fetch below takes, so that time doesn't run up Neon compute
  // usage for an idle connection.
  console.log("Reading existing game ids...");
  const readClient = new Client({ connectionString: process.env.GAMES_DB_DATABASE_URL });
  await readClient.connect();
  const { rows: idRows } = await readClient.query("SELECT id FROM games");
  await readClient.end();

  const rowIdsByIgdbId = groupRowIdsByIgdbId(idRows.map((row) => row.id));
  const igdbIds = Array.from(rowIdsByIgdbId.keys());
  console.log(`${idRows.length} rows -> ${igdbIds.length} distinct IGDB games to look up.`);

  // Phase 2: ask IGDB for each game's time-to-beat, batched to IGDB's
  // per-request row cap.
  console.log("Authenticating with Twitch...");
  const accessToken = await getAccessToken();

  const normallyByIgdbId = new Map();
  const batches = chunk(igdbIds, IGDB_BATCH_SIZE);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const body = `fields game_id,normally; where game_id = (${batch.join(",")}); limit ${IGDB_BATCH_SIZE};`;
    const results = await igdbQuery(accessToken, "game_time_to_beats", body);
    for (const result of results) {
      if (typeof result.normally === "number" && result.normally <= MAX_PLAUSIBLE_SECONDS) {
        normallyByIgdbId.set(String(result.game_id), result.normally);
      }
    }
    console.log(`  Looked up ${Math.min((i + 1) * IGDB_BATCH_SIZE, igdbIds.length)}/${igdbIds.length}`);
    if (i < batches.length - 1) await sleep(REQUEST_DELAY_MS);
  }
  console.log(`Found a time-to-beat value for ${normallyByIgdbId.size}/${igdbIds.length} games.`);

  // Phase 3: write the results back. Every catalog row sharing an IGDB id
  // gets the same value - completion time doesn't depend on platform.
  const updates = [];
  for (const [igdbId, normally] of normallyByIgdbId) {
    for (const rowId of rowIdsByIgdbId.get(igdbId)) updates.push([rowId, normally]);
  }
  console.log(`Writing ${updates.length} row updates...`);

  const writeClient = new Client({ connectionString: process.env.GAMES_DB_DATABASE_URL });
  await writeClient.connect();
  try {
    await writeClient.query("BEGIN");
    for (let i = 0; i < updates.length; i += DB_CHUNK_SIZE) {
      const batch = updates.slice(i, i + DB_CHUNK_SIZE);
      const values = [];
      const rows = batch.map(([id, normally], idx) => {
        values.push(id, normally);
        return `($${idx * 2 + 1}, $${idx * 2 + 2}::integer)`;
      });
      await writeClient.query(
        `UPDATE games AS g SET time_to_beat_normally = v.normally
         FROM (VALUES ${rows.join(", ")}) AS v(id, normally)
         WHERE g.id = v.id`,
        values
      );
      console.log(`  Updated ${Math.min(i + DB_CHUNK_SIZE, updates.length)}/${updates.length}`);
    }
    await writeClient.query("COMMIT");
  } catch (err) {
    await writeClient.query("ROLLBACK");
    throw err;
  } finally {
    await writeClient.end();
  }

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(`Done in ${elapsedSec}s.`);
})().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
