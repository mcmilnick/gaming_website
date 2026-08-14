import type { NextConfig } from "next";

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
  },
};

export default nextConfig;
