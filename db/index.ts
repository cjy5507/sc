import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// 환경 변수에서 연결 문자열 가져오기
const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('POSTGRES_URL 환경 변수가 설정되지 않았습니다.');
}

// Neon DB 클라이언트 생성
const sql = neon(connectionString);

// Drizzle ORM 클라이언트 생성
export const db = drizzle(sql, { schema });

// 타입 내보내기
export type DbClient = typeof db;
