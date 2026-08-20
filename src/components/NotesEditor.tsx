"use client";

import { useEffect, useRef, useState } from "react";
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

  // onBlur only fires when focus is lost naturally (e.g. clicking
  // elsewhere on the page) - it does NOT reliably fire when this component
  // is unmounted directly by a client-side route change (clicking "Back",
  // the browser back button), which was silently dropping unsaved text if
  // you navigated away without ever losing focus first. The ref mirrors the
  // latest draft so the unmount effect below can flush it even though its
  // cleanup closure was captured on mount, before any typing happened.
  const notesDraftRef = useRef(notesDraft);
  useEffect(() => {
    notesDraftRef.current = notesDraft;
  }, [notesDraft]);

  function applyTags(text: string): { cleanedText: string; hadTags: boolean } {
    const { tags, cleanedText } = extractNoteTags(text);
    for (const tag of tags) {
      upsertGameInListByName(tag.name, gameId, tag.value);
    }
    return { cleanedText, hadTags: tags.length > 0 };
  }

  function commitDraft(text: string) {
    const { cleanedText, hadTags } = applyTags(text);
    if (hadTags) {
      updateEntry(gameId, { notes: cleanedText });
      setNotesDraft(cleanedText);
    } else if (text !== notes) {
      updateEntry(gameId, { notes: text });
    }
  }

  function handleBlur() {
    commitDraft(notesDraft);
  }

  useEffect(() => {
    return () => {
      const current = notesDraftRef.current;
      // applyTags itself has no React state involved (only the list-store
      // side effect), so it's safe to call after this component has
      // already unmounted - unlike commitDraft, which also calls
      // setNotesDraft and would warn about updating unmounted state.
      const { cleanedText, hadTags } = applyTags(current);
      const finalText = hadTags ? cleanedText : current;
      if (finalText !== notes) {
        updateEntry(gameId, { notes: finalText });
      }
    };
    // Deliberately mount-once: this should flush whatever's in the ref at
    // unmount time, not re-run every time gameId/notes change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
