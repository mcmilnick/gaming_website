import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The catalog is fetched at runtime (see src/lib/gamesStore.ts)
        // instead of being bundled into the JS, specifically so it can be
        // cached on its own - a code deploy that doesn't touch game data
        // shouldn't force everyone to re-download 20+MB of it. It only
        // actually changes when a maintainer reruns the IGDB fetch script,
        // so a day of hard caching plus a week of background revalidation
        // is a safe tradeoff between freshness and repeat-visit cost.
        source: "/games.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
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
