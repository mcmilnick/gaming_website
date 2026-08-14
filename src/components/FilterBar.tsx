"use client";

import { usePathname, useRouter } from "next/navigation";
import { CatalogFilterFields } from "./CatalogFilterFields";
import { STATUS_OPTIONS } from "@/lib/library";

type FilterKey = "search" | "console" | "sort" | "source" | "includeMods" | "hideInLibrary" | "status";

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
    if (next.source && next.source !== "base") params.set("source", next.source);
    if (next.includeMods) params.set("includeMods", next.includeMods);
    if (next.hideInLibrary) params.set("hideInLibrary", next.hideInLibrary);
    if (next.status) params.set("status", next.status);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
        defaultValue={currentSource}
        onChange={(e) => navigate({ source: e.target.value })}
        className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
      >
        <option value="base">Site Games</option>
        <option value="custom">My Added Games</option>
        <option value="all">Site Games + Mine</option>
      </select>

      <select
        defaultValue={currentStatus}
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

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            defaultChecked={currentIncludeMods}
            onChange={(e) => navigate({ includeMods: e.target.checked ? "1" : "" })}
          />
          Include Homebrew/Mods/Hacks
        </label>

        {currentHideInLibrary !== undefined && (
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              defaultChecked={currentHideInLibrary}
              onChange={(e) => navigate({ hideInLibrary: e.target.checked ? "1" : "" })}
            />
            Hide games already in my library
          </label>
        )}
      </div>
    </div>
  );
}
