"use client";

import Image from "next/image";
import Link from "next/link";
import { removeFromLibrary, updateEntry, STATUS_LABELS, type LibraryEntry, type LibraryStatus } from "@/lib/library";
import { formatReleaseDate } from "@/lib/catalogSearch";
import { useLists } from "@/hooks/useLists";
import { useCustomGames } from "@/hooks/useCustomGames";
import { useGames } from "@/hooks/useGames";
import { removeEntryFromList, type GameList, type ListEntry } from "@/lib/lists";
import { RatingStars } from "@/components/RatingStars";
import { CopyListTagsButton } from "@/components/CopyListTagsButton";
import { AddToListSelect } from "@/components/AddToListSelect";
import { NotesEditor } from "@/components/NotesEditor";

// The parent list keys each row on `${entry.id}:${entry.notes}`, so this
// component (and the NotesEditor inside it) remounts whenever the stored
// notes change from elsewhere, picking up the fresh value automatically.
export function LibraryEntryRow({ entry }: { entry: LibraryEntry }) {
  const { lists } = useLists();
  const { games: customGames } = useCustomGames();
  const { gamesById } = useGames();

  // Library entries only store a lightweight snapshot (no cover image), so
  // resolve the live catalog record to get artwork if it's still around.
  const catalogGame = gamesById.get(entry.id) ?? customGames.find((game) => game.id === entry.id);
  const coverUrl = catalogGame?.coverUrl ?? null;
  const releaseDate = formatReleaseDate(entry.releaseYear, entry.releaseMonth);

  const memberships = lists
    .map((list) => ({ list, listEntry: list.entries.find((e) => e.gameId === entry.id) }))
    .filter((m): m is { list: GameList; listEntry: ListEntry } => Boolean(m.listEntry));

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
      <Link
        href={`/game/${entry.id}`}
        className="relative flex h-32 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-800 text-2xl"
      >
        {coverUrl ? (
          <Image src={coverUrl} alt={entry.title} fill className="object-cover" sizes="96px" />
        ) : (
          "🎮"
        )}
      </Link>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/game/${entry.id}`} className="font-medium text-zinc-100 hover:underline">
              {entry.title}
            </Link>
            <p className="text-xs text-zinc-500">
              {entry.console ? `${entry.console} · ` : ""}
              {entry.publisher ?? "Unknown publisher"}
              {releaseDate ? ` · ${releaseDate}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeFromLibrary(entry.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select
            value={entry.status}
            onChange={(e) => updateEntry(entry.id, { status: e.target.value as LibraryStatus })}
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <RatingStars
            value={entry.userRating}
            onChange={(rating) => updateEntry(entry.id, { userRating: rating })}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {memberships.map(({ list, listEntry }) => (
            <span
              key={list.id}
              className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300"
            >
              <Link href={`/lists/${list.id}`} className="hover:text-zinc-100 hover:underline">
                {list.name}
                {listEntry.value ? `: ${listEntry.value}` : ""}
              </Link>
              <button
                type="button"
                onClick={() => removeEntryFromList(list.id, entry.id)}
                aria-label={`Remove from ${list.name}`}
                className="text-zinc-500 hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
          <AddToListSelect gameId={entry.id} />
          {memberships.length > 0 && (
            <CopyListTagsButton
              tags={memberships.map(({ list, listEntry }) => ({ name: list.name, value: listEntry.value }))}
            />
          )}
        </div>

        <div className="mt-2">
          <NotesEditor gameId={entry.id} notes={entry.notes} />
        </div>
      </div>
    </div>
  );
}
