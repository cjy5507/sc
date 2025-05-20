import { Page } from 'playwright';
import { BasePage } from './BasePage';

type StoreType = 'chronodigm' | 'unopangyo' | 'hyundai' | 'hongbo';

const STORE_URLS = {
  chronodigm: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
  unopangyo: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
  hyundai: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/appointment/',
  hongbo: 'https://www.hongbowatch.co.kr/rolex/contact-busan/appointment/'
};

const STORE_SELECTORS = {
  chronodigm: {
    datePicker: 'input[type="date"]',
    timeSlot: '.time-slot',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  },
  unopangyo: {
    datePicker: 'input[type="date"]',
    timeSlot: '.time-slot',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  },
  hyundai: {
    datePicker: 'input[type="date"]',
    timeSlot: '.time-slot',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  },
  hongbo: {
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
   * 매장 방문 목적 선택
   * @param purpose 방문 목적 (예: '시계 구매', 'A/S 문의' 등)
   */
  async selectPurpose(purpose: string) {
    await this.navigate();
    
    // 페이지 로드 대기
    await this.page.waitForSelector(this.selectors.purposeCard, { state: 'visible' });
    
    // 방문 목적 카드 클릭
    const purposeCard = await this.page.$(this.selectors.purposeCard);
    if (!purposeCard) {
      throw new Error('방문 목적 카드를 찾을 수 없습니다.');
    }
    
    await purposeCard.click();
    
    // 다음 단계로 넘어가는 대기
    await this.page.waitForSelector(this.selectors.datePicker, { state: 'visible' });
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
