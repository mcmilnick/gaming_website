import { Suspense } from "react";
import { LibraryBrowser } from "@/components/LibraryBrowser";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-zinc-500">Loading…</div>}>
      <LibraryBrowser />
    </Suspense>
  );
}
