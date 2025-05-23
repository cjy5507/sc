import { Page, Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import { Store, AutomationProcess, AutomationStatus, AutomationResult } from '../types';
import { BrowserWindow } from 'electron';
import { waitUntilMidnight, humanDelay } from '../utils/timeUtils';
import { humanClick, moveMouseNaturally } from '../utils/botDetectionAvoidance';

// Store 타입에 selector 속성이 있음을 명시적으로 확인하는 타입 가드
function hasSelector(store: Store): store is Store & { selector: string } {
  return 'selector' in store && typeof (store as any).selector === 'string';
}

interface AppointmentServiceOptions {
  mainWindow?: BrowserWindow | null;
  automationProcesses: Record<string, AutomationProcess>;
}

export class AppointmentService {
  private mainWindow: BrowserWindow | null;
  private automationProcesses: Record<string, AutomationProcess>;

  constructor(options: AppointmentServiceOptions) {
    this.mainWindow = options.mainWindow || null;
    this.automationProcesses = options.automationProcesses;
  }

  /**
   * 쿠키 및 광고 처리 메서드
   */
  private async handleCookiesAndAds(page: Page, store: Store): Promise<void> {
    try {
      // 쿠키 수락 버튼 찾기 및 클릭
      const cookieSelectors = [
        'button[id*="cookie"]',
        'button[class*="cookie"]',
        'a[id*="cookie"]',
        'a[class*="cookie"]',
        'button:has-text("Accept")',
        'button:has-text("Accept All")',
        'button:has-text("동의")',
        'button:has-text("모두 동의")'
      ];
      
      for (const selector of cookieSelectors) {
        const exists = await page.waitForSelector(selector, {
          state: 'visible',
          timeout: 5000
        }).catch(() => null);
        
        if (exists) {
          console.log(`[${store.name}] 쿠키 동의 버튼 발견: ${selector}`);
          await humanClick(page, selector);
          await humanDelay(500, 1500);
          break;
        }
      }
      
      // 광고 팝업 닫기 버튼 찾기 및 클릭
      const closeSelectors = [
        'button.close',
        'button[class*="close"]',
        'button[aria-label="Close"]',
        'div.close-button',
        'button:has-text("×")',
        'button:has-text("✕")',
        'button:has-text("닫기")',
        'button:has-text("Close")'
      ];
      
      for (const selector of closeSelectors) {
        const exists = await page.waitForSelector(selector, {
          state: 'visible',
          timeout: 5000
        }).catch(() => null);
        
        if (exists) {
          console.log(`[${store.name}] 광고 닫기 버튼 발견: ${selector}`);
          await humanClick(page, selector);
          await humanDelay(500, 1500);
          break;
        }
      }
    } catch (error) {
      console.log(`[${store.name}] 쿠키/광고 처리 중 오류 (계속 진행):`, error);
    }
  }
  
  /**
   * 문의하기 버튼 클릭 메서드
   */
  private async clickContactButton(page: Page, store: Store): Promise<void> {
    try {
      // 자연스러운 스크롤 추가
      await page.evaluate(() => {
        window.scrollTo({
          top: 100,
          behavior: 'smooth'
        });
      });
      
      await humanDelay(800, 1500);
      
      // 메시지 또는 문의하기 관련 버튼 찾기
      const contactSelectors = [
        'a.link-button[href*="message"]',
        'a[href*="contact"]',
        'button:has-text("문의하기")',
        'a:has-text("문의하기")',
        'button:has-text("Contact")',
        'a:has-text("Contact")',
        'button:has-text("메시지")',
        'a:has-text("메시지")'
      ];
      
      for (const selector of contactSelectors) {
        const exists = await page.waitForSelector(selector, {
          state: 'visible',
          timeout: 5000
        }).catch(() => null);
        
        if (exists) {
          console.log(`[${store.name}] 문의하기 버튼 발견: ${selector}`);
          
          // 자연스러운 마우스 움직임과 클릭
          await moveMouseNaturally(page, selector);
          await humanDelay(300, 800);
          await humanClick(page, selector);
          
          // 클릭 후 페이지 로딩 대기
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
            console.log(`[${store.name}] 페이지 로딩 대기 시간 초과, 계속 진행`);
          });
          
          return;
        }
      }
      
      throw new Error('문의하기 버튼을 찾을 수 없음');
    } catch (error) {
      console.error(`[${store.name}] 문의하기 버튼 클릭 중 오류:`, error);
      throw error;
    }
  }
  
  /**
   * 메시지 입력 및 PASS 인증 처리 메서드
   */
  private async handleMessageAndPassAuth(context: BrowserContext, page: Page, store: Store): Promise<void> {
    try {
      // 메시지 폼 찾기
      console.log(`[${store.name}] 메시지 입력 폼 찾는 중...`);
      await page.waitForSelector('input[name="name"]', { timeout: 15000 });
      
      // 자연스러운 입력
      console.log(`[${store.name}] 이름 입력 중...`);
      await page.fill('input[name="name"]', store.config.name || '');
      await humanDelay(500, 1200);
      
      console.log(`[${store.name}] 전화번호 입력 중...`);
      await page.fill('input[name="phone"]', store.config.phone || '');
      await humanDelay(500, 1200);
      
      console.log(`[${store.name}] 메시지 입력 중...`);
      await page.fill('textarea[name="message"]', store.config.message || '');
      await humanDelay(800, 1500);
      
      // 제출 버튼 클릭
      console.log(`[${store.name}] 제출 버튼 찾는 중...`);
      const submitSelector = 'button[type="submit"]';
      await page.waitForSelector(submitSelector, { timeout: 10000 });
      
      // 자연스러운 클릭
      await moveMouseNaturally(page, submitSelector);
      await humanDelay(300, 800);
      await humanClick(page, submitSelector);
      
      // PASS 인증 팝업 대기 설정
      console.log(`[${store.name}] PASS 인증 대기 시작...`);
      
      // 인증 완료 여부 확인 
      let authCompleted = false;
      const startTime = Date.now();
      const maxWaitTime = 2 * 60 * 1000; // 2분
      
      while (Date.now() - startTime < maxWaitTime) {
        // 현재 모든 페이지 체크
        const pages = context.pages();
        for (const p of pages) {
          try {
            const url = p.url();
            
            // 인증 완료 URL 패턴 체크
            if (url.includes('/mypage') || 
                url.includes('/user') || 
                url.includes('/profile') || 
                url.includes('message/complete') || 
                url.includes('auth/success')) {
              console.log(`[${store.name}] 인증 완료 감지됨! URL: ${url}`);
              authCompleted = true;
              break;
            }
          } catch (err) {
            // URL 가져오기 오류 무시
            continue;
          }
        }
        
        if (authCompleted) break;
        await page.waitForTimeout(1000); // 1초마다 체크
      }
      
      if (!authCompleted) {
        console.log(`[${store.name}] PASS 인증 대기 시간 초과. 수동 인증이 필요할 수 있습니다.`);
      } else {
        console.log(`[${store.name}] PASS 인증이 성공적으로 완료되었습니다.`);
      }
    } catch (error) {
      console.error(`[${store.name}] 메시지 입력 및 PASS 인증 중 오류:`, error);
      throw error;
    }
  }

  /**
   * 팝업 페이지 처리 핸들러
   */
  private async handlePopup(
    context: BrowserContext,
    store: Store,
    triggerPromise: Promise<void>,
  ): Promise<any> {
    // 5분 타임아웃 - 긴 타임아웃 설정
    const popupTimeout = 300000; 
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('팝업 대기 시간 초과 (5분)')), popupTimeout);
    });
    
    return Promise.race([
      Promise.all([
        new Promise((resolve) => {
          // 각 스토어 ID에 고유한 이벤트 핸들러 참조 저장
          const handlerReference = async (newPage: Page) => {
            try {
              console.log(`[${store.name}] 새 팝업 감지됨`);
              
              // 페이지 로드 대기
              await newPage.waitForLoadState('domcontentloaded');
              await newPage.waitForTimeout(3000);
              
              // URL 확인
              const url = await newPage.url();
              console.log(`[${store.name}] 팝업 URL: ${url}`);
              
              // PASS 인증 페이지인지 확인
              if (url.includes('passauth') || url.includes('auth.sktelecom')) {
                console.log(`[${store.name}] PASS 인증 팝업 확인됨`);
                
                try {
                  // 통신사 선택 UI가 렌더링될 때까지 대기
                  await newPage.waitForSelector('#ct > form > fieldset > ul.agency_select__items', {
                    state: 'visible',
                    timeout: 30000
                  });
                  
                  console.log(`[${store.name}] 통신사 선택 UI 로드됨`);
                  
                  // 팝업 핸들러 제거 및 해당 팝업 반환
                  context.removeListener('page', handlerReference);
                  resolve(newPage);
                } catch (uiErr) {
                  console.log(`[${store.name}] 통신사 선택 UI 대기 실패:`, uiErr);
                  
                  // 팝업 캡처 시도 (디버깅용)
                  try {
                    await newPage.screenshot({ 
                      path: `pass-popup-${store.name}-${Date.now()}.png`, 
                      fullPage: true 
                    });
                    console.log(`[${store.name}] 팝업 스크린샷 저장됨`);
                  } catch (screenshotErr) {
                    console.log(`[${store.name}] 팝업 스크린샷 저장 실패`);
                  }
                  
                  // PASS 인증 팝업이지만 UI를 찾지 못한 경우에도 이 팝업을 반환
                  context.removeListener('page', handlerReference);
                  resolve(newPage);
                }
              } else {
                // PASS 인증 팝업이 아닌 경우 - 다른 팝업 무시 (계속 대기)
                console.log(`[${store.name}] PASS 인증 관련 팝업이 아님, 무시함`);
              }
            } catch (error) {
              console.log(`[${store.name}] 팝업 처리 중 오류:`, error);
              // 오류 발생 시 핸들러는 제거하지 않고 다음 팝업 계속 대기
            }
          };
          
          // 이 매장의 팝업 페이지 생성 이벤트 감시
          context.on('page', handlerReference);
          
          // 트리거 실행 (버튼 클릭) 후 페이지 이벤트 등록 완료 알림
          triggerPromise.then(() => {
            console.log(`[${store.name}] 팝업 트리거 실행 완료, 대기 중...`);
          });
        }),
        triggerPromise
      ]),
      timeoutPromise // 5분 타임아웃 추가
    ]).catch(err => {
      console.log(`[${store.name}] 팝업 처리 중 예외 발생:`, err);
      return null;
    });
  }

  /**
   * 예약 버튼을 찾아 클릭하는 함수
   */
  private async findAndClickReservationButton(page: Page, store: Store, retries = 3): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      try {
        // 페이지 자연스러운 스크롤 처리
        await page.evaluate(() => {
          return new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= document.body.scrollHeight) {
                clearInterval(timer);
                setTimeout(resolve, 500);
              }
            }, 100);
          });
        });
        
        await humanDelay(1000, 2000);
        
        // 페이지 상단으로 부드럽게 스크롤 복귀
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        await humanDelay(1000, 3000);
        
        // 기본 셀렉터 목록
        const selectors = [
          '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.text-wrap > div > div.text-body-24.text-bold',
          'div.text-body-24.text-bold',
          'a div.text-wrap div div.text-body-24.text-bold'
        ];
        
        // 텍스트 내용으로 버튼 찾기
        try {
          const buttons = await page.$$('a, button');
          for (const button of buttons) {
            const text = await button.textContent();
            if (text && (text.includes('시간 선택') || text.includes('예약'))) {
              // 요소에 임시 ID 할당
              const tempId = await page.evaluate((el: HTMLElement) => {
                if (!el.id) {
                  el.id = 'temp-btn-' + Date.now();
                }
                return el.id;
              }, button as any);
              
              selectors.push('#' + tempId);
            }
          }
        } catch (textErr) {
          console.log(`[${store.name}] 텍스트로 버튼 찾기 실패:`, textErr);
        }
        
        // 랜덤 지연
        await humanDelay();
        
        // 각 셀렉터 시도
        for (const selector of selectors) {
          try {
            const exists = await page.waitForSelector(selector, { 
              state: 'visible', 
              timeout: 3000 
            }).then(() => true).catch(() => false);
            
            if (exists) {
              console.log(`[${store.name}] 예약 버튼 발견! 셀렉터: ${selector}`);
              
              // 인간 같은 클릭 실행
              const clickSuccess = await humanClick(page, selector);
              
              if (clickSuccess) {
                // 확인 버튼도 인간처럼 클릭 시도
                await humanDelay(1000, 3000);
                
                try {
                  const confirmButtonSelector = '#fappointment > div:nth-child(25) > footer > button';
                  await humanClick(page, confirmButtonSelector);
                  console.log(`[${store.name}] 확인 버튼 클릭 성공!`);
                } catch (confirmErr) {
                  console.log(`[${store.name}] 확인 버튼 클릭 실패, 계속 진행:`, confirmErr);
                }
                
                return true;
              }
            }
          } catch (selectorErr) {
            // 셀렉터 오류 무시하고 다음 셀렉터 시도
            continue;
          }
        }
        
        // 재시도 전 페이지 리로드 및 지연
        if (i < retries - 1) {
          console.log(`[${store.name}] 예약 버튼을 찾지 못함, 페이지 새로고침 후 재시도...`);
          await page.reload({ waitUntil: 'networkidle' });
          await humanDelay(3000, 7000);
        }
      } catch (err) {
        console.log(`[${store.name}] 예약 시도 중 오류 발생, 재시도...`, err);
        await humanDelay(2000, 5000);
      }
    }
    
    return false;
  }

  /**
   * 예약 페이지로 이동하는 함수
   */
  private async navigateToAppointmentPage(
    browser: Browser,
    context: BrowserContext,
    page: Page,
    store: Store,
    retries = 3
  ): Promise<Page | null> {
    console.log(`[${store.name}] 예약 페이지 이동 시도...`);
    let appointmentPage: Page | null = null;
    
    try {
      // 인증된 페이지 상태 확인
      const currentUrl = await page.url();
      console.log(`[${store.name}] 현재 인증된 페이지 URL: ${currentUrl}`);
      
      // 매우 자연스러운 브라우징 시뮬레이션 구현
      // 1. 인증된 페이지에서 초기 작업 시작
      console.log(`[${store.name}] 인증된 페이지에서 인간처럼 사이트 탐색 시작...`);
      
      // 사람처럼 스크롤과 마우스 움직임 시뮬레이션
      await this.simulateHumanBehavior(page);
      
      // 2. 새 탭에서 홈페이지로 이동 (인증 세션 유지)
      console.log(`[${store.name}] 인증된 컨텍스트에서 새 탭 생성...`);
      appointmentPage = await context.newPage();
      
      // 마우스 움직임 시뮬레이션 (봇 감지 우회 핵심)
      await appointmentPage.mouse.move(100, 100);
      await humanDelay(800, 1500);
      
      // 3. 사이트 메인 페이지 직접 방문
      console.log(`[${store.name}] 메인 페이지 방문...`);
      await appointmentPage.goto(store.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // 로딩 대기
      await appointmentPage.waitForLoadState('networkidle');
      await humanDelay(2000, 4000);
      
      // 스크롤과 마우스 움직임으로 사람처럼 행동
      await this.simulateHumanBehavior(appointmentPage);
      
      // 4. 예약 페이지 방문 시도 (URL 직접 입력 접근)
      const appointmentUrl = `${store.url}appointment/`;
      console.log(`[${store.name}] 예약 페이지로 이동 시도: ${appointmentUrl}`);
      
      // 실제 URL 입력하는 것처럼 지연 추가
      await humanDelay(1000, 2000);
      
      // 사람처럼 페이지 이동 시뮬레이션
      try {
        // 새로운 시도: 페이지 이동하는 자바스크립트 실행
        await appointmentPage.evaluate((url) => {
          // 사람이 주소창에 주소를 입력하는 것과 유사한 방식
          window.location.href = url;
        }, appointmentUrl);
        
        // 충분한 시간 대기
        await humanDelay(3000, 5000);
        await appointmentPage.waitForLoadState('domcontentloaded');
        await humanDelay(1000, 3000);
        
        // 페이지 상태 확인
        const currentUrl = await appointmentPage.url();
        console.log(`[${store.name}] 현재 URL: ${currentUrl}`);
        
        // about:blank인 경우 다른 방법으로 재시도
        if (currentUrl === 'about:blank') {
          console.log(`[${store.name}] about:blank 발견, 다른 방법으로 시도...`);
          
          // 일반 사용자 접근과 유사한 방법으로 시도
          await appointmentPage.goto(store.url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          await humanDelay(1000, 2000);
          await this.simulateHumanBehavior(appointmentPage);
          
          // 예약 관련 링크 찾기
          const navLinkSelectors = [
            'a[href*="appointment"]',
            'a:has-text("예약")',
            'a:has-text("Appointment")',
            'nav a',
            'header a',
            '.menu a'
          ];
          
          // 페이지의 모든 링크 찾기 시도
          let linkFound = false;
          
          for (const selector of navLinkSelectors) {
            const exists = await appointmentPage.waitForSelector(selector, {
              state: 'visible',
              timeout: 3000
            }).then(() => true).catch(() => false);
            
            if (exists) {
              // 사람처럼 링크로 마우스 이동
              await appointmentPage.mouse.move(300, 300);
              await humanDelay(500, 1200);
              
              // 링크 클릭
              console.log(`[${store.name}] 예약 관련 링크 발견 및 클릭: ${selector}`);
              await appointmentPage.click(selector);
              linkFound = true;
              break;
            }
          }
          
          // 링크를 찾지 못한 경우 마지막 수단으로 직접 URL 접근
          if (!linkFound) {
            console.log(`[${store.name}] 링크를 찾지 못함, 마지막 시도로 history.pushState 사용...`);
            
            // history.pushState 사용 (브라우저 내부 네비게이션과 유사)
            await appointmentPage.evaluate((url) => {
              window.history.pushState({}, '', url);
              window.location.reload();
            }, appointmentUrl);
          }
        }
      } catch (navError) {
        console.error(`[${store.name}] 페이지 이동 중 오류:`, navError);
        
        // 마지막 보루: 직접 URL 접근
        console.log(`[${store.name}] 최후의 시도: 직접 URL 접근`);
        await appointmentPage.goto(appointmentUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
      }
      
      // 최종 페이지 로딩 대기
      await appointmentPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        console.log(`[${store.name}] 페이지 로딩 완료 대기 실패, 계속 진행`);
      });
      await humanDelay(3000, 5000);
      
      // 최종 URL 확인
      const finalUrl = await appointmentPage.url();
      console.log(`[${store.name}] 최종 URL: ${finalUrl}`);
      
      // 페이지 콘텐츠 가져오기 시도
      let pageContent = '';
      try {
        pageContent = await appointmentPage.content();
      } catch (e) {
        console.log(`[${store.name}] 페이지 콘텐츠 가져오기 실패:`, e);
      }
      
      // 실패 판단 기준: about:blank 또는 콘텐츠 키워드 부재
      if (finalUrl === 'about:blank' || (!pageContent.includes('rolex') && !pageContent.includes('appointment') && !pageContent.includes('예약'))) {
        console.log(`[${store.name}] 페이지 검증 실패, 스크린샷 저장 시도...`);
        
        try {
          await appointmentPage.screenshot({
            path: `navigation-failure-${store.name}-${Date.now()}.png`,
            fullPage: true
          });
        } catch (e) {
          // 스크린샷 실패 무시
        }
        
        if (retries > 0) {
          console.log(`[${store.name}] 재시도 ${retries}번 남음...`);
          await appointmentPage.close().catch(() => {});
          await humanDelay(3000, 5000);
          return this.navigateToAppointmentPage(browser, context, page, store, retries - 1);
        }
        
        throw new Error(`예약 페이지로 이동 실패: ${finalUrl}`);
      }
      
      console.log(`[${store.name}] 예약 페이지 이동 성공!`);
      return appointmentPage;
    } catch (err) {
      console.error(`[${store.name}] 예약 페이지 이동 중 오류:`, err);
      
      if (appointmentPage && !appointmentPage.isClosed()) {
        try {
          await appointmentPage.screenshot({
            path: `final-error-${store.name}-${Date.now()}.png`,
            fullPage: true
          });
        } catch (e) {
          // 무시
        }
        
        await appointmentPage.close().catch(() => {});
      }
      
      if (retries > 0) {
        console.log(`[${store.name}] 마지막 실패 후 재시도 ${retries}번 남음...`);
        await humanDelay(5000, 10000);
        return this.navigateToAppointmentPage(browser, context, page, store, retries - 1);
      }
      
      return null;
    }
  }
  
  /**
   * 사람과 같은 브라우징 행동 시뮬레이션
   */
  private async simulateHumanBehavior(page: Page): Promise<void> {
    try {
      // 랜덤 스크롤
      await page.evaluate(() => {
        const maxScroll = Math.max(
          document.body.scrollHeight, 
          document.documentElement.scrollHeight,
          document.body.offsetHeight, 
          document.documentElement.offsetHeight
        ) - window.innerHeight;
        
        const scrollTarget = Math.floor(Math.random() * maxScroll * 0.7);
        
        window.scrollTo({
          top: scrollTarget,
          behavior: 'smooth'
        });
      });
      
      await humanDelay(1000, 2500);
      
      // 랜덤 마우스 움직임
      const viewportSize = await page.viewportSize();
      if (viewportSize) {
        const x = Math.floor(Math.random() * viewportSize.width * 0.8);
        const y = Math.floor(Math.random() * viewportSize.height * 0.8);
        
        // 랜덤한 위치로 마우스 이동 대신 클릭 가능한 요소 찾기 
        try {
          // 페이지에서 클릭 가능한 요소 찾기
          const clickableElement = await page.$('a, button, [role="button"]');
          if (clickableElement) {
            await clickableElement.hover(); // hover로 대체
          } else {
            // 클릭 가능한 요소가 없으면 그냥 마우스 이동
            await page.mouse.move(x, y);
          }
        } catch (e) {
          // 에러가 발생하면 그냥 마우스 이동
          await page.mouse.move(x, y);
        }
      }
      
      await humanDelay(800, 1500);
      
      // 다시 맨 위로 스크롤
      await page.evaluate(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
      
      await humanDelay(1000, 2000);
    } catch (e) {
      console.log('사람 행동 시뮬레이션 중 오류:', e);
      // 계속 진행 - 주요 기능이 아님
    }
  }

  /**
   * 자동화 상태 업데이트 함수
   */
  private updateAutomationStatus(storeId: string, status: string, message: string): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('automation-status', {
        storeId,
        status,
        message
      });
    }
  }

  /**
   * 브라우저 시작 함수
   */
  private async startBrowser(store: Store): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
    try {
      // 브라우저 시작
      const browser = await chromium.launch({
        headless: false,
        slowMo: 100, // 봇 감지 회피를 위한 느린 동작
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      // 브라우저 컨텍스트 설정
      const context = await browser.newContext({
        locale: 'ko-KR',
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      });
      
      // 신규 페이지 생성
      const page = await context.newPage();
      
      // 자동화 프로세스 추적
      this.automationProcesses[store.name] = {
        stopped: false,
        browser,
        abortController: new AbortController()
      };
      
      return { browser, context, page };
    } catch (error) {
      console.error(`[${store.name}] 브라우저 시작 오류:`, error);
      throw error;
    }
  }

  /**
   * 중지 확인 함수
   */
  private checkStopped(store: Store): void {
    // 스토어 ID가 유효한지 확인
    if (!store.name || !this.automationProcesses[store.name]) {
      return;
    }
    
    if (this.automationProcesses[store.name].stopped) {
      throw new Error('자동화가 사용자에 의해 중지되었습니다.');
    }
  }

  /**
   * 매장별 자동화 처리 메인 함수
   */
  public async handleStore(store: Store): Promise<Browser | null> {
    let browser: Browser | null = null;
    let authPage: Page | null = null;
    let appointmentPage: Page | null = null;
    
    try {
      this.updateAutomationStatus(store.name, 'running', '자동화 시작됨');
      console.log(`[${store.name}] 자동화 시작`);

      // 브라우저 초기화 및 봇 감지 회피 설정
      console.log(`[AppointmentService] 스토어 처리 시작: ${store.name} (ID: ${store.id})`);
      console.log(`[AppointmentService] Playwright 로드 중...`);
      browser = await chromium.launch({ 
        headless: false, 
        slowMo: 100,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      console.log(`[AppointmentService] Playwright 로드 성공`);
      console.log(`[AppointmentService] 브라우저 시작 중...`);
      
      const context = await browser.newContext({
        locale: 'ko-KR',
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        permissions: ['geolocation'],
        geolocation: { longitude: 126.9780, latitude: 37.5665 }, // 서울 좌표
        colorScheme: 'light',
        deviceScaleFactor: 2,
        hasTouch: false,
        timezoneId: 'Asia/Seoul'
      });
      console.log(`[AppointmentService] 브라우저 시작 성공`);
      console.log(`[AppointmentService] 컨텍스트 생성 중...`);
      
      // 봇 감지 회피 스크립트 추가
      await context.addInitScript(() => {
        // WebDriver 속성 숨기기
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Chrome 속성 정의
        if (!('chrome' in window)) {
          // @ts-ignore - Chrome 속성 주입
          window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {},
          };
        }
        
        // 자동화 감지 방지
        const originalQuery = Element.prototype.querySelector;
        Element.prototype.querySelector = function(selector: string) {
          if (selector.includes('automation') || selector.includes('selenium') || selector.includes('webdriver')) {
            return null;
          }
          return originalQuery.call(this, selector);
        };
        
        // 클릭 이벤트에 랜덤 오프셋 추가
        const originalClick = HTMLElement.prototype.click;
        HTMLElement.prototype.click = function() {
          const delay = Math.floor(Math.random() * 50 + 10);
          setTimeout(() => {
            originalClick.call(this);
          }, delay);
        };
        
        // 플러그인 정보 수정
        Object.defineProperty(navigator, 'plugins', {
          get: function() {
            return [
              {
                name: 'Chrome PDF Plugin',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format'
              },
              {
                name: 'Chrome PDF Viewer',
                filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                description: 'Portable Document Format'
              }
            ];
          }
        });
      });
      
      // 두 개의 탭 생성
      console.log(`[AppointmentService] 페이지 생성 중...`);
      authPage = await context.newPage();
      await humanDelay(800, 1500); // 더 긴 지연 추가
      appointmentPage = await context.newPage();
      console.log(`[AppointmentService] 페이지 생성 성공`);
      
      // URL 생성
      // 예약 페이지 URL 생성
      const appointmentUrl = store.url.includes('/appointment/') 
        ? store.url 
        : store.url.replace(/\/contact-[^/]+\/?$/, '/contact-seoul/appointment/');
      
      // 인증 페이지 URL 생성
      const authUrl = store.url.includes('/contact-seoul/') 
        ? store.url 
        : store.url.replace(/\/appointment\/?$/, '/contact-seoul/');
      
      console.log(`[AppointmentService] 인증 URL: ${authUrl}`);
      console.log(`[AppointmentService] 예약 URL: ${appointmentUrl}`);
      
      // 첫 번째로 인증 페이지 로드
      console.log(`[AppointmentService] 인증 페이지로 이동 중: ${authUrl}`);
      await authPage.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`[AppointmentService] 인증 페이지 이동 완료`);
      
      // 인증 페이지 제목 로깅
      const authTitle = await authPage.title();
      console.log(`[AppointmentService] 인증 페이지 제목: ${authTitle}`);
      
      // 두 번째로 예약 페이지 로드
      console.log(`[AppointmentService] 예약 페이지로 이동 중: ${appointmentUrl}`);
      await appointmentPage.goto(appointmentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`[AppointmentService] 예약 페이지 이동 완료`);
      
      // 예약 페이지 제목 로깅
      const appointmentTitle = await appointmentPage.title();
      console.log(`[AppointmentService] 예약 페이지 제목: ${appointmentTitle}`);
      
      // 인증 페이지 처리 함수
      const handleAuthPage = async () => {
        try {
          console.log(`[${store.name}] 인증 페이지 처리 시작...`);
          // 인증 페이지 활성화
          await authPage!.bringToFront();
          await humanDelay(800, 1500);
          
          // 쿠키 동의 및 광고 처리
          await this.handleCookiesAndAds(authPage!, store);
          
          // 문의하기 버튼 클릭
          try {
            this.updateAutomationStatus(store.name, 'contact', '메시지 보내기 준비 중...');
            console.log(`[${store.name}] 문의하기 버튼 클릭 시도...`);
            await this.clickContactButton(authPage!, store);
            console.log(`[${store.name}] 문의하기 버튼 클릭 성공`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${store.name}] 문의하기 버튼 클릭 실패:`, error);
            this.updateAutomationStatus(store.name, 'error', `메시지 버튼 클릭 실패: ${errorMessage}`);
          }
          
          // 메시지 입력 및 PASS 인증
          try {
            this.updateAutomationStatus(store.name, 'typing', '메시지 정보 입력 중...');
            console.log(`[${store.name}] 메시지 입력 및 PASS 인증 시작...`);
            await this.handleMessageAndPassAuth(context, authPage!, store);
            
            // 인증 성공 상태 업데이트
            this.updateAutomationStatus(store.name, 'pass-done', 'PASS 인증 완료! 인증 페이지 유지 중...');
            console.log(`[${store.name}] PASS 인증 완료!`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${store.name}] 메시지 입력 및 인증 실패:`, error);
            this.updateAutomationStatus(store.name, 'error', `메시지 제출 실패: ${errorMessage}`);
          }
          
          // 인증 페이지 세션 유지 (주기적 활동)
          const interval = setInterval(async () => {
            try {
              if (authPage?.isClosed()) {
                clearInterval(interval);
                return;
              }
              
              // 자연스러운 스크롤 등 인간 행동 시뮬레이션
              await this.simulateHumanBehavior(authPage!);
              console.log(`[${store.name}] 인증 페이지 세션 유지 중...`);
            } catch (e) {
              console.log(`[${store.name}] 인증 페이지 유지 오류 (무시):`, e);
            }
          }, 30000); // 30초마다 실행
          
          console.log(`[${store.name}] 인증 페이지 지속 유지 중...`);
        } catch (e) {
          console.error(`[${store.name}] 인증 페이지 처리 중 오류:`, e);
        }
      };
      
      // 예약 페이지 처리 함수
      const handleAppointmentPage = async () => {
        try {
          console.log(`[${store.name}] 예약 페이지 처리 시작...`);
          // 예약 페이지 탭 활성화
          await appointmentPage!.bringToFront();
          await humanDelay(1000, 2000);
          
          // 예약 페이지 새로고침 및 처리 루프
          let refreshCount = 0;
          
          const processAppointmentPage = async () => {
            refreshCount++;
            console.log(`[${store.name}] 예약 페이지 새로고침 #${refreshCount}...`);
            
            // 페이지 새로고침
            await appointmentPage!.goto(appointmentUrl, { 
              waitUntil: 'networkidle', 
              timeout: 60000 
            });
            
            // 페이지가 완전히 로드될 때까지 추가 대기
            await appointmentPage!.waitForLoadState('networkidle', { timeout: 30000 })
              .catch(() => console.log(`[${store.name}] 로딩 대기 시간 초과, 계속 진행`));
            
            // 자연스러운 행동 시뮬레이션
            await this.simulateHumanBehavior(appointmentPage!);
            
            // 매장별 커스텀 셀렉터 확인
            if (hasSelector(store)) {
              const exists = await appointmentPage!.waitForSelector(store.selector, { 
                timeout: 30000,
                state: 'visible'
              }).catch(() => null);
              
              if (exists) {
                console.log(`[${store.name}] 예약 UI 요소 발견: ${store.selector}`);
                this.updateAutomationStatus(store.name, 'success', '예약 페이지 로드 성공! 예약 진행해주세요.');
                
                // 발견 시 성공 상태로 간주
                return true;
              } else {
                console.log(`[${store.name}] 예약 UI 요소를 찾을 수 없습니다. 계속 시도...`);
                // UI 요소가 없는 경우 계속 시도
                return false;
              }
            } else {
              // 셀렉터가 없는 경우 페이지 로드만으로 성공 간주
              this.updateAutomationStatus(store.name, 'success', '예약 페이지 로드 성공! 예약 진행해주세요.');
              return true;
            }
          };
          
          // 첫 번째 시도
          let success = await processAppointmentPage();
          
          // 성공하지 못한 경우 주기적으로 새로고침
          if (!success) {
            const refreshInterval = setInterval(async () => {
              try {
                if (appointmentPage?.isClosed()) {
                  clearInterval(refreshInterval);
                  return;
                }
                
                // 예약 페이지 처리 시도
                success = await processAppointmentPage();
                
                // 성공 시 자동 예약 버튼 클릭 시도 추가
                if (success) {
                  console.log(`[${store.name}] 예약 버튼 찾기 시도...`);
                  await this.findAndClickReservationButton(appointmentPage!, store);
                }
                
                // 성공 시 간격 조정 (더 긴 간격으로 변경)
                if (success) {
                  clearInterval(refreshInterval);
                  
                  // 성공 후에는 더 긴 간격으로 새로 간격 설정
                  setInterval(async () => {
                    try {
                      if (appointmentPage?.isClosed()) return;
                      await processAppointmentPage();
                    } catch (e) {
                      console.log(`[${store.name}] 예약 페이지 유지 오류 (무시):`, e);
                    }
                  }, 120000); // 2분마다 새로고침
                }
              } catch (e) {
                console.log(`[${store.name}] 예약 페이지 처리 오류 (무시):`, e);
              }
            }, 30000); // 30초마다 시도
          }
          
          console.log(`[${store.name}] 예약 페이지 모니터링 지속...`);
        } catch (e) {
          console.error(`[${store.name}] 예약 페이지 처리 중 오류:`, e);
        }
      };
      
      // 두 프로세스 실행 (Promise 직접 실행 방식으로 변경)
      console.log(`[${store.name}] 인증 및 예약 프로세스 시작...`);
      
      // 인증 페이지와 예약 페이지를 동시에 처리
      await Promise.all([
        handleAuthPage().catch(e => console.error(`[${store.name}] 인증 페이지 처리 예외:`, e)),
        handleAppointmentPage().catch(e => console.error(`[${store.name}] 예약 페이지 처리 예외:`, e))
      ]);
      
      // 브라우저 유지 (사용자가 직접 예약 진행)
      console.log(`[AppointmentService] 브라우저 인스턴스 반환`);
      return browser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${store.name}] 자동화 오류:`, error);
      this.updateAutomationStatus(store.name, 'error', `오류 발생: ${errorMessage}`);
      
      try {
        // 브라우저 인스턴스 반환 (유지)
        return browser;
      } catch (e) {
        console.error('브라우저 반환 중 오류:', e);
        return null;
      }
    }
  }
}

// CommonJS 방식으로 내보내기
module.exports = { AppointmentService }; 