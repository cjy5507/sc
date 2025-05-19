// 공통 인터페이스 및 타입 정의

// 사용자 인터페이스
export interface IUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  createdAt: Date;
  lastActivity: Date;
}

// 사용자 세션 인터페이스
export interface IUserSession {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo: IDeviceInfo;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

// 디바이스 정보 인터페이스
export interface IDeviceInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  osVersion: string;
  browser: string;
  ipAddress: string;
  lastLogin: Date;
}

// 예약 프로필 인터페이스
export interface IReservationProfile {
  id: string;
  userId: string;
  defaultInfo: {
    name: string;
    phone: string;
    email: string;
  };
  storePreferences: IStorePreference[];
}

// 매장 선호도 인터페이스
export interface IStorePreference {
  storeId: string;
  enabled: boolean;
  purpose: string;
  priority: number;
}

// 예약 프로세스 인터페이스
export interface IReservationProcess {
  id: string;
  userId: string;
  stores: IStoreProcess[];
  startTime: Date;
  endTime?: Date;
  overallStatus: ReservationStatus;
  logs: string[];
}

// 매장 프로세스 인터페이스
export interface IStoreProcess {
  storeId: string;
  status: ReservationStatus;
  stage: ReservationStage;
  progress: number;
  lastActivity: Date;
  result?: string;
  error?: string;
}

// 대시보드 상태 인터페이스
export interface IDashboardState {
  activeReservation?: string;
  storeStatuses: IStoreStatus[];
  overallProgress: number;
  currentAuthStore?: string;
  estimatedCompletion?: Date;
}

// 매장 상태 인터페이스
export interface IStoreStatus {
  storeId: string;
  displayName: string;
  status: ReservationStatus;
  stage: ReservationStage;
  progress: number;
  requiresAttention: boolean;
  message?: string;
}

// 예약 상태 타입
export type ReservationStatus = 'idle' | 'waiting' | 'processing' | 'success' | 'failed';

// 예약 단계 타입
export type ReservationStage = 'selection' | 'agreement' | 'date_selection' | 'pass_auth' | 'form' | 'confirmation' | 'complete';

// 매장 정보 인터페이스
export interface IStore {
  id: string;
  name: string;
  displayName: string;
  url: string;
  selectors: {
    purposeCard: string;
    dateSelector: string;
    timeSelector: string;
    agreementCheckbox: string;
    submitButton: string;
  };
}
