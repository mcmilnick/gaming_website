"use client";

import { useMemo, useState } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { getDistinctConsoles } from "@/lib/catalogSearch";
import { getStoredApiKey, setStoredApiKey, suggestGame, MODEL_ID, type TokenUsage } from "@/lib/aiSuggest";
import { Panel } from "@/components/Panel";

export function SuggestGame() {
  const { entries, hydrated } = useLibrary();
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [includeRatings, setIncludeRatings] = useState(false);
  const [sourceConsole, setSourceConsole] = useState("");
  const [targetConsole, setTargetConsole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consoles = useMemo(() => getDistinctConsoles(entries), [entries]);

  const sourceEntries = useMemo(
    () => (sourceConsole ? entries.filter((entry) => entry.console === sourceConsole) : entries),
    [entries, sourceConsole]
  );

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    setStoredApiKey(value);
  }

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    setResult(null);
    setUsage(null);
    const outcome = await suggestGame({
      apiKey,
      entries: sourceEntries,
      includeRatings,
      console: targetConsole,
    });
    setLoading(false);
    if ("error" in outcome) {
      setError(outcome.error);
    } else {
      setResult(outcome.text);
      setUsage(outcome.usage);
    }
  }

  if (!hydrated) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-zinc-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100">Suggest a Game</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Gemini recommendation based on your library. This calls Google&apos;s API using your own
        free API key. Sent only to Google. Stored on your browser, but not outside your computer.
        This site has no login, so no phoning home.
      </p>
      <div className="mt-2 text-sm text-zinc-400">
        If you need a key:
        <ol className="mt-1 list-decimal pl-5">
          <li>Search &quot;google ai studio api key&quot;</li>
          <li>Generate a free API key. No billing needed.</li>
        </ol>
      </div>
      <p className="mt-2 text-xs text-amber-400">
        Free tier — Google may use what you send here to improve their products. Don&apos;t use
        this if that&apos;s not okay with you.
      </p>

      <Panel className="mt-6">
        <label className="text-xs text-zinc-400" htmlFor="apiKey">
          Gemini API key
        </label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="AIzaSy..."
          autoComplete="off"
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">Uses {MODEL_ID}, free tier.</p>
      </Panel>

      <Panel className="mt-4">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={includeRatings}
              onChange={(e) => setIncludeRatings(e.target.checked)}
            />
            Use my ratings
          </label>
          <div>
            <label className="text-xs text-zinc-400" htmlFor="sourceConsole">
              Use Games From
            </label>
            <select
              id="sourceConsole"
              value={sourceConsole}
              onChange={(e) => setSourceConsole(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">All consoles</option>
              {consoles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400" htmlFor="targetConsole">
              Recommend Games For
            </label>
            <select
              id="targetConsole"
              value={targetConsole}
              onChange={(e) => setTargetConsole(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">All consoles</option>
              {consoles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      <button
        type="button"
        onClick={handleSuggest}
        disabled={loading}
        className="mt-4 w-full rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-50"
      >
        {loading ? "Thinking…" : "Suggest a Game"}
      </button>

      {error && (
        <div className="mt-4 rounded border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">
          {result}
        </div>
      )}

      {usage && (
        <p className="mt-2 text-xs text-zinc-500">
          {usage.totalTokens.toLocaleString()} tokens ({usage.promptTokens.toLocaleString()} prompt +{" "}
          {usage.responseTokens.toLocaleString()} response). Free-tier rate limits aren&apos;t visible
          via the API — check{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-zinc-300"
          >
            Google AI Studio
          </a>{" "}
          for your remaining quota.
        </p>
      )}
    </div>
  );
}
