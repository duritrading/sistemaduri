// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/pages/:path*',
      },
    ];
  },
};

module.exports = nextConfig;