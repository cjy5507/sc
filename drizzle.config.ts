import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// .env 파일에서 환경 변수 로드
dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

// URL에서 연결 정보 파싱
const url = new URL(process.env.POSTGRES_URL);
const host = url.hostname;
const port = parseInt(url.port) || 5432;
const database = url.pathname.slice(1);
const auth = url.username ? {
  user: url.username,
  password: url.password,
} : undefined;

// 데이터베이스 연결 및 마이그레이션 설정
export default {
  schema: './db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host,
    port,
    database,
    user: auth?.user,
    password: auth?.password,
    ssl: true
  },
  // 마이그레이션을 안전하게 실행하기 위한 옵션
  strict: true,
  verbose: true,
} satisfies Config;
