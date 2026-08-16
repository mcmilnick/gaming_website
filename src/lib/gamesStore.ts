"use client";

import type { GameRecord } from "./types";

// The catalog is a ~30k-game static file served from /games.json instead of
// being bundled into the JS (see public/games.json). This module fetches it
// once per page session and caches the result (plus an id lookup map) in
// module scope, so every component using useGames() shares one fetch - the
// browser's own HTTP cache (see next.config.ts headers) handles caching
// across page sessions/deploys.
type GamesState = { games: GameRecord[]; byId: Map<string, GameRecord> };

let cached: GamesState | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function load() {
  if (cached || inflight) return;
  inflight = fetch("/games.json")
    .then((res) => res.json())
    .then((games: GameRecord[]) => {
      cached = { games, byId: new Map(games.map((game) => [game.id, game])) };
      inflight = null;
      notify();
    });
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
