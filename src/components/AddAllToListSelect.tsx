"use client";

import { useState } from "react";
import Link from "next/link";
import { useLists } from "@/hooks/useLists";
import { addEntriesToList } from "@/lib/lists";

// Bulk sibling of AddToListSelect - adds every game in `gameIds` (the
// Library's current search/filter results, not just the visible page) to
// one chosen list in a single action, instead of one-at-a-time per row.
export function AddAllToListSelect({ gameIds }: { gameIds: string[] }) {
  const { lists, hydrated } = useLists();
  // Bumping this remounts the <select>, resetting it back to the
  // placeholder after a pick - same trick AddToListSelect uses.
  const [resetKey, setResetKey] = useState(0);

  if (!hydrated || gameIds.length === 0) return null;

  if (lists.length === 0) {
    return (
      <Link href="/lists" className="text-xs text-zinc-500 underline hover:text-zinc-300">
        Create a list to add these games to
      </Link>
    );
  }

  return (
    <select
      key={resetKey}
      aria-label="Add all search results to existing list"
      defaultValue=""
      onChange={(e) => {
        const listId = e.target.value;
        if (listId) {
          addEntriesToList(listId, gameIds);
          setResetKey((k) => k + 1);
        }
      }}
      className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:border-emerald-600 focus:outline-none"
    >
      <option value="">Add all search results to existing list</option>
      {lists.map((list) => (
        <option key={list.id} value={list.id}>
          {list.name}
        </option>
      ))}
    </select>
  );
}
