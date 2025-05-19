import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// .env 파일에서 환경 변수 로드
dotenv.config();

// 데이터베이스 연결 및 마이그레이션 설정
export default {
  schema: './db/schema.ts',
  out: './drizzle',
  // @ts-ignore - 타입 오류 무시
  driver: 'pg',
  dbCredentials: {
    // @ts-ignore - 타입 오류 무시
    url: process.env.POSTGRES_URL || '',
  },
} satisfies Config;
