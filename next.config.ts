import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from local network IPs
  allowedDevOrigins: ['100.121.0.95'],
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/cash-management' : '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
