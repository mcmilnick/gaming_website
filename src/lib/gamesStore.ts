"use client";

import type { GameRecord } from "./types";

// The catalog is a ~77k-game static file served from /games.json instead of
// being bundled into the JS (see public/games.json). This module fetches it
// once per page session and caches the result (plus an id lookup map) in
// module scope, so every component using useGames() shares one fetch.
//
// It's fetched as /games.json?v=<version>, where <version> comes from the
// tiny games-manifest.json (always revalidated, essentially free to fetch).
// The versioned URL is then cached by the browser as hard as possible (see
// next.config.ts) - a version's contents never change, so there's no
// staleness risk, and a real data update gets a new version/URL so every
// visitor sees it on their very next load instead of only after a cache
// window expires.
type GamesState = { games: GameRecord[]; byId: Map<string, GameRecord> };

let cached: GamesState | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

async function load() {
  if (cached || inflight) return;
  inflight = (async () => {
    const manifest: { version: string } = await fetch("/games-manifest.json").then((res) => res.json());
    const games: GameRecord[] = await fetch(`/games.json?v=${manifest.version}`).then((res) => res.json());
    cached = { games, byId: new Map(games.map((game) => [game.id, game])) };
    inflight = null;
    notify();
  })();
}

export function getGamesSnapshot(): GamesState | null {
  return cached;
}

export function subscribeToGames(callback: () => void): () => void {
  listeners.add(callback);
  load();
  return () => {
    listeners.delete(callback);
  };
}
