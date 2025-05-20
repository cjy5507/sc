// 사용자 프로필 타입 정의
export interface IUserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

// 스토어 선호도 타입 정의
export interface IStorePreference {
  storeId: string;
  name: string;
  isFavorite: boolean;
  lastVisited?: Date;
}

// 시계 관심사 타입 정의
export interface IWatchInterest {
  model: string;
  referenceNumber: string;
  interestLevel: 'low' | 'medium' | 'high';
  notes?: string;
}

// 예약 목적 타입 정의
export type AppointmentPurpose = 'purchase' | 'service' | 'consultation' | 'other';

// 스토어별 설정 타입 정의
export interface IStoreSpecificSettings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
}

// 예약 프로필 타입 정의
export interface IReservationProfile {
  id: string;
  userId: string;
  storePreferences: IStorePreference[];
  watchInterests: IWatchInterest[];
  appointmentPurpose: AppointmentPurpose;
  storeSpecificSettings: Record<string, IStoreSpecificSettings>;
  createdAt: Date;
  updatedAt: Date;
}

// 애플리케이션 설정 타입 정의
export interface IAppSettings {
  version: string;
  firstRun: boolean;
  analyticsEnabled: boolean;
  lastBackup?: Date;
}
