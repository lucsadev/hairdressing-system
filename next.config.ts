import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@insforge/sdk'],
  // Exclude edge functions from Next.js build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Exclude functions directory from transpilation
  transpilePackages: [],
};