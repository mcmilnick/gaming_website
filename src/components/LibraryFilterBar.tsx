"use client";

import { usePathname, useRouter } from "next/navigation";
import { CatalogFilterFields } from "./CatalogFilterFields";
import { STATUS_OPTIONS, LIBRARY_SORT_OPTIONS, type LibrarySortOption } from "@/lib/library";

type LibraryFilterBarProps = {
  consoles: string[];
  currentSearch: string;
  currentConsole: string;
  currentSort: LibrarySortOption;
  currentStatus: string;
};

export function LibraryFilterBar({
  consoles,
  currentSearch,
  currentConsole,
  currentSort,
  currentStatus,
}: LibraryFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(overrides: Partial<Record<"search" | "console" | "sort" | "status", string>>) {
    const params = new URLSearchParams();
    const next = {
      search: currentSearch,
      console: currentConsole,
      sort: currentSort,
      status: currentStatus,
      ...overrides,
    };
    if (next.search) params.set("search", next.search);
    if (next.console) params.set("console", next.console);
    if (next.sort) params.set("sort", next.sort);
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
        sortOptions={LIBRARY_SORT_OPTIONS}
      />

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
    </div>
  );
}
