import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

// Vercel Postgres 클라이언트를 사용하여 DrizzleORM 인스턴스 생성
export const db = drizzle(sql, { schema });

// 타입 내보내기
export type DbClient = typeof db;
