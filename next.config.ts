import type { NextConfig } from "next";
import { DATA_REFRESH_INTERVAL_SECONDS } from "./src/lib/dataRefreshCadence";

const nextConfig: NextConfig = {
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
    // Cover art only changes when the catalog is re-ingested, so there's no
    // reason to let Vercel's image cache (and the metered Image
    // Optimization Transformation it costs on every miss) expire faster
    // than the data itself does - see dataRefreshCadence.ts.
    minimumCacheTTL: DATA_REFRESH_INTERVAL_SECONDS,
  },
};

export default nextConfig;
