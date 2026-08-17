import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The catalog is fetched at runtime (see src/lib/gamesStore.ts)
        // instead of being bundled into the JS, specifically so it can be
        // cached on its own - a code deploy that doesn't touch game data
        // shouldn't force everyone to re-download 20+MB of it. It's fetched
        // as games.json?v=<version>, where <version> is a content hash from
        // games-manifest.json below - since a given version's contents never
        // change, this is safe to cache as hard and long as possible. A data
        // refresh gets a new version/URL, so visitors never have to wait out
        // a stale cache window to see it (that's what plain time-based
        // caching here used to do, and it was a real, confusing bug).
        source: "/games.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // The manifest is tiny (one hash) and is what makes the above safe -
        // it must always be revalidated so the app can notice a new version
        // right away, never cached and silently served stale.
        source: "/games-manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache",
          },
        ],
      },
    ];
  },
  images: {
    // Wide open on hostname: users can paste a cover image URL from
    // anywhere when adding their own games (see Add Game). This is a
    // single-user local app - nobody else's content ever flows through
    // this, so there's no real multi-tenant risk in being permissive here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
