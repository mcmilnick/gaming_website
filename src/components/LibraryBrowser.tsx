"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLibrary } from "@/hooks/useLibrary";
import { parseLibrarySortParam, isRatingSort, sortByRating } from "@/lib/library";
import { filterAndSortByCatalog, getDistinctConsoles } from "@/lib/catalogSearch";
import { LibraryFilterBar } from "@/components/LibraryFilterBar";
import { LibraryEntryRow } from "@/components/LibraryEntryRow";

export function LibraryBrowser() {
  const { entries, hydrated } = useLibrary();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const consoleFilter = searchParams.get("console") ?? "";
  const sort = parseLibrarySortParam(searchParams.get("sort"));
  const statusFilter = searchParams.get("status") ?? "";

  const consoles = useMemo(() => getDistinctConsoles(entries), [entries]);

  const filtered = useMemo(() => {
    const statusFiltered = statusFilter
      ? entries.filter((entry) => entry.status === statusFilter)
      : entries;
    if (isRatingSort(sort)) {
      const searched = filterAndSortByCatalog(statusFiltered, { search, console: consoleFilter });
      return sortByRating(searched, sort);
    }
    return filterAndSortByCatalog(statusFiltered, { search, console: consoleFilter, sort });
  }, [entries, statusFilter, search, consoleFilter, sort]);

  if (!hydrated) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-zinc-500">Loading your library…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Your library is empty</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Browse{" "}
          <Link href="/" className="underline hover:text-zinc-200">
            All Games
          </Link>{" "}
          and add games you own, are playing, or want to play. Everything here is saved in this
          browser&apos;s local storage.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">My Library</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {filtered.length} of {entries.length} game{entries.length === 1 ? "" : "s"} — stored locally
        in this browser.
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        Type <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">[List Name]</code> or{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">[List Name: value]</code> in a
        game&apos;s Notes below to create or add it to a list in{" "}
        <Link href="/lists" className="underline hover:text-zinc-200">
          My Lists
        </Link>
        .
      </p>

      <div className="mt-6">
        <LibraryFilterBar
          consoles={consoles}
          currentSearch={search}
          currentConsole={consoleFilter}
          currentSort={sort}
          currentStatus={statusFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-zinc-500">No library entries matched your filters.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {filtered.map((entry) => (
            <LibraryEntryRow key={`${entry.id}:${entry.notes}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
