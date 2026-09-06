"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { hasInAppHistory } from "@/components/NavigationDepthTracker";

// A real "back to wherever you came from" control, instead of a hardcoded
// destination. A game reached from a List should return to that List; one
// reached from Explore should return to Explore (search/filters and all) -
// no fixed href can know that in advance. Falls back to `fallbackHref` when
// there's no in-app history to return to (a fresh tab, a shared link
// opened directly) - `router.back()` would otherwise do nothing or leave
// the site entirely, landing on whatever the browser's actual previous
// page was.
export function BackLink({
  fallbackHref,
  children,
  className = "text-sm text-zinc-400 hover:text-zinc-200",
}: {
  fallbackHref: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (hasInAppHistory()) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Link href={fallbackHref} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
