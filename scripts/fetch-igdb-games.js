// Fetches games for a set of platforms from IGDB and loads them into the
// `games` table in Postgres (see src/app/api/games/route.ts for the read
// side), replacing whatever is there.
//
// Requires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET (from a Twitch Developer
// app: https://dev.twitch.tv/console/apps) and GAMES_DB_DATABASE_URL (from the Neon
// database - see .env.local). Run with:
//   npm run fetch-games
// which loads .env.local via Node's --env-file flag.
//
// This is a maintainer-side script, not something the deployed app runs -
// it's meant to be re-run periodically (weekly, by hand for now) to refresh
// the catalog. No IGDB or database credentials are ever shipped to the live
// site; the deployed app only ever talks to the database via the read-only
// query in the API route.

const { Client } = require("pg");

const CLIENT_ID = process.env.IGDB_CLIENT_ID;
const CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing IGDB_CLIENT_ID / IGDB_CLIENT_SECRET.\n" +
      "Create a Twitch app at https://dev.twitch.tv/console/apps, put the values in .env.local, then run:\n" +
      "  npm run fetch-games"
  );
  process.exit(1);
}

// Add more platform names here to expand the catalog later.
// Exact names as IGDB has them - verify with the platforms endpoint before
// adding a new one, rather than guessing (e.g. "Sega Mega Drive/Genesis",
// not "Sega Genesis").
const TARGET_PLATFORM_NAMES = [
  "Game Boy",
  "Game Boy Color",
  "Game Boy Advance",
  "Nintendo Entertainment System",
  "Super Nintendo Entertainment System",
  "Sega Mega Drive/Genesis",
  "Family Computer",
  "PlayStation",
  "Nintendo DS",
  "Nintendo 3DS",
  "Nintendo 64",
  "Nintendo GameCube",
  "Sega Saturn",
  "TurboGrafx-16/PC Engine",
  "Turbografx-16/PC Engine CD",
  "PC Engine SuperGrafx",
  "Super Famicom",
  "PlayStation Portable",
  "MSX",
  "MSX2",
  "Neo Geo AES",
  "Neo Geo MVS",
  "Neo Geo CD",
  "Neo Geo Pocket",
  "Neo Geo Pocket Color",
  "Virtual Boy",
  "Xbox",
  "3DO Interactive Multiplayer",
  "DOS",
  "Dreamcast",
  "PlayStation 2",
  "Wii",
  "Wii U",
  "Nintendo Switch",

  // Retro + current-gen consoles/handhelds, deliberately excluding PC/Mac/
  // Linux/home computers (PC alone would roughly triple the catalog on its
  // own - see the growth estimate this list came from) and non-console
  // oddities (VR, mobile, arcade, mainframes).
  "Sega Master System/Mark III",
  "Sega Game Gear",
  "Sega CD",
  "Sega 32X",
  "Sega CD 32X",
  "Atari 2600",
  "Atari 5200",
  "Atari 7800",
  "Atari Lynx",
  "Atari Jaguar",
  "Atari Jaguar CD",
  "ColecoVision",
  "Intellivision",
  "Vectrex",
  "WonderSwan",
  "WonderSwan Color",
  "PC-FX",
  "Philips CD-i",
  "Nintendo DSi",
  "New Nintendo 3DS",
  "Family Computer Disk System",
  "Satellaview",
  "Game & Watch",
  "Pokémon mini",
  "Odyssey 2 / Videopac G7000",
  "Fairchild Channel F",
  "PlayStation Vita",
  "PlayStation 3",
  "PlayStation 4",
  "PlayStation 5",
  "Xbox 360",
  "Xbox One",
  "Xbox Series X|S",
  "Nintendo Switch 2",
];

const PAGE_SIZE = 500;
const REQUEST_DELAY_MS = 300;
const DB_CHUNK_SIZE = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Must stay byte-for-byte identical to normalizeForSearch in
// src/lib/catalogSearch.ts - that's what the search route normalizes an
// incoming query with before matching it against this column. If the two
// drift apart, accented/punctuated titles (which is most of the reason this
// column exists - "pokemon" needs to find "Pokémon") silently stop matching
// again, the same bug this column was added to fix.
function normalizeForSearch(text) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
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

async function findPlatforms(accessToken) {
  const nameList = TARGET_PLATFORM_NAMES.map((name) => `"${name}"`).join(",");
  const body = `fields id,name; where name = (${nameList}); limit ${TARGET_PLATFORM_NAMES.length};`;
  const platforms = await igdbQuery(accessToken, "platforms", body);
  console.log("Resolved platforms:", platforms);

  const missing = TARGET_PLATFORM_NAMES.filter((name) => !platforms.some((p) => p.name === name));
  if (missing.length > 0) {
    throw new Error(
      `Could not find IGDB platform(s): ${missing.join(", ")}. Check exact spelling against IGDB's platform list.`
    );
  }
  return platforms;
}

async function fetchAllGamesForPlatform(accessToken, platform) {
  const games = [];
  let offset = 0;

  for (;;) {
    const body = [
      "fields name, first_release_date, cover.image_id, game_type,",
      "involved_companies.company.name, involved_companies.developer, involved_companies.publisher,",
      "release_dates.y, release_dates.m, release_dates.date, release_dates.date_format;",
      `where platforms = (${platform.id});`,
      `limit ${PAGE_SIZE};`,
      `offset ${offset};`,
      "sort id asc;",
    ].join(" ");

    const page = await igdbQuery(accessToken, "games", body);
    games.push(...page);
    console.log(`  ${platform.name}: ${games.length} so far (offset ${offset})`);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(REQUEST_DELAY_MS);
  }

  return games;
}

