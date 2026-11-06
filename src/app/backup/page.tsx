"use client";

import { useRef, useState } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { useCustomGames } from "@/hooks/useCustomGames";
import { useLists } from "@/hooks/useLists";
import { exportAllDataAsJson, exportListsAsJson, importFromJson, type ImportMode, type ImportResult } from "@/lib/dataExport";

// Just enough to make a downloaded filename readable - doesn't need to match
// the canonical slugify in lists.ts, since this is display only.
function slugifyForFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function BackupPage() {
  const { entries: libraryEntries } = useLibrary();
  const { games: customGames } = useCustomGames();
  const { lists } = useLists();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ImportMode>("merge");
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportListId, setExportListId] = useState("");

  function handleExport() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(exportAllDataAsJson(), `any-stat-gaming-backup-${stamp}.json`);
  }

  // Shares one list (or all of them) as its own file, in the same backup
  // format - so the recipient can drop it straight into Import with Merge
  // and it just adds the list(s), without touching anything else of
  // theirs. See buildListsExportPayload for why this is safe even in
  // Replace mode (it never carries a "library" key).
  function handleExportLists() {
    const stamp = new Date().toISOString().slice(0, 10);
    const selected = lists.find((list) => list.id === exportListId);
    const filename = selected
      ? `any-stat-gaming-list-${slugifyForFilename(selected.name)}-${stamp}.json`
      : `any-stat-gaming-lists-${stamp}.json`;
    downloadJson(exportListsAsJson(exportListId || undefined), filename);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setResults(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        setResults(importFromJson(text, mode));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not import this file.");
      }
    };
    reader.onerror = () => setError("Could not read this file.");
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">Local Backup & Restore</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Move your Library and Added Games to another browser or device, or keep a safety copy.
      </p>

      <div className="mt-4 rounded border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
        Everything on this site — your Library, ratings, notes, and any games you&apos;ve added —
        lives only in this browser&apos;s local storage. There&apos;s no account and nothing is synced
        automatically. Export a backup file before clearing your browser data, switching browsers,
        or moving to a new device.
      </div>

      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-lg font-semibold text-zinc-100">Export</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Currently stored in this browser: {libraryEntries.length} library entr
          {libraryEntries.length === 1 ? "y" : "ies"}, {customGames.length} added game
          {customGames.length === 1 ? "" : "s"}.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/60"
        >
          Download backup file
        </button>

        {lists.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportLists}
              className="rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/60"
            >
              Export Lists
            </button>
            <select
              value={exportListId}
              onChange={(e) => setExportListId(e.target.value)}
              aria-label="Which list to export"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">All Lists</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.entries.length})
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Send that file to someone else, or just keep it. They (or you, on another device) can load
          it under Import below with Merge selected to add the list without touching anything else.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-lg font-semibold text-zinc-100">Import</h2>

        <fieldset className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
              className="mt-1"
            />
            <span>
              <strong>Merge</strong> — add anything new from the file and update entries that share
              an id, keep everything else as-is. Recommended.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
              className="mt-1"
            />
            <span>
              <strong>Replace</strong> — wipe what&apos;s currently in this browser and use only what&apos;s
              in the file.
            </span>
          </label>
        </fieldset>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="mt-4 block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border file:border-zinc-700 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {results && (
          <div className="mt-3 rounded border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
            <p className="font-medium">Import complete.</p>
            <ul className="mt-1 list-inside list-disc">
              {results.map((result) => (
                <li key={result.key}>
                  {result.label}: {result.added} added, {result.updated} updated — {result.after} total
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
