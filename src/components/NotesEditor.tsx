"use client";

import { useState } from "react";
import { updateEntry } from "@/lib/library";
import { upsertGameInListByName } from "@/lib/lists";
import { extractNoteTags } from "@/lib/noteTags";

// The Library-entry notes editor, with the [List Name] / [List Name: value]
// tag shortcut. Shared by Library rows and the game detail page so both
// commit tags and save notes identically - no separate copy to drift.
//
// Pass a `key` that changes when `notes` changes from elsewhere (an import,
// another tab) so this remounts and picks up the fresh value - see
// LibraryBrowser's `${entry.id}:${entry.notes}` row key for the pattern.
export function NotesEditor({ gameId, notes }: { gameId: string; notes: string }) {
  const [notesDraft, setNotesDraft] = useState(notes);

  function applyTags(text: string): { cleanedText: string; hadTags: boolean } {
    const { tags, cleanedText } = extractNoteTags(text);
    for (const tag of tags) {
      upsertGameInListByName(tag.name, gameId, tag.value);
    }
    return { cleanedText, hadTags: tags.length > 0 };
  }

  function handleBlur() {
    const { cleanedText, hadTags } = applyTags(notesDraft);
    if (hadTags) {
      updateEntry(gameId, { notes: cleanedText });
      setNotesDraft(cleanedText);
    } else if (notesDraft !== notes) {
      updateEntry(gameId, { notes: notesDraft });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    const { cleanedText, hadTags } = applyTags(notesDraft);
    if (!hadTags) return; // no tag on this line - let Enter insert a normal newline

    e.preventDefault();
    const nextText = cleanedText ? `${cleanedText}\n` : "";
    updateEntry(gameId, { notes: nextText });
    setNotesDraft(nextText);
  }

  return (
    <textarea
      value={notesDraft}
      onChange={(e) => setNotesDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Notes... try [List Name] or [List Name: value] to add this game to a list"
      rows={2}
      className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
    />
  );
}
