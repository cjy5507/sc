import { Browser, Page, chromium } from 'playwright';
import { IStoreStatus } from '../automation-runner';

export interface UnopangyoOptions {
  onStatusUpdate?: (status: IStoreStatus) => void;
}

export async function runUnopangyoScenario(options?: UnopangyoOptions): Promise<'success' | 'fail' | 'timeout'> {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.unopangyo.com/rolex/contact-gyeonggi/', { waitUntil: 'domcontentloaded' });
    options?.onStatusUpdate?.({ name: 'unopangyo', status: 'in-progress', message: '페이지 진입' });

    // TODO: 실제 DOM 구조에 맞게 자동화 로직 구현
    // 1. 쿠키/개인정보 동의 자동 클릭 (선택)
    // 2. 예약 목적/날짜/연락처 입력
    // 3. 약관 동의 체크
    // 4. 예약하기 버튼 클릭 (PASS 인증 직전)
    options?.onStatusUpdate?.({ name: 'unopangyo', status: 'waiting-auth', message: 'PASS 본인인증 대기', authStartTime: Date.now(), authTimeout: 180000 });
    // await page.click('text=예약하기');
    // 실제로는 PASS 인증 창이 뜨는지 감지 필요

    // 5. 인증 완료 감지 (예시: 3분 대기 후 타임아웃)
    const authResult = await waitForAuthOrTimeout(page, 180000); // 3분
    if (authResult === 'success') {
      options?.onStatusUpdate?.({ name: 'unopangyo', status: 'success', message: '예약 성공' });
      await browser.close();
      return 'success';
    } else if (authResult === 'timeout') {
      options?.onStatusUpdate?.({ name: 'unopangyo', status: 'timeout', message: 'PASS 인증 타임아웃' });
      await browser.close();
      return 'timeout';
    } else {
      options?.onStatusUpdate?.({ name: 'unopangyo', status: 'fail', message: '예약 실패' });
      await browser.close();
      return 'fail';
    }
  } catch (e) {
    options?.onStatusUpdate?.({ name: 'unopangyo', status: 'fail', message: '오류 발생: ' + (e as Error).message });
    await browser.close();
    return 'fail';
  }
}

async function waitForAuthOrTimeout(page: Page, timeout: number): Promise<'success' | 'timeout'> {
  // TODO: 실제 PASS 인증 완료 감지 로직 구현 (예: 특정 DOM 변화, URL 변화 등)
  // 임시로 timeout만 구현
  await page.waitForTimeout(timeout);
  return 'timeout';
} 