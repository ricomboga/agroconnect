/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@agroconnect/shared', '@agroconnect/web-auth'],
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
