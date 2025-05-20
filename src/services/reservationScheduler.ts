import { Page } from 'playwright';
import { ChronodimePage } from '../lib/playwright/pages/ChronodimePage.js';
import { browserManager } from '../lib/playwright/browser/browserManager.js';

type StoreType = 'chronodigm' | 'unopangyo' | 'hyundai' | 'hongbo';

interface ReservationConfig {
  store: StoreType;
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // HH:MM
  userInfo: {
    name: string;
    phone: string;
    email: string;
    memo?: string;
  };
}

import { EventEmitter } from 'events';

export class ReservationScheduler extends EventEmitter {
  private page: Page | null = null;
  private reservationPage: ChronodimePage | null = null;
  private isRunning = false;
  private checkInterval = 1000 * 30; // 30초마다 확인
  private maxRetryCount = 5;
  private retryCount = 0;
  private checkTimer: NodeJS.Timeout | null = null;
  private status: {
    isRunning: boolean;
    lastError?: string;
    lastUpdate?: Date;
    progress?: string;
    store?: string;
    targetDate?: string;
    targetTime?: string;
  } = { isRunning: false };

  constructor(private config: ReservationConfig) {
    super();
    this.updateStatus({ isRunning: false });
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.updateStatus({
      isRunning: true,
      store: this.config.store,
      targetDate: this.config.targetDate,
      targetTime: this.config.targetTime,
      progress: '브라우저 초기화 중...'
    });
    
    try {
      // 브라우저 초기화
      await this.initializeBrowser();
      this.updateStatus({ progress: '예약 프로세스 시작 중...' });
      
      // 예약 시작
      await this.startReservationProcess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('예약 프로세스 시작 중 오류 발생:', error);
      this.updateStatus({ 
        isRunning: false, 
        lastError: errorMessage,
        progress: `오류 발생: ${errorMessage}`
      });
      await this.cleanup();
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    await this.cleanup();
  }

  private async initializeBrowser() {
    await browserManager.launch({ 
      headless: false,
      slowMo: 100
    });
    
    await browserManager.createContext();
    this.page = await browserManager.newPage();
    this.reservationPage = new ChronodimePage(this.page, this.config.store);
    
    // 기본 타임아웃 설정
    this.page.setDefaultTimeout(30000);
  }

  // 상태 업데이트 및 이벤트 발생
  private updateStatus(updates: Partial<typeof this.status>) {
    this.status = { ...this.status, ...updates, lastUpdate: new Date() };
    this.emit('status', this.status);
  }

  // 현재 상태 반환
  getStatus() {
    return this.status;
  }

  private async startReservationProcess() {
    if (!this.page || !this.reservationPage) {
      const error = new Error('브라우저가 초기화되지 않았습니다.');
      this.updateStatus({ 
        isRunning: false, 
        lastError: error.message,
        progress: '브라우저 초기화 실패'
      });
      throw error;
    }

    this.updateStatus({ progress: '예약 프로세스를 시작합니다...' });
    
    try {
      // 매월 말일 자정까지 대기
      await this.waitUntilReservationTime();
      
      // 예약 시도
      await this.attemptReservation();
    } catch (error) {
      console.error('예약 시도 중 오류 발생:', error);
      await this.handleRetry();
    }
  }

  private async waitUntilReservationTime() {
    const targetDate = new Date(this.config.targetDate);
    targetDate.setHours(0, 0, 0, 0); // 자정으로 설정
    
    const now = new Date();
    const waitTime = targetDate.getTime() - now.getTime();
    
    if (waitTime > 0) {
      const message = `예약 오픈 시간(${targetDate.toLocaleString()})까지 대기 중...`;
    console.log(message);
    this.updateStatus({ progress: message });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private async attemptReservation() {
    if (!this.page || !this.reservationPage) return;
    
    try {
      this.updateStatus({ progress: '예약을 시도합니다...' });
      
      // 1. 예약 페이지로 이동
      await this.reservationPage.navigate();
      
      // 2. CAPTCHA/PASS 인증 확인 (사용자 입력 대기)
      await this.waitForHumanVerification();
      
      // 3. 예약 단계 진행
      await this.reservationPage.selectPurpose('롤렉스 구매');
      await this.reservationPage.selectDate(this.config.targetDate);
      await this.reservationPage.selectTime(this.config.targetTime);
      
      // 4. 개인정보 입력 및 제출
    this.updateStatus({ progress: '예약 정보 제출 중...' });
    const result = await this.reservationPage.submitReservation(this.config.userInfo);
    
    const successMessage = '예약이 완료되었습니다.';
    console.log(successMessage, result);
    this.updateStatus({ 
      progress: successMessage,
      isRunning: false
    });
    
    await this.cleanup();
    } catch (error) {
      console.error('예약 시도 실패:', error);
      await this.handleRetry();
    }
  }

  private async waitForHumanVerification() {
    if (!this.page) return;
    
    const authMessage = 'CAPTCHA/PASS 인증이 필요합니다. 수동으로 진행해주세요...';
    console.log(authMessage);
    this.updateStatus({ progress: authMessage });
    
    // 인증이 완료될 때까지 대기 (예: 특정 요소가 사라질 때까지)
    await this.page.waitForSelector('.captcha-container', { state: 'hidden', timeout: 0 });
    const completeMessage = '인증이 완료되었습니다. 자동화를 계속합니다...';
    console.log(completeMessage);
    this.updateStatus({ progress: completeMessage });
  }

  private async handleRetry() {
    if (this.retryCount >= this.maxRetryCount) {
      const message = '최대 재시도 횟수를 초과했습니다.';
    console.error(message);
    this.updateStatus({ 
      isRunning: false, 
      lastError: message,
      progress: message
    });
      await this.stop();
      return;
    }
    
    this.retryCount++;
    const message = `재시도 중... (${this.retryCount}/${this.maxRetryCount})`;
    console.log(message);
    this.updateStatus({ progress: message });
    
    // 일정 시간 후에 다시 시도
    this.checkTimer = setTimeout(() => {
      this.attemptReservation();
    }, this.checkInterval);
  }

  private async cleanup() {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    
    if (this.page) {
      await this.page.close().catch(console.error);
      this.page = null;
    }
    
    this.reservationPage = null;
    this.isRunning = false;
    
    // 브라우저는 유지하고 페이지만 닫음
    await browserManager.closeContext();
  }
}

// 사용 예시:
/*
const scheduler = new ReservationScheduler({
  store: 'chronodigm',
  targetDate: '2025-05-31',
  targetTime: '14:00',
  userInfo: {
    name: '홍길동',
    phone: '01012345678',
    email: 'test@example.com',
    memo: '롤렉스 서브마리너 예약 희망'
  }
});

scheduler.start();
*/
