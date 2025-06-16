import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src'],
    // Ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;