import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desabilitar Turbopack explicitamente
  experimental: {
    turbo: false,
  },
};

export default nextConfig;
