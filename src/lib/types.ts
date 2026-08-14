export type GameRecord = {
  id: string;
  title: string;
  console: string;
  developer: string | null;
  publisher: string | null;
  releaseJapan: string | null;
  releaseNA: string | null;
  releasePAL: string | null;
  releaseYear: number | null;
  coverUrl: string | null;
  // True for ROM hacks/mods (IGDB game_type Mod or Fork). Doesn't catch
  // original homebrew - see scripts/fetch-igdb-games.js for why.
  isModOrHack: boolean;
};
