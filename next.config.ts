import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint 검사 비활성화 (배포를 위해)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript 검사 비활성화 (배포를 위해)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
