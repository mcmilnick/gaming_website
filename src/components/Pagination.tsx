import Link from "next/link";

type PaginationProps = {
  page: number;
  hasNext: boolean;
  buildHref: (page: number) => string;
};

export function Pagination({ page, hasNext, buildHref }: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-8">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
          Previous
        </Link>
      ) : (
        <span className="rounded border border-zinc-800 px-4 py-2 text-sm text-zinc-600">Previous</span>
      )}
      <span className="text-sm text-zinc-400">Page {page}</span>
      {hasNext ? (
        <Link href={buildHref(page + 1)} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
          Next
        </Link>
      ) : (
        <span className="rounded border border-zinc-800 px-4 py-2 text-sm text-zinc-600">Next</span>
      )}
    </div>
  );
}
