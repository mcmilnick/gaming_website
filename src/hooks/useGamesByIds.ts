"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameRecord } from "@/lib/types";

const EMPTY: GameRecord[] = [];

// Looks up specific, already-known game ids from the database (via
// /api/games/by-ids). Use this whenever a page only needs details for a
// handful of games, so the browser never downloads the whole catalog.
// Callers should drop custom (user-added) ids before passing them in, since
// those aren't in the database.
export function useGamesByIds(ids: string[]) {
  const key = useMemo(() => Array.from(new Set(ids)).sort().join(","), [ids]);
  const [fetched, setFetched] = useState<{ key: string; games: GameRecord[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/games/by-ids?ids=${key}`)
      .then((res) => res.json())
      .then((games: GameRecord[]) => {
        if (!cancelled) setFetched({ key, games });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Only trust results that belong to the current set of ids, so changing
  // ids never shows the previous set's games as if they were current.
  const games = !key ? EMPTY : fetched?.key === key ? fetched.games : null;
  const byId = useMemo(() => new Map((games ?? EMPTY).map((game) => [game.id, game])), [games]);

  return { games: games ?? EMPTY, byId, hydrated: games !== null };
}
