"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useGames } from "@/hooks/useGames";
import { addCustomGame } from "@/lib/customGames";
import { useCustomGames } from "@/hooks/useCustomGames";
import { normalizeForSearch } from "@/lib/catalogSearch";
import type { GameRecord } from "@/lib/types";

const EMPTY_FORM = {
  title: "",
  console: "Game Boy",
  developer: "",
  publisher: "",
  releaseYear: "",
  coverUrl: "",
};

export function AddGamesForm() {
  const { games, hydrated } = useCustomGames();
  const { games: catalogGames, hydrated: catalogHydrated } = useGames();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState(EMPTY_FORM);
  const [copyQuery, setCopyQuery] = useState("");
  const [coverPreviewFailed, setCoverPreviewFailed] = useState(false);

  const combinedGames = useMemo(() => [...catalogGames, ...games], [catalogGames, games]);
  const copyResults = useMemo(() => {
    const query = normalizeForSearch(copyQuery.trim());
    if (!query) return [];
    return combinedGames.filter((game) => normalizeForSearch(game.title).includes(query)).slice(0, 8);
  }, [combinedGames, copyQuery]);

  function handleCopyFrom(game: GameRecord) {
    setForm({
      title: game.title,
      console: game.console,
      developer: game.developer ?? "",
      publisher: game.publisher ?? "",
      releaseYear: game.releaseYear !== null ? String(game.releaseYear) : "",
      coverUrl: game.coverUrl ?? "",
    });
    setCopyQuery("");
    setCoverPreviewFailed(false);
  }

  // Supports the "Add Similar Game" button on a game's detail page - it
  // links here with ?copyFrom=<id> instead of making the user re-search for
  // the game they just came from. Waits on both games sources to hydrate
  // (the linked game could be either a base catalog game or one of the
  // user's own custom games) before looking it up, then strips the param so
  // it doesn't re-fire the prefill if the user navigates back here later.
  // Syncing form state from a URL param is one of the legitimate uses of an
  // effect (React's own docs call this out) - hence the lint override below.
  useEffect(() => {
    const copyFromId = searchParams.get("copyFrom");
    if (!copyFromId || !catalogHydrated || !hydrated) return;
    const source = combinedGames.find((candidate) => candidate.id === copyFromId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (source) handleCopyFrom(source);
    router.replace("/add-games");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, catalogHydrated, hydrated, combinedGames]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    const parsedYear = form.releaseYear.trim() ? Number(form.releaseYear) : null;
    addCustomGame({
      title,
      console: form.console.trim() || "Game Boy",
      developer: form.developer.trim() || null,
      publisher: form.publisher.trim() || null,
      releaseYear: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
      coverUrl: form.coverUrl.trim() || null,
    });
    setForm(EMPTY_FORM);
    setCopyQuery("");
    setCoverPreviewFailed(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">Add Game</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Fill in gaps in the base catalog with titles of your own.
      </p>

      <div className="mt-4 rounded border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
        Games you add here are saved only in <strong>this browser</strong> — they&apos;re not sent
        anywhere and no one else can see them. They won&apos;t appear on another device or browser,
        and clearing this browser&apos;s cache or site data will delete them for good.
      </div>

      <div className="relative mt-6">
        <label className="text-xs text-zinc-400" htmlFor="copyFrom">
          Copy From Game (optional)
        </label>
        <input
          id="copyFrom"
          value={copyQuery}
          onChange={(e) => setCopyQuery(e.target.value)}
          placeholder="Search base + your games to start from an existing entry..."
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
        />
        {copyResults.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border border-zinc-700 bg-zinc-950 shadow-lg">
            {copyResults.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  onMouseDown={() => handleCopyFrom(game)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-zinc-800"
                >
                  <span className="text-sm text-zinc-100">{game.title}</span>
                  <span className="text-xs text-zinc-500">
                    {[game.console, game.publisher, game.releaseYear].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
      >
        <div>
          <label className="text-xs text-zinc-400" htmlFor="title">
            Title *
          </label>
          <input
            id="title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400" htmlFor="console">
              Console
            </label>
            <input
              id="console"
              value={form.console}
              onChange={(e) => setForm((f) => ({ ...f, console: e.target.value }))}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400" htmlFor="releaseYear">
              Release year
            </label>
            <input
              id="releaseYear"
              type="number"
              inputMode="numeric"
              value={form.releaseYear}
              onChange={(e) => setForm((f) => ({ ...f, releaseYear: e.target.value }))}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400" htmlFor="developer">
              Developer
            </label>
            <input
              id="developer"
              value={form.developer}
              onChange={(e) => setForm((f) => ({ ...f, developer: e.target.value }))}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400" htmlFor="publisher">
              Publisher
            </label>
            <input
              id="publisher"
              value={form.publisher}
              onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400" htmlFor="coverUrl">
            Cover image URL
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Go to the page, right-click the image, copy the image link. Not the page itself.
          </p>
          <div className="mt-1 flex items-start gap-3">
            <input
              id="coverUrl"
              type="url"
              value={form.coverUrl}
              onChange={(e) => {
                setForm((f) => ({ ...f, coverUrl: e.target.value }));
                setCoverPreviewFailed(false);
              }}
              placeholder="https://..."
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
            />
            <div className="relative flex h-16 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-700 bg-zinc-950">
              {form.coverUrl.trim() && !coverPreviewFailed ? (
                <Image
                  key={form.coverUrl.trim()}
                  src={form.coverUrl.trim()}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                  sizes="48px"
                  onError={() => setCoverPreviewFailed(true)}
                />
              ) : (
                <span className="text-[10px] text-zinc-600">Preview</span>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/60"
        >
          Add game
        </button>
      </form>
    </div>
  );
}
