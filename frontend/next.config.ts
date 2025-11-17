// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/static/images/**", // ✅ Images
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/static/videos/**", // ✅ Videos (separate object)
      },
    ],
  },
};

export default nextConfig;
