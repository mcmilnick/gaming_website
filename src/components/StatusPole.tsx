import type { LibraryStatus } from "@/lib/library";

// A quiet visual cue for a list entry's Library play status - only Playing,
// Backlog, and Dropped get a treatment; Completed/unknown stay blank so the
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

  if (status === "abandoned") {
    return (
      <div
        className="h-10 w-4 flex-shrink-0 rounded-sm"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35), transparent 55%)," +
            "radial-gradient(ellipse at 65% 55%, rgba(255,255,255,0.2), transparent 50%)," +
            "radial-gradient(ellipse at 40% 85%, rgba(255,255,255,0.25), transparent 55%)," +
            "linear-gradient(180deg, #71717a, #52525b)",
        }}
        title="Dropped"
        aria-label="Dropped"
      />
    );
  }

  return <div className="h-10 w-4 flex-shrink-0" aria-hidden="true" />;
}
