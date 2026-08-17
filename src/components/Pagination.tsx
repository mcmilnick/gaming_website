"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

type PageEntry = number | "ellipsis";

// Up to 4 pages before and after the current one, plus the first and last
// page always shown (with an ellipsis bridging any real gap) - a standard
// windowed pagination.
function getPageWindow(current: number, total: number): PageEntry[] {
  const windowStart = Math.max(current - 4, 1);
  const windowEnd = Math.min(current + 4, total);
  const pages: PageEntry[] = [];

  if (windowStart > 1) {
    pages.push(1);
    if (windowStart > 2) pages.push("ellipsis");
  }

  for (let p = windowStart; p <= windowEnd; p++) pages.push(p);

  if (windowEnd < total) {
    if (windowEnd < total - 1) pages.push("ellipsis");
    pages.push(total);
  }

  return pages;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  const router = useRouter();
  const [jumpValue, setJumpValue] = useState("");

  if (totalPages <= 1) return null;

  const pageWindow = getPageWindow(page, totalPages);

  function handleJumpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = Number(jumpValue);
    if (!Number.isFinite(parsed) || jumpValue.trim() === "") return;
    const target = Math.min(Math.max(Math.round(parsed), 1), totalPages);
    setJumpValue("");
    router.push(buildHref(target));
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-8">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Previous
        </Link>
      )}

      {pageWindow.map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-sm text-zinc-600">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={`rounded border px-3 py-2 text-sm ${
              entry === page
                ? "border-emerald-700 bg-emerald-900/40 text-emerald-300"
                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {entry}
          </Link>
        )
      )}

      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Next
        </Link>
      )}

      <form onSubmit={handleJumpSubmit} className="relative ml-16">
        <label
          htmlFor="jumpToPage"
          className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-zinc-500"
        >
          Type Page #
        </label>
        <input
          id="jumpToPage"
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          className="w-16 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-center text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
        />
      </form>
    </div>
  );
}
