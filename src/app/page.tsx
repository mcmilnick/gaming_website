import { Suspense } from "react";
import { ExploreBrowser } from "@/components/ExploreBrowser";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-zinc-500">Loading…</div>}>
      <ExploreBrowser />
    </Suspense>
  );
}
