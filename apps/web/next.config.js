/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@agroconnect/shared'],
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
