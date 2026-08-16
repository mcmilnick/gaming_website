"use client";

import { useSyncExternalStore } from "react";
import { getGamesSnapshot, subscribeToGames } from "@/lib/gamesStore";
import type { GameRecord } from "@/lib/types";

const EMPTY_GAMES: GameRecord[] = [];
const EMPTY_BY_ID = new Map<string, GameRecord>();

function getServerSnapshot() {
  return null;
}

// gamesById is a Map (not a getGameById function) so its reference stays
// stable across renders - safe to use directly in a useMemo dependency array
// without recomputing every render.
export function useGames() {
  const state = useSyncExternalStore(subscribeToGames, getGamesSnapshot, getServerSnapshot);
  return {
    games: state?.games ?? EMPTY_GAMES,
    gamesById: state?.byId ?? EMPTY_BY_ID,
    hydrated: state !== null,
  };
}
