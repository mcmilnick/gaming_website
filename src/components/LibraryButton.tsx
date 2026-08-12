"use client";

import { useSyncExternalStore } from "react";
import { addToLibrary, isInLibrary, removeFromLibrary, subscribeToLibrary } from "@/lib/library";
import type { GameRecord } from "@/lib/types";

function getServerSnapshot() {
  return false;
}

export function LibraryButton({ game }: { game: GameRecord }) {
  const inLibrary = useSyncExternalStore(
    subscribeToLibrary,
    () => isInLibrary(game.id),
    getServerSnapshot
  );

  function toggle() {
    if (inLibrary) {
      removeFromLibrary(game.id);
    } else {
      addToLibrary({
        id: game.id,
        title: game.title,
        console: game.console,
        developer: game.developer,
        publisher: game.publisher,
        releaseYear: game.releaseYear,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-full rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
        inLibrary
          ? "border-emerald-700 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60"
          : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
      }`}
    >
      {inLibrary ? "✓ In Library" : "+ Add to Library"}
    </button>
  );
}
