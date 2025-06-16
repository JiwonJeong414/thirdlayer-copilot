/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src'],
    // Ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig