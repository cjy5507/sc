import { Page } from 'playwright';
import { BaseAutomationEngine } from '../BaseAutomationEngine';
import { AutomationResult, StoreConfig } from '../../types/automation.types';

export class ChronodigmEngine extends BaseAutomationEngine {
  private static readonly SELECTORS = {
    // 크로노다임 매장의 실제 DOM 요소 선택자들로 업데이트 필요
    DATE_PICKER: 'input[type="date"]',
    TIME_SLOT: '.time-slot',
    NAME_INPUT: 'input[name="name"]',
    PHONE_INPUT: 'input[name="phone"]',
    EMAIL_INPUT: 'input[name="email"]',
    SUBMIT_BUTTON: 'button[type="submit"]',
    CONFIRMATION_MESSAGE: '.confirmation-message'
  };

  constructor(storeConfig: StoreConfig) {
    super(storeConfig);
  }

  async start(): Promise<AutomationResult> {
    if (!this.page) {
      return { success: false, message: 'Page not initialized' };
    }

    try {
      this.isRunning = true;
      this.updateProgress('Starting automation', 20);

      // 1. 목적 선택 단계
      await this.selectPurpose();
      this.updateProgress('Purpose selected', 30);

      // 2. 날짜 선택 단계
      await this.selectDate();
      this.updateProgress('Date selected', 40);

      // 3. 시간 선택 단계
      await this.selectTime();
      this.updateProgress('Time selected', 50);

      // 4. 개인정보 입력 단계
      await this.fillPersonalInfo();
      this.updateProgress('Personal info filled', 70);

      // 5. 제출 및 확인 단계
      await this.submitForm();
      this.updateProgress('Form submitted', 90);

      // 6. 최종 확인
      const success = await this.verifyCompletion();
      if (success) {
        this.updateProgress('Reservation completed', 100, 'completed');
        return { success: true, message: 'Reservation completed successfully' };
      } else {
        throw new Error('Failed to verify reservation completion');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during automation';
      this.updateProgress(`Error: ${errorMessage}`, this.progress.progress, 'failed');
      return { 
        success: false, 
        message: `Automation failed: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    }
  }

  private async selectPurpose(): Promise<void> {
    if (!this.page) return;
    
    try {
      // 목적 선택 (예: 롤렉스 시계 구매 상담)
      // PURPOSE_SELECTION: '.fappointment .purpose-card', // purpose-card 관련 코드 완전 삭제
    } catch (error) {
      console.error('Error selecting purpose:', error);
      throw error;
    }
  }

  private async selectDate(): Promise<void> {
    if (!this.page) return;
    
    try {
      // 다음 달로 이동 (현재 월의 예약이 가득 찼을 경우를 대비)
      await this.page.click('button.next-month');
      await this.waitForRandomDelay();
      
      // 첫 번째 사용 가능한 날짜 선택
      const availableDate = await this.page.$('.available-date:not(.disabled)');
      if (availableDate) {
        await availableDate.click();
        await this.waitForRandomDelay();
      }
    } catch (error) {
      console.error('Error selecting date:', error);
      throw error;
    }
  }

  private async selectTime(): Promise<void> {
    if (!this.page) return;
    
    try {
      // 첫 번째 사용 가능한 시간대 선택
      const timeSlot = await this.page.$(ChronodigmEngine.SELECTORS.TIME_SLOT);
      if (timeSlot) {
        await timeSlot.click();
        await this.waitForRandomDelay();
      }
    } catch (error) {
      console.error('Error selecting time:', error);
      throw error;
    }
  }

  private async fillPersonalInfo(): Promise<void> {
    if (!this.page) return;
    
    try {
      // 사용자 정보 입력 (실제 값은 설정에서 가져와야 함)
      const userInfo = {
        name: '홍길동', // 실제 사용자 정보로 대체
        phone: '01012345678',
        email: 'user@example.com'
      };

      await this.page.fill(ChronodigmEngine.SELECTORS.NAME_INPUT, userInfo.name);
      await this.waitForRandomDelay();
      
      await this.page.fill(ChronodigmEngine.SELECTORS.PHONE_INPUT, userInfo.phone);
      await this.waitForRandomDelay();
      
      await this.page.fill(ChronodigmEngine.SELECTORS.EMAIL_INPUT, userInfo.email);
      await this.waitForRandomDelay();
    } catch (error) {
      console.error('Error filling personal info:', error);
      throw error;
    }
  }

  private async submitForm(): Promise<void> {
    if (!this.page) return;
    
    try {
      const submitButton = await this.page.$(ChronodigmEngine.SELECTORS.SUBMIT_BUTTON);
      if (submitButton) {
        await submitButton.click();
        await this.waitForRandomDelay(2000, 3000); // 제출 후 리다이렉트 대기
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  }

  private async verifyCompletion(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // 예약 완료 확인 메시지가 표시되는지 확인
      const confirmation = await this.page.$(ChronodigmEngine.SELECTORS.CONFIRMATION_MESSAGE);
      return !!confirmation;
    } catch (error) {
      console.error('Error verifying completion:', error);
      return false;
    }
  }
}
