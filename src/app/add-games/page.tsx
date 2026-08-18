import { Suspense } from "react";
import { AddGamesForm } from "@/components/AddGamesForm";

export default function AddGamesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-8 text-zinc-500">Loading…</div>}>
      <AddGamesForm />
    </Suspense>
  );
}
