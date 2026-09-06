"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "retroexplore:navDepth";

// Tracks how many client-side page changes have happened in this tab, so
// BackLink can tell "there's a real in-app previous page" apart from "this
// is effectively a fresh visit". window.history.length can't be trusted for
// this - a brand-new page load with zero prior navigation was observed
// starting at history.length 2, not 1 (browser-specific baseline, not
// something safe to hardcode a threshold against) - so this counts
// navigations itself instead of trying to read the browser's ambiguous
// history depth. Mounted once in the root layout.
export function NavigationDepthTracker() {
  const pathname = usePathname();
  // Initialized directly from the first pathname seen (useRef's argument is
  // only used on the very first render), not a boolean "have I run yet"
  // latch - a boolean latch breaks under Strict Mode's dev-only double
  // effect invocation, since the second invocation would see the latch
  // already flipped and wrongly count as a real navigation. Comparing
  // actual values instead means both of Strict Mode's invocations compare
  // against the same still-matching pathname and correctly skip.
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    const current = Number(sessionStorage.getItem(STORAGE_KEY) ?? "0");
    sessionStorage.setItem(STORAGE_KEY, String(current + 1));
  }, [pathname]);

  return null;
}

// Read by BackLink: true once at least one real client-side navigation has
// happened since this tab loaded the app.
export function hasInAppHistory(): boolean {
  if (typeof window === "undefined") return false;
  return Number(sessionStorage.getItem(STORAGE_KEY) ?? "0") > 0;
}
