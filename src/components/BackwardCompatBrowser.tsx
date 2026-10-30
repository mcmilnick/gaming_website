"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLists } from "@/hooks/useLists";
import { useLibrary } from "@/hooks/useLibrary";
import { useCustomGames } from "@/hooks/useCustomGames";
import { useGamesByIds } from "@/hooks/useGamesByIds";
import { isCustomGameId } from "@/lib/customGames";
import { BACKWARD_COMPAT_FROM_CONSOLES, BACKWARD_COMPAT_TARGETS, isBackwardCompatible } from "@/lib/backwardCompat";
import { Panel } from "@/components/Panel";

type Source = "main" | "library" | "list";
type TitledGame = { id: string; title: string };

export function BackwardCompatBrowser() {
  const [fromConsole, setFromConsole] = useState(BACKWARD_COMPAT_FROM_CONSOLES[0] ?? "");
  // The "to" options depend entirely on which "from" console is picked -
  // not every pair means anything (there's no such thing as "PlayStation 2
  // to Xbox 360"), so this always starts from BACKWARD_COMPAT_TARGETS
  // rather than letting the dropdown show every console in the catalog.
  const toOptions = BACKWARD_COMPAT_TARGETS[fromConsole] ?? [];
  const [toConsole, setToConsole] = useState(toOptions[0] ?? "");

  function handleFromChange(nextFrom: string) {
    setFromConsole(nextFrom);
    // Whatever "to" was picked might not be valid for the new "from" - reset
    // to that console's own first option (or none, if it has no targets
    // defined yet) rather than leaving a stale, meaningless pairing selected.
    setToConsole(BACKWARD_COMPAT_TARGETS[nextFrom]?.[0] ?? "");
  }

  const [source, setSource] = useState<Source>("main");
  const [listId, setListId] = useState("");

  const { lists, hydrated: listsHydrated } = useLists();
  const { entries: libraryEntries, hydrated: libraryHydrated } = useLibrary();
  const { games: customGames } = useCustomGames();

  // Library source: entries already carry their own title and console
  // (copied in when you added the game - see library.ts), so this is a
  // plain filter, no catalog lookup needed the way the list source below
  // requires one.
  const libraryGames = useMemo(
    (): TitledGame[] =>
      libraryEntries
        .filter((entry) => entry.console === fromConsole)
        .map((entry) => ({ id: entry.id, title: entry.title })),
    [libraryEntries, fromConsole]
  );

  // Main-catalog source: every game for the chosen console, straight from
  // the database - not paginated, since this tab needs the whole console's
  // worth of titles to sort into the two buckets, not one page at a time.
  const [mainGames, setMainGames] = useState<TitledGame[] | null>(null);
  useEffect(() => {
    if (source !== "main" || !fromConsole) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMainGames(null);
    fetch(`/api/games/by-console?console=${encodeURIComponent(fromConsole)}`)
      .then((res) => res.json())
      .then((games: TitledGame[]) => {
        if (!cancelled) setMainGames(games);
      });
    return () => {
      cancelled = true;
    };
  }, [source, fromConsole]);

  // Personal-list source: resolve the chosen list's entries to real games
  // (base catalog ids via lookup, custom ones already in localStorage) -
  // the same pattern the List detail page itself uses - then only keep the
  // ones on the console you picked. A list that's entirely PS2 games
  // correctly comes back empty when the console dropdown is Xbox 360.
  const selectedList = lists.find((list) => list.id === listId);
  const baseEntryIds = useMemo(
    () =>
      source === "list" && selectedList
        ? selectedList.entries.map((entry) => entry.gameId).filter((id) => !isCustomGameId(id))
        : [],
    [source, selectedList]
  );
  const { byId: baseGamesById, hydrated: baseGamesHydrated } = useGamesByIds(baseEntryIds);

  const listGames = useMemo((): TitledGame[] => {
    if (source !== "list" || !selectedList) return [];
    const customById = new Map(customGames.map((game) => [game.id, game]));
    return selectedList.entries
      .map((entry) => baseGamesById.get(entry.gameId) ?? customById.get(entry.gameId))
      .filter((game): game is NonNullable<typeof game> => Boolean(game))
      .filter((game) => game.console === fromConsole);
  }, [source, selectedList, baseGamesById, customGames, fromConsole]);

  const games = source === "main" ? mainGames : source === "library" ? libraryGames : listGames;
  const loading =
    source === "main"
      ? mainGames === null
      : source === "library"
        ? !libraryHydrated
        : Boolean(selectedList) && !baseGamesHydrated;

  const { compatible, notCompatible } = useMemo(() => {
    const compatible: TitledGame[] = [];
    const notCompatible: TitledGame[] = [];
    for (const game of games ?? []) {
      (isBackwardCompatible(fromConsole, toConsole, game.title) ? compatible : notCompatible).push(game);
    }
    return { compatible, notCompatible };
  }, [games, fromConsole, toConsole]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">Backward Compatibility</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {toConsole
          ? `Checks which ${fromConsole} games carry over to ${toConsole}, against Microsoft's official backward compatibility list.`
          : "Pick a console below to check which of its games carry over to a newer one."}{" "}
        Matched by title - special editions, DLC packs, and collections sometimes don&apos;t
        match exactly, so double-check a surprising result.
      </p>

      <Panel className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div>
            <label className="text-xs text-zinc-400" htmlFor="bcFromConsole">
              Console From
            </label>
            <select
              id="bcFromConsole"
              value={fromConsole}
              onChange={(e) => handleFromChange(e.target.value)}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              {BACKWARD_COMPAT_FROM_CONSOLES.map((console) => (
                <option key={console} value={console}>
                  {console}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400" htmlFor="bcToConsole">
              Console To
            </label>
            <select
              id="bcToConsole"
              value={toConsole}
              onChange={(e) => setToConsole(e.target.value)}
              disabled={!fromConsole || toOptions.length === 0}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {toOptions.length === 0 && <option value="">No targets defined yet</option>}
              {toOptions.map((console) => (
                <option key={console} value={console}>
                  {console}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400" htmlFor="bcSource">
              Pull from
            </label>
            <select
              id="bcSource"
              value={source}
              onChange={(e) => {
                const value = e.target.value as Source;
                setSource(value);
                if (value !== "list") setListId("");
              }}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="main">Main catalog</option>
              <option value="library">My Library</option>
              <option value="list">One of my lists</option>
            </select>
          </div>

          {source === "list" && (
            <div>
              <label className="text-xs text-zinc-400" htmlFor="bcList">
                Which list
              </label>
              <select
                id="bcList"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="mt-1 block rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="">Choose a list...</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.entries.length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Panel>

      {!toConsole ? (
        <p className="mt-8 text-center text-sm text-zinc-500">
          No backward compatibility targets are defined for {fromConsole} yet.
        </p>
      ) : source === "library" && libraryHydrated && libraryEntries.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">
          Your library is empty - add games on{" "}
          <Link href="/" className="underline hover:text-zinc-200">
            All Games
          </Link>
          .
        </p>
      ) : source === "list" && listsHydrated && lists.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">
          You don&apos;t have any lists yet - create one on{" "}
          <Link href="/lists" className="underline hover:text-zinc-200">
            My Lists
          </Link>
          .
        </p>
      ) : source === "list" && !selectedList ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Choose a list above.</p>
      ) : loading ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <ResultColumn title={`Backward Compatible on ${toConsole}`} games={compatible} tone="emerald" />
          <ResultColumn title={`Not Compatible on ${toConsole}`} games={notCompatible} tone="zinc" />
        </div>
      )}
    </div>
  );
}

function ResultColumn({ title, games, tone }: { title: string; games: TitledGame[]; tone: "emerald" | "zinc" }) {
  return (
    <div>
      <h2 className={`text-sm font-semibold ${tone === "emerald" ? "text-emerald-400" : "text-zinc-400"}`}>
        {title} ({games.length})
      </h2>
      <div className="mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900">
        {games.length === 0 ? (
          <p className="px-3 py-4 text-sm text-zinc-500">No games here.</p>
        ) : (
          games.map((game) => (
            <Link
              key={game.id}
              href={`/game/${game.id}`}
              className="block border-b border-zinc-800 px-3 py-2 text-sm text-zinc-200 last:border-0 hover:bg-zinc-800"
            >
              {game.title}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
