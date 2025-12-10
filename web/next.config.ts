import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rewrite removido - o nginx já faz proxy de /api/ para o backend
  // O código cliente usa URL relativa que vai direto para o nginx
};

export default nextConfig;
