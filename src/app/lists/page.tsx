"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLists } from "@/hooks/useLists";
import { createList, deleteList } from "@/lib/lists";

export default function ListsPage() {
  const { lists, hydrated } = useLists();
  const [name, setName] = useState("");
  const router = useRouter();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const list = createList(trimmed);
    setName("");
    router.push(`/lists/${list.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">My Lists</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Build your own ordered lists from games in your Library — playthrough order, a speedrun
        queue, whatever you want. You can also create or add to a list by typing{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">[List Name]</code> or{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">[List Name: value]</code> in a
        game&apos;s Notes on the Library page.
      </p>

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New list name..."
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/60"
        >
          Create list
        </button>
      </form>

      <div className="mt-6">
        {!hydrated ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : lists.length === 0 ? (
          <p className="text-sm text-zinc-500">You haven&apos;t created any lists yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
              >
                <Link href={`/lists/${list.id}`} className="text-zinc-100 hover:underline">
                  {list.name}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {list.entries.length} game{list.entries.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${list.name}"? This can't be undone.`)) deleteList(list.id);
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
