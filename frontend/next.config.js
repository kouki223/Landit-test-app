/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a standalone server bundle for a small Docker runtime image.
  output: 'standalone',
};

module.exports = nextConfig;
