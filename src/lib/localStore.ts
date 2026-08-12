// A small localStorage-backed collection store, used for anything that needs
// to persist an array of records per-browser and stay in sync across tabs
// (via the "storage" event) and within a tab (via a custom change event).
// Shared by the Library and the user-added Custom Games catalog.
//
// `migrate`, if given, runs once per item every time the store is (re)loaded
// from raw localStorage - e.g. to backfill a field added after some records
// were already saved. It must not run per read (only on load into `cache`),
// since useSyncExternalStore requires getSnapshot to return a stable
// reference between store changes.
export function createLocalStore<T>(storageKey: string, changeEvent: string, migrate?: (item: T) => T) {
  let cache: T[] | null = null;

  function parseFromStorage(): T[] {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const items: T[] = Array.isArray(parsed) ? parsed : [];
      return migrate ? items.map(migrate) : items;
    } catch {
      return [];
    }
  }

  function readAll(): T[] {
    if (typeof window === "undefined") return [];
    if (!cache) cache = parseFromStorage();
    return cache;
  }

  function writeAll(items: T[]): void {
    cache = items;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    window.dispatchEvent(new Event(changeEvent));
  }

  function subscribe(callback: () => void): () => void {
    function handleChange() {
      cache = null;
      callback();
    }
    window.addEventListener(changeEvent, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(changeEvent, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }

  return { readAll, writeAll, subscribe };
}
