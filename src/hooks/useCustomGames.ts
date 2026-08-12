"use client";

import { useSyncExternalStore } from "react";
import { getCustomGames, subscribeToCustomGames } from "@/lib/customGames";
import type { GameRecord } from "@/lib/types";

function getSnapshot(): GameRecord[] | null {
  return getCustomGames();
}

function getServerSnapshot(): GameRecord[] | null {
  return null;
}

export function useCustomGames() {
  const games = useSyncExternalStore(subscribeToCustomGames, getSnapshot, getServerSnapshot);
  return { games: games ?? [], hydrated: games !== null };
}
