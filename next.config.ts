import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from local network IPs
  allowedDevOrigins: ['100.121.0.95'],
};

export default nextConfig;
