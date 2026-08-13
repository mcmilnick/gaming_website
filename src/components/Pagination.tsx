import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

type PageEntry = number | "ellipsis";

// Current page, then up to the next 4 page numbers, then (if there's a real
// gap) an ellipsis and the final page - a standard windowed pagination.
function getPageWindow(current: number, total: number): PageEntry[] {
  const windowEnd = Math.min(current + 4, total);
  const pages: PageEntry[] = [];
  for (let p = current; p <= windowEnd; p++) pages.push(p);

  if (windowEnd < total) {
    if (total - windowEnd > 1) pages.push("ellipsis");
    pages.push(total);
  }

  return pages;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageWindow = getPageWindow(page, totalPages);

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
    </div>
  );
}
