"use client";

import { useSyncExternalStore } from "react";
import { getLists, subscribeToLists } from "@/lib/lists";
import type { GameList } from "@/lib/lists";

function getSnapshot(): GameList[] | null {
  return getLists();
}

function getServerSnapshot(): GameList[] | null {
  return null;
}

export function useLists() {
  const lists = useSyncExternalStore(subscribeToLists, getSnapshot, getServerSnapshot);
  return { lists: lists ?? [], hydrated: lists !== null };
}
