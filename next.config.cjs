/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 정적 내보내기 활성화
  distDir: 'out', // 빌드 출력 디렉토리 설정
  images: {
    unoptimized: true, // 정적 내보내기 시 이미지 최적화 비활성화
  },
  // basePath: '/rolex', // 필요시 basePath 설정
  // assetPrefix: './', // 상대 경로로 에셋 로드
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
