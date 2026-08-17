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
  // 1-12, only set when IGDB actually knows the month (not a year-only date
  // padded out) - see scripts/fetch-igdb-games.js for how it's derived.
  releaseMonth: number | null;
  coverUrl: string | null;
  // True for ROM hacks/mods (IGDB game_type Mod or Fork). Doesn't catch
  // original homebrew - see scripts/fetch-igdb-games.js for why.
  isModOrHack: boolean;
};
