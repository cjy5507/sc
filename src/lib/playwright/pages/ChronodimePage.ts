import { Page } from 'playwright';
import { BasePage } from './BasePage';

type StoreType = 'chronodigm' | 'unopangyo' | 'hyundai' | 'hongbo';

const STORE_URLS = {
  chronodigm: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/',
  unopangyo: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
  hyundai: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/',
  hongbo: 'https://www.hongbowatch.co.kr/rolex/contact-busan/'
};

const STORE_SELECTORS = {
  chronodigm: {
    purposeSelector: 'select[name="purpose"], .purpose-selector',
    datePicker: 'input[type="date"]',
    timeSlot: '.time-slot',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  },
  unopangyo: {
    purposeSelector: 'select[name="purpose"], .purpose-selector',
    datePicker: 'input[type="date"]',
    timeSlot: '.time-slot',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  },
  hyundai: {
    purposeSelector: 'select[name="purpose"], .purpose-selector',
    datePicker: 'input[type="date"]',
    timeSlot: '.time-slot',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  },
  hongbo: {
    purposeSelector: 'select[name="purpose"], .purpose-selector',
    datePicker: 'input[type="date"]',
    timeSlot: '.time-slot',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  }
};

export class ChronodimePage extends BasePage {
  private storeType: StoreType;
  private selectors: typeof STORE_SELECTORS[keyof typeof STORE_SELECTORS];

  constructor(page: Page, storeType: StoreType = 'chronodigm') {
    super(page, STORE_URLS[storeType]);
    this.storeType = storeType;
    this.selectors = STORE_SELECTORS[storeType];
  }

  /**
   * 방문 목적 선택
   * @param purpose 방문 목적 (예: '롤렉스 구매')
   */
  async selectPurpose(purpose: string) {
    try {
      // 셀렉트 박스 찾기 시도
      const purposeSelector = await this.page.$(this.selectors.purposeSelector);
      
      if (purposeSelector) {
        // 셀렉트 박스인 경우
        await this.page.selectOption(this.selectors.purposeSelector, { label: purpose });
      } else {
        // 셀렉트 박스가 없는 경우, 다른 UI 요소를 찾아서 클릭
        // 예: 라디오 버튼 또는 버튼 클릭
        await this.page.click(`text="${purpose}"`);
      }
      
      // 목적 선택 후 잠시 대기
      await this.page.waitForTimeout(1000);
      
      console.log(`방문 목적 '${purpose}' 선택 완료`);
    } catch (error) {
      console.error(`방문 목적 선택 실패: ${error}`);
      // 예약 프로세스는 계속 진행
    }
  }

  /**
   * 예약 날짜 선택
   * @param date YYYY-MM-DD 형식의 날짜
   */
  async selectDate(date: string) {
    await this.page.fill(this.selectors.datePicker, date);
    
    // 날짜 선택 후 시간대 로딩 대기
    await this.page.waitForSelector(this.selectors.timeSlot, { state: 'visible' });
  }

  /**
   * 예약 시간 선택
   * @param time HH:MM 형식의 시간
   */
  async selectTime(time: string) {
    const timeSlots = await this.page.$$(this.selectors.timeSlot);
    let timeFound = false;
    
    for (const slot of timeSlots) {
      const slotText = await slot.textContent();
      if (slotText?.includes(time)) {
        await slot.click();
        timeFound = true;
        break;
      }
    }
    
    if (!timeFound) {
      throw new Error(`시간 ${time}을 찾을 수 없습니다.`);
    }
  }

  /**
   * 예약 제출
   * @param userInfo 사용자 정보
   */
  async submitReservation(userInfo: {
    name: string;
    phone: string;
    email: string;
    memo?: string;
  }) {
    // 사용자 정보 입력 (필드 셀렉터는 실제 웹사이트에 맞게 수정 필요)
    await this.page.fill('input[name="name"]', userInfo.name);
    await this.page.fill('input[name="phone"]', userInfo.phone);
    await this.page.fill('input[name="email"]', userInfo.email);
    
    if (userInfo.memo) {
      await this.page.fill('textarea[name="memo"]', userInfo.memo);
    }
    
    // 개인정보 처리방침 동의 (필요한 경우)
    const agreeCheckbox = await this.page.$('input[type="checkbox"]');
    if (agreeCheckbox) {
      await agreeCheckbox.check();
    }
    
    // 예약 제출
    await this.page.click(this.selectors.submitButton);
    
    // 성공 메시지 대기
    await this.page.waitForSelector(this.selectors.successMessage, { 
      state: 'visible', 
      timeout: 15000 
    });
    
    return await this.page.textContent(this.selectors.successMessage);
  }

  /**
   * 예약 플로우 전체 실행
   */
  async makeReservation(
    purpose: string,
    date: string,
    time: string,
    userInfo: {
      name: string;
      phone: string;
      email: string;
      memo?: string;
    }
  ) {
    try {
      await this.selectPurpose(purpose);
      await this.selectDate(date);
      await this.selectTime(time);
      return await this.submitReservation(userInfo);
    } catch (error) {
      console.error('예약 중 오류 발생:', error);
      throw error;
    }
  }
}
