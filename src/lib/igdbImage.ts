// Swaps an IGDB cover URL's size segment (e.g. t_cover_big, 227x320) for
// t_cover_small (90x128) - IGDB does this resizing for free, so a small
// on-page render (a list row, a preview) doesn't need Vercel's Image
// Optimization to shrink a much bigger source image. Pair with the
// `unoptimized` prop on <Image> so Vercel's optimizer is skipped entirely
// for these, rather than just requesting a smaller transform of it -
// Image Optimization Transformations are a metered, capped resource (see
// next.config.ts), and it's these small/thumbnail renders specifically
// that Vercel's own guidance says aren't worth running through it.
//
// Custom (user-added) games can have any arbitrary cover URL pasted in by
// the user, which won't match this pattern - returned unchanged in that
// case. Combined with `unoptimized`, that means a custom game's preview is
// shown at its original size/weight rather than resized - an acceptable
// trade since custom games are a handful per user, not the ~150k-image
// catalog this exists to protect the quota for.
const IGDB_SIZE_SEGMENT = /\/t_[a-z0-9_]+\//;

export function igdbCoverSmall(coverUrl: string | null | undefined): string | null {
  if (!coverUrl) return null;
  if (!coverUrl.includes("images.igdb.com")) return coverUrl;
  return coverUrl.replace(IGDB_SIZE_SEGMENT, "/t_cover_small/");
}
