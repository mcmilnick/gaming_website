"use client";

import { useEffect, useState } from "react";

// Every console name in the catalog, from /api/consoles. Cheap (one short
// list) and only changes when platforms are added, so it's fetched once per
// page load instead of deriving it from the whole catalog.
export function useCatalogConsoles() {
  const [consoles, setConsoles] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/consoles")
      .then((res) => res.json())
      .then((data: string[]) => {
        if (!cancelled) setConsoles(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { consoles: consoles ?? [], hydrated: consoles !== null };
}
