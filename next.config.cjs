/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js와 Electron 통합을 위한 경로 설정
  output: 'export', // 정적 HTML로 내보내기 (Electron과 함께 사용)
  distDir: 'out', // 정적 빌드 출력 디렉토리 이름
  images: {
    unoptimized: true, // Electron에서는 이미지 최적화 불필요
  },
  // 개발 서버를 위한 설정
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
