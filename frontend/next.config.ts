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
        pathname: "/static/images/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/static/videos/**",
      },
      {
        protocol: "https",
        hostname: "pub-472ee4560a3c493a97125023eb526232.r2.dev",
        pathname: "/**",
      },
    ],
  },

  // 👇 CORRECT SETUP: Top-level, NO 'http://'
  allowedDevOrigins: ["172.28.250.214:3000"],
};

export default nextConfig;
