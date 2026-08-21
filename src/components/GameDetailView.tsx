"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGames } from "@/hooks/useGames";
import { formatReleaseDate } from "@/lib/catalogSearch";
import { isCustomGameId, removeCustomGame } from "@/lib/customGames";
import { useCustomGames } from "@/hooks/useCustomGames";
import { useLists } from "@/hooks/useLists";
import { removeEntryFromList, type GameList, type ListEntry } from "@/lib/lists";
import { removeFromLibrary, updateEntry, STATUS_LABELS, type LibraryStatus } from "@/lib/library";
import { useLibrary } from "@/hooks/useLibrary";
import { LibraryButton } from "@/components/LibraryButton";
import { CopyListTagsButton } from "@/components/CopyListTagsButton";
import { AddToListSelect } from "@/components/AddToListSelect";
import { NotesEditor } from "@/components/NotesEditor";

function regions(game: { releaseJapan: string | null; releaseNA: string | null; releasePAL: string | null }) {
  return [
    { label: "Japan", value: game.releaseJapan },
    { label: "North America", value: game.releaseNA },
    { label: "PAL region", value: game.releasePAL },
  ];
}

export function GameDetailView({ id }: { id: string }) {
  const { gamesById, hydrated: gamesHydrated } = useGames();
  const baseGame = gamesById.get(id);
  const { games: customGames, hydrated: customGamesHydrated } = useCustomGames();
  const { lists } = useLists();
  const { entries: libraryEntries } = useLibrary();
  const router = useRouter();
  const game = baseGame ?? customGames.find((candidate) => candidate.id === id);
  const hasRegionData = Boolean(game?.releaseJapan || game?.releaseNA || game?.releasePAL);
  const memberships = lists
    .map((list) => ({ list, entry: list.entries.find((e) => e.gameId === id) }))
    .filter((m): m is { list: GameList; entry: ListEntry } => Boolean(m.entry));
  // Adding to a list is only offered once the game is in the Library, so a
  // list entry always has a status to show (a "no status" case can't occur).
  const libraryEntry = libraryEntries.find((entry) => entry.id === id);
  const inLibrary = Boolean(libraryEntry);
  const showListsSection = inLibrary || memberships.length > 0;

  function handleDelete() {
    if (!game) return;
    if (!confirm(`Delete "${game.title}"? This removes it from your catalog, Library, and any lists.`)) {
      return;
    }
    removeFromLibrary(game.id);
    for (const { list } of memberships) {
      removeEntryFromList(list.id, game.id);
    }
    removeCustomGame(game.id);
    router.push("/add-games");
  }

  if (!game) {
    if (!customGamesHydrated || !gamesHydrated) {
      return <div className="mx-auto max-w-4xl px-4 py-8 text-zinc-500">Loading…</div>;
    }
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Game not found</h1>
        <p className="mt-3 text-sm text-zinc-400">
          <Link href="/" className="underline hover:text-zinc-200">
            Back to All Games
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
        &larr; Back to All Games
      </Link>

      <div className="mt-4 grid gap-6 sm:grid-cols-[240px_1fr]">
        <div>
          <div className="relative flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-lg bg-zinc-900 p-6 text-center">
            {isCustomGameId(game.id) && (
              <span className="absolute left-3 top-3 rounded bg-emerald-900/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                Mine
              </span>
            )}
            {game.coverUrl ? (
              <Image src={game.coverUrl} alt={game.title} fill className="object-cover" sizes="240px" />
            ) : (
              <>
                <span className="text-5xl">🎮</span>
                <span className="text-xs text-zinc-500">No cover art yet</span>
              </>
            )}
          </div>
          <Link
            href={`/add-games?copyFrom=${encodeURIComponent(game.id)}`}
            className="mt-2 block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-center text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Add Similar Game
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{game.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{game.console}</p>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Developer</dt>
              <dd className="text-zinc-200">{game.developer ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Publisher</dt>
              <dd className="text-zinc-200">{game.publisher ?? "—"}</dd>
            </div>
            {hasRegionData ? (
              regions(game).map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-zinc-500">{label} release</dt>
                  <dd className="text-zinc-200">{value ?? "Unreleased"}</dd>
                </div>
              ))
            ) : (
              <div>
                <dt className="text-zinc-500">Release date</dt>
                <dd className="text-zinc-200">{formatReleaseDate(game.releaseYear, game.releaseMonth) ?? "—"}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex max-w-xs flex-col gap-2">
            <LibraryButton game={game} />
            {libraryEntry && (
              <select
                value={libraryEntry.status}
                onChange={(e) => updateEntry(game.id, { status: e.target.value as LibraryStatus })}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            {isCustomGameId(game.id) && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40"
              >
                Delete this game
              </button>
            )}
          </div>

          {showListsSection && (
            <div className="mt-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-zinc-500">In your lists</p>
                {memberships.length > 0 && (
                  <CopyListTagsButton
                    tags={memberships.map(({ list, entry }) => ({ name: list.name, value: entry.value }))}
                  />
                )}
              </div>
              {memberships.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {memberships.map(({ list, entry }) => (
                    <span
                      key={list.id}
                      className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300"
                    >
                      <Link href={`/lists/${list.id}`} className="hover:text-zinc-100 hover:underline">
                        {list.name}
                        {entry.value ? `: ${entry.value}` : ""}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeEntryFromList(list.id, game.id)}
                        aria-label={`Remove from ${list.name}`}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {inLibrary && (
                <div className="mt-2">
                  <AddToListSelect gameId={game.id} />
                </div>
              )}
            </div>
          )}

          {libraryEntry && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500">Notes</p>
              <div className="mt-1">
                <NotesEditor key={libraryEntry.notes} gameId={game.id} notes={libraryEntry.notes} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
