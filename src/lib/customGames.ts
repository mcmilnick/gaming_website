import { createLocalStore } from "./localStore";
import type { GameRecord } from "./types";

// User-added games get ids in this namespace so they can never collide with
// the base catalog's Wikipedia-derived slugs.
const CUSTOM_ID_PREFIX = "custom-";

export type CustomGameInput = {
  title: string;
  console: string;
  developer: string | null;
  publisher: string | null;
  releaseYear: number | null;
};

const store = createLocalStore<GameRecord>("retroexplore:customGames:v1", "retroexplore:customGames:change");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isCustomGameId(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX);
}

export function getCustomGames(): GameRecord[] {
  return store.readAll();
}

export function subscribeToCustomGames(callback: () => void): () => void {
  return store.subscribe(callback);
}

export function replaceCustomGames(games: GameRecord[]): void {
  store.writeAll(games);
}

export function addCustomGame(input: CustomGameInput): GameRecord {
  const games = store.readAll();
  const id = `${CUSTOM_ID_PREFIX}${slugify(input.title)}-${Date.now().toString(36)}`;
  const game: GameRecord = {
    id,
    title: input.title,
    console: input.console,
    developer: input.developer,
    publisher: input.publisher,
    releaseJapan: null,
    releaseNA: null,
    releasePAL: null,
    releaseYear: input.releaseYear,
  };
  store.writeAll([...games, game]);
  return game;
}

export function removeCustomGame(id: string): void {
  store.writeAll(store.readAll().filter((game) => game.id !== id));
}
