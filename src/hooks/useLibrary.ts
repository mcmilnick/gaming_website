"use client";

import { useSyncExternalStore } from "react";
import { getLibrary, subscribeToLibrary, type LibraryEntry } from "@/lib/library";

function getSnapshot(): LibraryEntry[] | null {
  return getLibrary();
}

function getServerSnapshot(): LibraryEntry[] | null {
  return null;
}

export function useLibrary() {
  const entries = useSyncExternalStore(subscribeToLibrary, getSnapshot, getServerSnapshot);
  return { entries: entries ?? [], hydrated: entries !== null };
}
