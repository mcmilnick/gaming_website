"use client";

import type { GameRecord } from "./types";

// The catalog now lives in Postgres (see scripts/fetch-igdb-games.js for the
// ingestion side and src/app/api/games/route.ts for the read side) instead
// of the old static public/games.json file. This module fetches the full
// catalog from /api/games once per page session and caches the result (plus
// an id lookup map) in module scope, so every component using useGames()
// shares one fetch. The route itself is cache-control'd for an hour, so
// repeat loads across visitors don't each hit the database.
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
    const games: GameRecord[] = await fetch("/api/games").then((res) => res.json());
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
