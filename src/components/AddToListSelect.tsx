"use client";

import { useState } from "react";
import Link from "next/link";
import { useLists } from "@/hooks/useLists";
import { addEntryToList } from "@/lib/lists";

export function AddToListSelect({ gameId }: { gameId: string }) {
  const { lists, hydrated } = useLists();
  // Bumping this remounts the <select>, resetting it back to the
  // placeholder after a pick - simpler than fighting a controlled value
  // against an options list that changes out from under it.
  const [resetKey, setResetKey] = useState(0);

  if (!hydrated) return null;

  const availableLists = lists.filter((list) => !list.entries.some((entry) => entry.gameId === gameId));

  if (lists.length === 0) {
    return (
      <Link href="/lists" className="text-xs text-zinc-500 underline hover:text-zinc-300">
        Create a list to add this game to
      </Link>
    );
  }

  if (availableLists.length === 0) {
    return <p className="text-xs text-zinc-600">Already in all your lists</p>;
  }

  return (
    <select
      key={resetKey}
      defaultValue=""
      onChange={(e) => {
        const listId = e.target.value;
        if (listId) {
          addEntryToList(listId, gameId);
          setResetKey((k) => k + 1);
        }
      }}
      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:border-emerald-600 focus:outline-none"
    >
      <option value="">+ Add to existing list</option>
      {availableLists.map((list) => (
        <option key={list.id} value={list.id}>
          {list.name}
        </option>
      ))}
    </select>
  );
}
