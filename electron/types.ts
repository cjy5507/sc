import { Browser, BrowserContext, Page } from 'playwright';

/**
 * 스토어 설정 타입
 */
export interface StoreConfig {
  name?: string;
  phone?: string;
  message?: string;
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
}

/**
 * 자동화 과정 상태 타입
 */
export type AutomationStatus = 'pending' | 'running' | 'completed' | 'error' | 'stopped';

/**
 * 자동화 결과 타입
 */
export interface AutomationResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
}

/**
 * 자동화 프로세스 타입
 */
export interface AutomationProcess {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  abortController?: AbortController;
  stopped?: boolean;
  status?: AutomationStatus;
  message?: string;
  startTime?: Date;
  endTime?: Date;
} 