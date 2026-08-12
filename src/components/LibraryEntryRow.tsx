"use client";

import { useState } from "react";
import Link from "next/link";
import { removeFromLibrary, updateEntry, STATUS_LABELS, type LibraryEntry, type LibraryStatus } from "@/lib/library";
import { useLists } from "@/hooks/useLists";
import { removeEntryFromList, upsertGameInListByName, type GameList, type ListEntry } from "@/lib/lists";
import { extractNoteTags } from "@/lib/noteTags";
import { RatingStars } from "@/components/RatingStars";
import { CopyListTagsButton } from "@/components/CopyListTagsButton";

// The parent list keys each row on `${entry.id}:${entry.notes}`, so this
// component remounts (and notesDraft re-initializes from the prop) whenever
// the stored notes change from elsewhere - no effect needed to keep them
// in sync, and the tag-stripped text just flows through naturally on save.
export function LibraryEntryRow({ entry }: { entry: LibraryEntry }) {
  const { lists } = useLists();
  const [notesDraft, setNotesDraft] = useState(entry.notes);

  const memberships = lists
    .map((list) => ({ list, listEntry: list.entries.find((e) => e.gameId === entry.id) }))
    .filter((m): m is { list: GameList; listEntry: ListEntry } => Boolean(m.listEntry));

  function handleNotesBlur() {
    const { tags, cleanedText } = extractNoteTags(notesDraft);
    for (const tag of tags) {
      upsertGameInListByName(tag.name, entry.id, tag.value);
    }
    if (tags.length > 0) {
      // Always commit + reflect locally when tags were found, even if the
      // stripped text happens to match what was already stored (e.g. notes
      // that were empty before a tag-only entry) - otherwise the bracket
      // text is left sitting in the textarea with nothing to clear it.
      updateEntry(entry.id, { notes: cleanedText });
      setNotesDraft(cleanedText);
    } else if (notesDraft !== entry.notes) {
      updateEntry(entry.id, { notes: notesDraft });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
      <Link
        href={`/game/${entry.id}`}
        className="flex h-32 w-24 flex-shrink-0 items-center justify-center rounded bg-zinc-800 text-2xl"
      >
        🎮
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
              {entry.releaseYear ? ` · ${entry.releaseYear}` : ""}
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

        {memberships.length > 0 && (
          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
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
            </div>
            <CopyListTagsButton
              tags={memberships.map(({ list, listEntry }) => ({ name: list.name, value: listEntry.value }))}
            />
          </div>
        )}

        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Notes... try [List Name] or [List Name: value] to add this game to a list"
          rows={2}
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600"
        />
      </div>
    </div>
  );
}
