import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache client delle pagine dinamiche: tornare su una tab già vista è istantaneo
  experimental: {
    staleTimes: {
      dynamic: 45,
      static: 180,
    },
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
