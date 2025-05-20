import { z } from 'zod';
import { 
  AppointmentPurpose, 
  IStoreSpecificSettings, 
  IWatchInterest 
} from '../types/settings';

// 공통 유효성 검사 메시지
const requiredError = { required_error: '필수 입력 항목입니다.' };

// 스토어 선호도 스키마
export const storePreferenceSchema = z.object({
  storeId: z.string(requiredError).min(1, '스토어 ID는 필수입니다.'),
  name: z.string(requiredError).min(1, '스토어 이름은 필수입니다.'),
  isFavorite: z.boolean().default(false),
  lastVisited: z.date().optional(),
});

// 시계 관심사 스키마
export const watchInterestSchema = z.object({
  model: z.string(requiredError).min(1, '모델명은 필수입니다.'),
  referenceNumber: z.string(requiredError).min(1, '레퍼런스 번호는 필수입니다.'),
  interestLevel: z.enum(['low', 'medium', 'high'], {
    required_error: '관심 수준을 선택해주세요.',
  }),
  notes: z.string().optional(),
});

// 스토어별 설정 스키마
export const storeSpecificSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
  }),
  language: z.string().default('ko-KR'),
  timezone: z.string().default('Asia/Seoul'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

// 예약 프로필 스키마
export const reservationProfileSchema = z.object({
  id: z.string().uuid('유효한 UUID 형식이어야 합니다.'),
  userId: z.string().uuid('유효한 사용자 ID 형식이어야 합니다.'),
  storePreferences: z.array(storePreferenceSchema).min(1, '최소 한 개 이상의 스토어 선호도가 필요합니다.'),
  watchInterests: z.array(watchInterestSchema).default([]),
  appointmentPurpose: z.nativeEnum({
    purchase: 'purchase',
    service: 'service',
    consultation: 'consultation',
    other: 'other',
  } as const, requiredError),
  storeSpecificSettings: z.record(storeSpecificSettingsSchema).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 애플리케이션 설정 스키마
export const appSettingsSchema = z.object({
  version: z.string().default('1.0.0'),
  firstRun: z.boolean().default(true),
  analyticsEnabled: z.boolean().default(true),
  lastBackup: z.date().optional(),
});

// 유틸리티 함수: 데이터 유효성 검사
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; error?: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n'),
    };
  }
  return { success: true, data: result.data };
}
