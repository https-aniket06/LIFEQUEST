/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint runs separately in CI via `npm run lint`; don't let it block prod builds.
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
