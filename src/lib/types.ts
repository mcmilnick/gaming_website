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
};