// IGDB game_type values (from the game_types endpoint): 5 = Mod, 12 = Fork.
// Both cover ROM hacks / fan-made derivative works like "Pokemon Fused
// Dimensions". This does NOT catch original homebrew (a new game not based
// on an existing one, e.g. a from-scratch indie GBC game) - IGDB tags those
// as game_type 0 (Main Game), same as official releases, so there's no
// field to distinguish that case. parent_game is deliberately not used here.
const DERIVATIVE_GAME_TYPES = new Set([5, 12]);

// IGDB's date_formats reference table: 0 = YYYYMMDD, 1 = YYYYMM - both carry
// a real month. Everything else (2 = YYYY, 3-6 = quarter, 7 = TBD) has no
// real month - IGDB still fills in a placeholder `m` for those (observed
// defaulting to December, not January), so we deliberately ignore `m` unless
// the format says it's real.
const REAL_MONTH_DATE_FORMATS = new Set([0, 1]);

// A game can have many release_dates rows (one per region/platform/rerelease).
// We want the single earliest one, matching what first_release_date already
// represented, but read directly off the row so we also get its real month
// (if any) instead of just a year.
function earliestReleaseDate(igdbGame) {
  const rows = igdbGame.release_dates || [];
  let earliest = null;
  for (const row of rows) {
    if (row.date == null) continue;
    if (!earliest || row.date < earliest.date) earliest = row;
  }
  return earliest;
}

function mapGame(igdbGame, platformName) {
  const involved = igdbGame.involved_companies || [];
  const developer = involved.find((c) => c.developer)?.company?.name ?? null;
  const publisher = involved.find((c) => c.publisher)?.company?.name ?? null;

  const earliest = earliestReleaseDate(igdbGame);
  let releaseYear = null;
  let releaseMonth = null;
  if (earliest) {
    releaseYear = earliest.y ?? null;
    releaseMonth = REAL_MONTH_DATE_FORMATS.has(earliest.date_format) ? earliest.m ?? null : null;
  } else if (igdbGame.first_release_date) {
    // Fallback for the rare game with a first_release_date but no
    // release_dates rows at all - year only, no month to trust.
    releaseYear = new Date(igdbGame.first_release_date * 1000).getUTCFullYear();
  }

  const coverUrl = igdbGame.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${igdbGame.cover.image_id}.jpg`
    : null;
  const isModOrHack = DERIVATIVE_GAME_TYPES.has(igdbGame.game_type);

  return {
    id: `igdb-${igdbGame.id}-${slugify(platformName)}`,
    title: igdbGame.name,
    normalizedTitle: normalizeForSearch(igdbGame.name),
    console: platformName,
    developer,
    publisher,
    // IGDB's release_dates-by-region breakdown isn't fetched region-by-region
    // here to keep this script simple - releaseYear/releaseMonth cover
    // sorting/filtering needs. Revisit if per-region dates (like the old
    // Wikipedia data had) matter.
    releaseJapan: null,
    releaseNA: null,
    releasePAL: null,
    releaseYear,
    releaseMonth,
    coverUrl,
    isModOrHack,
  };
}

// Replaces the entire contents of the games table with `games`, in one
// transaction, so anyone querying mid-refresh sees either the old full
// catalog or the new one, never a half-truncated table. Batched into
// multi-row INSERTs (DB_CHUNK_SIZE rows each) instead of one INSERT per
// game - 76,947 individual round trips would be needlessly slow.
async function writeToDatabase(games) {
  const client = new Client({ connectionString: process.env.GAMES_DB_DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE games");

    for (let i = 0; i < games.length; i += DB_CHUNK_SIZE) {
      const chunk = games.slice(i, i + DB_CHUNK_SIZE);
      const values = [];
      const rows = chunk.map((game, idx) => {
        const base = idx * 10;
        values.push(
          game.id,
          game.title,
          game.normalizedTitle,
          game.console,
          game.developer,
          game.publisher,
          game.releaseYear,
          game.releaseMonth,
          game.coverUrl,
          game.isModOrHack
        );
        const placeholders = Array.from({ length: 10 }, (_, j) => `$${base + j + 1}`).join(", ");
        return `(${placeholders})`;
      });

      await client.query(
        `INSERT INTO games (id, title, normalized_title, console, developer, publisher, release_year, release_month, cover_url, is_mod_or_hack)
         VALUES ${rows.join(", ")}`,
        values
      );
      console.log(`  Inserted ${Math.min(i + DB_CHUNK_SIZE, games.length)}/${games.length}`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

(async () => {
  console.log("Authenticating with Twitch...");
  const accessToken = await getAccessToken();

  console.log("Resolving target platforms...");
  const platforms = await findPlatforms(accessToken);

  const allGames = [];
  for (const platform of platforms) {
    console.log(`Fetching games for ${platform.name} (id ${platform.id})...`);
    const igdbGames = await fetchAllGamesForPlatform(accessToken, platform);
    for (const igdbGame of igdbGames) {
      if (!igdbGame.name) continue;
      allGames.push(mapGame(igdbGame, platform.name));
    }
    await sleep(REQUEST_DELAY_MS);
  }

  allGames.sort((a, b) => a.title.localeCompare(b.title));

  console.log(`\nWriting ${allGames.length} games to the database...`);
  await writeToDatabase(allGames);
  console.log("Done.");
})().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
