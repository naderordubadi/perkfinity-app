/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : 'export',
  trailingSlash: true,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
