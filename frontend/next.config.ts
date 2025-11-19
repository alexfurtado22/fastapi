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

      // 👇 ADD THIS NEW BLOCK FOR R2
      {
        protocol: "https",
        hostname: "pub-472ee4560a3c493a97125023eb526232.r2.dev", // 👈 REPLACE with your actual R2 hostname
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
