import type { LibraryStatus } from "@/lib/library";

// A quiet visual cue for a list entry's Library play status - only Playing
// and Backlog get a treatment; Completed/Dropped/unknown stay blank so the
// row stays clean.
export function StatusPole({ status }: { status: LibraryStatus | undefined }) {
  if (status === "playing") {
    return (
      <div
        className="h-10 w-4 flex-shrink-0 rounded-sm"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #facc15 0px, #facc15 6px, #18181b 6px, #18181b 12px)",
        }}
        title="Playing"
        aria-label="Playing"
      />
    );
  }

  if (status === "want") {
    return (
      <div className="relative h-10 w-4 flex-shrink-0 rounded-sm bg-red-600" title="Backlog" aria-label="Backlog">
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none text-black">
          ✕
        </span>
      </div>
    );
  }

  return <div className="h-10 w-4 flex-shrink-0" aria-hidden="true" />;
}
