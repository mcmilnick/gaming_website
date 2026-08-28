"use client";

import { usePathname, useRouter } from "next/navigation";
import { CatalogFilterFields } from "./CatalogFilterFields";
import { STATUS_OPTIONS } from "@/lib/library";

type FilterKey = "search" | "console" | "sort" | "source" | "includeMods" | "hideInLibrary" | "status";

// "All Games" first/default - the old default (Site Games only) hid a
// custom-added game from search unless you knew to switch this, which was
// a recurring source of "why can't I find the game I just added" confusion.
const SOURCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "base", label: "Basic" },
  { value: "custom", label: "User Added" },
] as const;

// Shared by Explore and the Library so the two filter boxes can never drift
// apart. currentHideInLibrary is Explore-only - omit it (leave undefined) to
// hide that checkbox, since "hide games already in my library" is meaningless
// on the Library page itself.
type FilterBarProps<S extends string> = {
  consoles: string[];
  currentSearch: string;
  currentConsole: string;
  currentSort: S;
  sortOptions: { value: S; label: string }[];
  currentSource: string;
  currentIncludeMods: boolean;
  currentStatus: string;
  currentHideInLibrary?: boolean;
};

export function FilterBar<S extends string>({
  consoles,
  currentSearch,
  currentConsole,
  currentSort,
  sortOptions,
  currentSource,
  currentIncludeMods,
  currentStatus,
  currentHideInLibrary,
}: FilterBarProps<S>) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(overrides: Partial<Record<FilterKey, string>>) {
    const params = new URLSearchParams();
    const next = {
      search: currentSearch,
      console: currentConsole,
      sort: currentSort,
      source: currentSource,
      includeMods: currentIncludeMods ? "1" : "",
      hideInLibrary: currentHideInLibrary ? "1" : "",
      status: currentStatus,
      ...overrides,
    };
    if (next.search) params.set("search", next.search);
    if (next.console) params.set("console", next.console);
    if (next.sort) params.set("sort", next.sort);
    if (next.source && next.source !== "all") params.set("source", next.source);
    if (next.includeMods) params.set("includeMods", next.includeMods);
    if (next.hideInLibrary) params.set("hideInLibrary", next.hideInLibrary);
    if (next.status) params.set("status", next.status);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {/* Everything except "Displayed Games" lives in its own column so that
          box's height (it's tall - three stacked buttons) can't push these
          down. In a single shared flex-wrap row, wrapped siblings sit below
          the tallest item on the previous line, which meant the checkboxes
          ended up below the bottom of "Displayed Games" instead of right
          under the (much shorter) controls row. */}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
          <CatalogFilterFields
            consoles={consoles}
            search={currentSearch}
            onSearchChange={(value) => navigate({ search: value })}
            console={currentConsole}
            onConsoleChange={(value) => navigate({ console: value })}
            sort={currentSort}
            onSortChange={(value) => navigate({ sort: value })}
            sortOptions={sortOptions}
          />

          <select
            value={currentStatus}
            onChange={(e) => navigate({ status: e.target.value })}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={currentIncludeMods}
              onChange={(e) => navigate({ includeMods: e.target.checked ? "1" : "" })}
            />
            Include Mods/Hacks
          </label>

          {currentHideInLibrary !== undefined && (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={currentHideInLibrary}
                onChange={(e) => navigate({ hideInLibrary: e.target.checked ? "1" : "" })}
              />
              Hide games already in my library
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-3 py-2">
        <span className="text-xs text-zinc-400">Displayed Games</span>
        <div className="flex flex-col gap-1.5">
          {SOURCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={currentSource === option.value}
              onClick={() => navigate({ source: option.value })}
              className={`rounded-full border px-4 py-1 text-xs font-medium transition-colors ${
                currentSource === option.value
                  ? "border-emerald-600 bg-emerald-900/40 text-emerald-300"
                  : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
