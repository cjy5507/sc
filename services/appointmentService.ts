import { Page, Browser, BrowserContext } from 'playwright';
import { Store, AutomationProcess, AutomationStatus } from '../types';
import { BrowserWindow } from 'electron';
import { waitUntilMidnight } from '../utils/timeUtils';
import { humanClick, moveMouseNaturally } from '../utils/botDetectionAvoidance';
import { humanDelay } from '../utils/timeUtils';

interface AppointmentServiceOptions {
  mainWindow: BrowserWindow | null;
  automationProcesses: Record<string, AutomationProcess>;
}

export class AppointmentService {
  private mainWindow: BrowserWindow | null;
  private automationProcesses: Record<string, AutomationProcess>;

  constructor(options: AppointmentServiceOptions) {
    this.mainWindow = options.mainWindow;
    this.automationProcesses = options.automationProcesses;
  }

  /**
   * 이메일 입력 및 동의 처리
   */
  private async fillEmailAndAgree(page: Page, store: Store): Promise<void> {
    try {
      // 페이지 안정화를 위한 추가 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000); // 5초로 증가
      
      console.log(`[${store.name}] 이메일 필드 대기 시작`);
      
      // 셀렉터 목록 - 여러 가능한 셀렉터를 시도
      const emailSelectors = [
        '#fmessage > div:nth-child(24) > div:nth-child(1) > div > input',
        'input[type="email"]',
        'input[placeholder*="mail"]',
        'div[data-v-"*"] > div > input',
        'div.fields-row > div > input'
      ];
      
      // 모든 셀렉터 시도
      let emailInput = null;
      for (const selector of emailSelectors) {
        try {
          emailInput = await page.waitForSelector(selector, {
            state: 'visible',
            timeout: 3000
          }).catch(() => null);
          
          if (emailInput) {
            console.log(`[${store.name}] 이메일 필드 발견: ${selector}`);
            break;
          }
        } catch (err) {
          // 계속 진행
        }
      }
      
      if (!emailInput) {
        // 페이지 내용을 로그로 출력하여 디버깅에 도움을 줌
        console.log(`[${store.name}] 이메일 필드를 찾을 수 없음, 페이지 HTML 스냅샷 캡처:`);
        const pageContent = await page.content();
        const contentPreview = pageContent.substring(0, 1000) + '... (truncated)';
        console.log(contentPreview);
        
        throw new Error('이메일 필드를 찾을 수 없습니다.');
      }
      
      // 이메일 입력
      await emailInput.fill(store.config.email);
      console.log(`[${store.name}] 이메일 입력 완료`);
      
      // 약관 동의 셀렉터 목록
      const agreeSelectors = [
        '#fmessage > div:nth-child(24) > div:nth-child(4) > div > div > label > span',
        'label.checkbox > span',
        'input[type="checkbox"] + span',
        'div.checkbox-wrapper label'
      ];
      
      // 약관 동의 시도
      let agreeCheckbox = null;
      for (const selector of agreeSelectors) {
        try {
          agreeCheckbox = await page.waitForSelector(selector, {
            state: 'visible',
            timeout: 3000
          }).catch(() => null);
          
          if (agreeCheckbox) {
            console.log(`[${store.name}] 약관 동의 체크박스 발견: ${selector}`);
            break;
          }
        } catch (err) {
          // 계속 진행
        }
      }
      
      if (agreeCheckbox) {
        await agreeCheckbox.click();
        console.log(`[${store.name}] 약관 동의 완료`);
      } else {
        console.log(`[${store.name}] 약관 동의 체크박스를 찾을 수 없음, 계속 진행`);
      }
      
      // 이름 필드 시도
      try {
        const nameSelector = '#fmessage > div:nth-child(24) > div:nth-child(2) > div > input';
        const nameExists = await page.waitForSelector(nameSelector, {
          state: 'visible',
          timeout: 5000
        }).then(() => true).catch(() => false);
        
        if (nameExists) {
          await page.fill(nameSelector, store.config.name);
          console.log(`[${store.name}] 이름 입력 완료`);
        }
      } catch (nameErr) {
        console.log(`[${store.name}] 이름 필드 입력 실패, 계속 진행: ${nameErr.message}`);
      }
      
      // 전화번호 필드 시도
      try {
        const phoneSelector = '#fmessage > div:nth-child(24) > div:nth-child(3) > div > input';
        const phoneExists = await page.waitForSelector(phoneSelector, {
          state: 'visible',
          timeout: 5000
        }).then(() => true).catch(() => false);
        
        if (phoneExists) {
          await page.fill(phoneSelector, store.config.phone);
          console.log(`[${store.name}] 전화번호 입력 완료`);
        }
      } catch (phoneErr) {
        console.log(`[${store.name}] 전화번호 필드 입력 실패, 계속 진행: ${phoneErr.message}`);
      }

      // 확인 버튼 대기 및 클릭 (인간처럼)
      await humanDelay(1000, 2000);
      
      const submitSelectors = [
        '#fmessage > div:nth-child(24) > footer > button',
        'footer > button',
        'button[type="submit"]',
        'button.primary'
      ];
      
      let submitClicked = false;
      for (const selector of submitSelectors) {
        try {
          const clicked = await humanClick(page, selector);
          if (clicked) {
            submitClicked = true;
            console.log(`[${store.name}] 확인 버튼 클릭 성공: ${selector}`);
            break;
          }
        } catch (err) {
          // 다음 셀렉터 시도
        }
      }
      
      if (!submitClicked) {
        console.log(`[${store.name}] 확인 버튼을 찾을 수 없어 계속 진행`);
      }
      
      // 페이지 로드 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      console.log(`[${store.name}] 이메일 및 개인정보 입력 완료`);
    } catch (e) {
      console.error(`[${store.name}] 이메일 및 개인정보 입력 실패:`, e);
      throw e;
    }
  }
} 