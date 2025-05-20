import { Page } from 'playwright';
import { BaseAutomationEngine } from '../BaseAutomationEngine';
import { AutomationResult, StoreConfig } from '../../types/automation.types';

export class UnopangyoEngine extends BaseAutomationEngine {
  private static readonly SELECTORS = {
    // 우노와치 매장의 실제 DOM 요소 선택자들로 업데이트 필요
    BOOKING_OPTION: '.booking-wrapper .booking-option',
    DATE_PICKER: 'input[type="date"]',
    TIME_SLOT: '.time-slot-available',
    NAME_INPUT: 'input[name="customerName"]',
    PHONE_INPUT: 'input[name="phoneNumber"]',
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

      // 1. 예약 옵션 선택
      await this.selectBookingOption();
      this.updateProgress('Booking option selected', 30);

      // 2. 날짜 선택 단계
      await this.selectDate();
      this.updateProgress('Date selected', 45);

      // 3. 시간 선택 단계
      await this.selectTime();
      this.updateProgress('Time selected', 60);

      // 4. 개인정보 입력 단계
      await this.fillPersonalInfo();
      this.updateProgress('Personal info filled', 80);

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

  private async selectBookingOption(): Promise<void> {
    if (!this.page) return;
    
    try {
      // 예약 목적 선택 (예: 롤렉스 시계 구매 상담)
      const bookingOption = await this.page.$(UnopangyoEngine.SELECTORS.BOOKING_OPTION);
      if (bookingOption) {
        await bookingOption.click();
        await this.waitForRandomDelay();
      }
    } catch (error) {
      console.error('Error selecting booking option:', error);
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
      const timeSlot = await this.page.$(UnopangyoEngine.SELECTORS.TIME_SLOT);
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

      await this.page.fill(UnopangyoEngine.SELECTORS.NAME_INPUT, userInfo.name);
      await this.waitForRandomDelay();
      
      await this.page.fill(UnopangyoEngine.SELECTORS.PHONE_INPUT, userInfo.phone);
      await this.waitForRandomDelay();
      
      await this.page.fill(UnopangyoEngine.SELECTORS.EMAIL_INPUT, userInfo.email);
      await this.waitForRandomDelay();
    } catch (error) {
      console.error('Error filling personal info:', error);
      throw error;
    }
  }

  private async submitForm(): Promise<void> {
    if (!this.page) return;
    
    try {
      const submitButton = await this.page.$(UnopangyoEngine.SELECTORS.SUBMIT_BUTTON);
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
      const confirmation = await this.page.$(UnopangyoEngine.SELECTORS.CONFIRMATION_MESSAGE);
      return !!confirmation;
    } catch (error) {
      console.error('Error verifying completion:', error);
      return false;
    }
  }
}
