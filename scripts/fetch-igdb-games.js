// Fetches games for a set of platforms from IGDB and writes them to
// src/data/games.json, replacing whatever is there.
//
// Requires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET (from a Twitch Developer
// app: https://dev.twitch.tv/console/apps). Run with:
//   npm run fetch-games
// which loads .env.local via Node's --env-file flag.
//
// This is a maintainer-side script, not something the deployed app runs -
// it produces a static file that gets bundled the same way the old
// Wikipedia-sourced dataset was. No IGDB credentials are ever shipped to
// the live site.

const fs = require("fs");
const path = require("path");

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
const TARGET_PLATFORM_NAMES = ["Game Boy", "Game Boy Color", "Game Boy Advance"];

const OUTPUT_PATH = path.join(__dirname, "..", "src", "data", "games.json");
const PAGE_SIZE = 500;
const REQUEST_DELAY_MS = 300;

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
  const body = `fields id,name; where name = (${nameList}); limit 20;`;
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
      "fields name, first_release_date, cover.image_id,",
      "involved_companies.company.name, involved_companies.developer, involved_companies.publisher;",
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

function mapGame(igdbGame, platformName) {
  const involved = igdbGame.involved_companies || [];
  const developer = involved.find((c) => c.developer)?.company?.name ?? null;
  const publisher = involved.find((c) => c.publisher)?.company?.name ?? null;
  const releaseYear = igdbGame.first_release_date
    ? new Date(igdbGame.first_release_date * 1000).getUTCFullYear()
    : null;
  const coverUrl = igdbGame.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${igdbGame.cover.image_id}.jpg`
    : null;

  return {
    id: `igdb-${igdbGame.id}-${slugify(platformName)}`,
    title: igdbGame.name,
    console: platformName,
    developer,
    publisher,
    // IGDB's release_dates-by-region breakdown isn't fetched here to keep
    // this script simple - releaseYear covers sorting/filtering needs.
    // Revisit if per-region dates (like the old Wikipedia data had) matter.
    releaseJapan: null,
    releaseNA: null,
    releasePAL: null,
    releaseYear,
    coverUrl,
  };
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

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allGames, null, 2));
  console.log(`\nWrote ${allGames.length} games to ${OUTPUT_PATH}`);
})().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
