/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows an isolated production build while a local dev server is running.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

module.exports = nextConfig
