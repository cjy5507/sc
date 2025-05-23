import { Browser, BrowserContext, Page } from 'playwright';

/**
 * 스토어 설정 타입
 */
export interface StoreConfig {
  name: string;
  phone: string;
  email: string;
  message?: string;
  carrier?: string;
  testMode?: boolean;
  [key: string]: any;
}

/**
 * 스토어 정보 타입
 */
export interface Store {
  id: string;
  name: string;
  url: string;
  config: StoreConfig;
  username?: string;
  password?: string;
  selector?: string;
}

// 이전 인터페이스와의 호환성을 위한 타입 앨리어스
export type Config = StoreConfig;

/**
 * 자동화 상태 열거형
 */
export enum AutomationStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  WAITING = 'waiting',
  STOPPED = 'stopped',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * 자동화 결과 타입
 */
export interface AutomationResult {
  storeId: string;
  status: AutomationStatus | string;
  message?: string;
}

/**
 * 자동화 프로세스 타입
 */
export interface AutomationProcess {
  stopped: boolean;
  browser?: Browser;
  abortController: AbortController;
  context?: BrowserContext;
  page?: Page;
  status?: string;
  message?: string;
  startTime?: Date;
  endTime?: Date;
} 