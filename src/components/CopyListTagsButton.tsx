"use client";

import { useState } from "react";
import { formatNoteTags } from "@/lib/noteTags";

export function CopyListTagsButton({ tags }: { tags: { name: string; value: string | null }[] }) {
  const [copied, setCopied] = useState(false);

  if (tags.length === 0) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatNoteTags(tags));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) - nothing
      // more useful to do for a prototype than leave the button unchanged.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex-shrink-0 text-xs text-zinc-400 hover:text-zinc-100"
    >
      {copied ? "Copied!" : "Copy tags"}
    </button>
  );
}
