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
                      path: `pass-popup-${store.id}-${Date.now()}.png`, 
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
    console.log(`[${store.name}] 예약 페이지 URL: ${store.url}appointment/`);
    let appointmentPage: Page | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 3가지 다른 방법으로 시도
        if (attempt === 1) {
          console.log(`[${store.name}] 예약 페이지로 이동 시도 #1: context.newPage()`);
          appointmentPage = await context.newPage();
        } else if (attempt === 2) {
          console.log(`[${store.name}] 예약 페이지로 이동 시도 #2: browser.newPage()`);
          appointmentPage = await browser.newPage();
        } else {
          console.log(`[${store.name}] 예약 페이지로 이동 시도 #3: 새 컨텍스트 생성`);
          const newContext = await browser.newContext();
          appointmentPage = await newContext.newPage();
        }

        // 예약 페이지로 직접 이동 - 타임아웃 증가 및 waitUntil 설정 변경
        console.log(`[${store.name}] 새 탭에서 직접 예약 페이지로 이동 중...`);
        await appointmentPage.goto(`${store.url}appointment/`, { 
          waitUntil: 'load', // 'networkidle' 대신 'load' 사용
          timeout: 60000 // 타임아웃 60초로 증가
        });
        
        // 추가 대기 시간
        console.log(`[${store.name}] 페이지 로드 후 추가 대기 중...`);
        await appointmentPage.waitForTimeout(5000);
        
        // 페이지가 제대로 로드됐는지 확인
        try {
          // URL 확인 - catch 메서드 사용하지 않고 try-catch로 감싸기
          let currentUrl = '';
          try {
            currentUrl = await appointmentPage.url();
          } catch (err) {
            console.log(`[${store.name}] URL 가져오기 실패:`, err);
            continue;
          }
          console.log(`[${store.name}] 현재 페이지 URL: ${currentUrl}`);
          
          if (currentUrl === 'about:blank') {
            console.log(`[${store.name}] 빈 페이지 로드됨 (${currentUrl}), 새로고침 시도...`);
            
            // 새로고침 시도
            try {
              await appointmentPage.goto(`${store.url}appointment/`, { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
              });
              await appointmentPage.waitForTimeout(3000);
              currentUrl = await appointmentPage.url();
              
              // 새로고침 후에도 about:blank인 경우
              if (currentUrl === 'about:blank' || !currentUrl.includes('appointment')) {
                console.log(`[${store.name}] 새로고침 후에도 문제가 지속됨, 재시도...`);
                continue;
              }
            } catch (reloadErr) {
              console.log(`[${store.name}] 새로고침 시도 실패:`, reloadErr);
              continue;
            }
          } else if (!currentUrl.includes('appointment')) {
            console.log(`[${store.name}] 잘못된 URL로 로드됨 (${currentUrl}), 재시도...`);
            continue; // 다음 시도로 넘어감
          }
          
          // 페이지 콘텐츠 확인 (HTML에서 특정 문자열이 있는지 확인)
          const pageContent = await appointmentPage.content();
          if (!pageContent.includes('rolex') && !pageContent.includes('appointment')) {
            console.log(`[${store.name}] 페이지 콘텐츠 확인 실패, 재시도...`);
            continue;
          }
          
          // 페이지에 특정 요소가 있는지 확인
          const hasContent = await appointmentPage.evaluate(() => {
            // 페이지에 의미 있는 콘텐츠가 있는지 확인
            const bodyContent = document.body.innerText;
            return bodyContent.length > 100; // 최소한의 콘텐츠가 있어야 함
          }).catch(() => false);
          
          if (!hasContent) {
            console.log(`[${store.name}] 페이지에 충분한 콘텐츠가 없음, 재시도...`);
            continue;
          }
          
        } catch (urlErr) {
          console.log(`[${store.name}] URL 확인 중 오류:`, urlErr);
          continue;
        }
        
        // 페이지가 올바르게 로드되었으면 반환
        console.log(`[${store.name}] 예약 페이지 로드 성공!`);
        return appointmentPage;
      } catch (err) {
        console.log(`[${store.name}] 예약 페이지 이동 실패 (시도 ${attempt}/${retries}):`, err);
        
        // 실패한 페이지 닫기
        if (appointmentPage) {
          try {
            // 페이지가 이미 닫혔는지 확인
            let isClosed = true;
            try {
              isClosed = await appointmentPage.isClosed();
            } catch (e) {
              console.log(`[${store.name}] 페이지 상태 확인 오류:`, e);
            }
            
            if (!isClosed) {
              try {
                await appointmentPage.close();
              } catch (e) {
                console.log(`[${store.name}] 페이지 닫기 실패:`, e);
              }
            }
          } catch (closeErr) {
            console.log(`[${store.name}] 페이지 닫기 중 오류:`, closeErr);
          }
        }
      }
    }
    
    console.log(`[${store.name}] 모든 시도 실패, 예약 페이지로 이동할 수 없음`);
    return null;
  }

  /**
   * 중지 확인 함수
   */
  private checkStopped(store: Store): void {
    if (!this.automationProcesses[store.id] || this.automationProcesses[store.id].stopped) {
      if (this.mainWindow) this.mainWindow.webContents.send('automation-status', { 
        storeId: store.id, 
        status: 'stopped', 
        message: '중지됨' 
      });
      throw new Error('중지됨');
    }
  }

  /**
   * 매장별 자동화 처리 메인 함수
   */
  async handleStore(store: Store): Promise<Browser> {
    const browser = await this.setupBrowser(store);
    const context = await browser.newContext();
    const page = await context.newPage();

    // AbortController 추가
    const abortController = new AbortController();
    this.automationProcesses[store.id] = this.automationProcesses[store.id] || {};
    this.automationProcesses[store.id].abortController = abortController;
    this.automationProcesses[store.id].browser = browser;

    try {
      // 0. 초기 페이지 로드
      this.checkStopped(store);
      this.updateStatus(store, 'waiting', '대기중');
      await page.goto(store.url, { waitUntil: 'networkidle', timeout: 20000 });

      // 1. 쿠키/광고 팝업 닫기
      this.checkStopped(store);
      this.updateStatus(store, 'cookie', '쿠키/광고 닫기중');
      await this.handleCookiesAndAds(page, store);

      // 2. 문의 버튼 클릭
      this.checkStopped(store);
      this.updateStatus(store, 'contact', '문의 버튼 클릭중');
      await this.clickContactButton(page, store);

      // 3. 메시지 입력 및 PASS 인증
      this.checkStopped(store);
      this.updateStatus(store, 'message', '메시지 입력중');
      const popup = await this.handleMessageAndPassAuth(context, page, store);

      // 4. 인증 완료 후 바로 예약 페이지로 이동 (이메일 입력 단계 생략)
      this.checkStopped(store);
      
      // 5. 자정 대기
      try {
        this.updateStatus(store, 'midnight', '자정까지 대기중');
        await waitUntilMidnight(store.config);
      } catch (midnightErr) {
        console.log(`[${store.name}] 자정 대기 중 오류 발생, 예약 진행:`, midnightErr);
      }

      // 6. 바로 예약 페이지로 이동
      this.checkStopped(store);
      this.updateStatus(store, 'navigating', '새 탭에서 예약 페이지로 직접 이동중');
      const appointmentPage = await this.navigateToAppointmentPage(browser, context, page, store, 3);
      
      if (!appointmentPage) {
        throw new Error('예약 페이지로 이동할 수 없습니다.');
      }

      // 7. 예약 버튼 클릭
      try {
        this.checkStopped(store);
        this.updateStatus(store, 'reserving', '예약 버튼 찾는 중');
        
        // 예약 버튼 찾기 실행 전 더 길게 대기 (봇 감지 우회)
        await humanDelay(5000, 10000);
        console.log(`[${store.name}] 봇 감지 우회를 위해 충분히 대기 후 예약 시도 시작`);
        
        // 예약 버튼 찾기 실행
        const buttonClicked = await this.findAndClickReservationButton(appointmentPage, store, 5);
        
        if (buttonClicked) {
          console.log(`[${store.name}] 예약 버튼 클릭 성공`);
          this.updateStatus(store, 'success', '예약 버튼 클릭 완료! 브라우저를 유지합니다.');
        } else {
          console.log(`[${store.name}] 예약 버튼을 찾지 못함, 수동 예약 대기`);
          this.updateStatus(store, 'warning', '예약 버튼을 찾지 못했습니다. 브라우저를 유지하며 수동 예약 대기 중입니다.');
        }
      } catch (e) {
        console.log(`[${store.name}] 예약 버튼 클릭 실패, 하지만 브라우저 유지:`, e);
        this.updateStatus(store, 'warning', '예약 버튼 클릭에 실패했으나, 브라우저는 유지됩니다. 수동으로 작업을 완료하세요.');
      }

      // 예약 프로세스 완료 후에도 브라우저 유지 (무한 대기)
      console.log(`[${store.name}] 예약 프로세스 완료, 브라우저 무한 유지 중`);
      
      // 무한 대기 (사용자가 중지할 때까지)
      while (true) {
        this.checkStopped(store); // 사용자가 중지 버튼을 누르면 여기서 예외가 발생하고 빠져나감
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10초마다 확인
        // mainWindow가 null인지 확인 후 상태 메시지 전송
        if (this.mainWindow && this.automationProcesses[store.id] && !this.automationProcesses[store.id].stopped) {
          this.mainWindow.webContents.send('automation-status', { 
            storeId: store.id, 
            status: 'maintain', 
            message: '세션 무한 유지 중 - 수동으로 중지할 때까지 브라우저를 유지합니다.' 
          });
        }
      }
    } catch (e) {
      const errMsg = (e && (e as any).message) ? (e as any).message : '';
      if (!this.automationProcesses[store.id] || this.automationProcesses[store.id].stopped || (errMsg && errMsg.includes('Browser has been closed'))) {
        this.updateStatus(store, 'stopped', '중지됨');
        return browser;
      }
      this.updateStatus(store, 'error', `자동화 실패: ${errMsg || '알 수 없는 오류'}`);
      console.error(`[${store.name}] 전체 자동화 실패:`, e);
    } finally {
      // 사용자가 명시적으로 중지한 경우에만 브라우저 닫기
      if (this.automationProcesses[store.id]?.stopped && browser && browser.isConnected()) {
        await browser.close();
      }
      // 중지된 경우에만 프로세스 정리
      if (this.automationProcesses[store.id]?.stopped) {
        delete this.automationProcesses[store.id];
      }
    }

    return browser;
  }

  /**
   * 브라우저 설정 함수
   */
  private async setupBrowser(store: Store): Promise<Browser> {
    const { chromium } = await import('playwright');
    return await chromium.launch({ headless: false });
  }

  /**
   * 상태 업데이트 함수
   */
  private updateStatus(store: Store, status: string, message: string): void {
    if (this.mainWindow) {
      const automationStatus: AutomationStatus = {
        storeId: store.id,
        status,
        message
      };
      this.mainWindow.webContents.send('automation-status', automationStatus);
    }
  }

  /**
   * 쿠키 및 광고 처리 함수
   */
  private async handleCookiesAndAds(page: Page, store: Store): Promise<void> {
    try {
      await page.click('button.cookies__button--accept', { timeout: 2000 });
      console.log(`[${store.name}] 쿠키 동의 버튼 클릭 성공`);
    } catch (e) {
      console.log(`[${store.name}] 쿠키 동의 버튼 없음 또는 이미 처리됨`);
    }
    try {
      await page.click('.popin-close', { timeout: 2000 });
      console.log(`[${store.name}] 광고/기타 팝업 닫기 성공`);
    } catch (e) {
      console.log(`[${store.name}] 광고/기타 팝업 없음 또는 이미 처리됨`);
    }
  }

  /**
   * 문의 버튼 클릭 함수
   */
  private async clickContactButton(page: Page, store: Store): Promise<void> {
    try {
      await page.waitForSelector('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a', { timeout: 10000 });
      this.checkStopped(store);
      await page.click('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      console.log(`[${store.name}] 문의 버튼 클릭 성공`);
    } catch (e) {
      this.updateStatus(store, 'error', '문의 버튼 클릭 실패');
      console.error(`[${store.name}] 문의 버튼 클릭 실패:`, e);
      throw e;
    }
  }

  /**
   * 메시지 입력 및 PASS 인증 처리
   */
  private async handleMessageAndPassAuth(
    context: BrowserContext,
    page: Page,
    store: Store
  ): Promise<Page | null> {
    try {
      // 메시지 입력 대기 및 입력
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // 페이지 안정화를 위한 대기
      await page.waitForSelector('#fmessage > div:nth-child(24) > div > textarea', { timeout: 10000, state: 'visible' });
      await page.fill('#fmessage > div:nth-child(24) > div > textarea', store.config.message);

      // PASS 인증 팝업 대기 및 메시지 전송
      const [popup] = await this.handlePopup(context, store, 
        page.click('#fmessage > div:nth-child(24) > footer > button')
      );

      if (!popup) {
        throw new Error('PASS 인증 팝업이 정상적으로 열리지 않았습니다.');
      }

      // PASS 인증 진행
      this.updateStatus(store, 'pass', 'PASS 인증중');
      
      // 통신사 선택
      const carrierSelectors = {
        'SKT': '#ct > form > fieldset > ul.agency_select__items > li:nth-child(1)',
        'KT': '#ct > form > fieldset > ul.agency_select__items > li:nth-child(2)',
        'LGU': '#ct > form > fieldset > ul.agency_select__items > li:nth-child(3)'
      };
      
      const carrierSelector = carrierSelectors[store.config.carrier as keyof typeof carrierSelectors];
      if (!carrierSelector) {
        throw new Error('올바르지 않은 통신사 설정');
      }

      // 통신사 버튼이 클릭 가능한 상태가 될 때까지 대기
      await popup.waitForSelector(carrierSelector, { state: 'visible' });
      await popup.click(carrierSelector);
      
      // 약관 동의 체크박스가 나타날 때까지 대기
      await popup.waitForSelector('#ct > form > fieldset > ul.agreelist.all > li > span > label:nth-child(2)', { 
        state: 'visible',
        timeout: 10000
      });
      await popup.click('#ct > form > fieldset > ul.agreelist.all > li > span > label:nth-child(2)');
      
      // PASS 인증하기 버튼이 활성화될 때까지 대기
      await popup.waitForSelector('#btnPass', { 
        state: 'visible',
        timeout: 10000
      });
      await popup.click('#btnPass');
      
      // QR 인증 버튼이 나타날 때까지 대기
      await popup.waitForSelector('#qr_auth', { 
        state: 'visible',
        timeout: 10000
      });
      await popup.click('#qr_auth');
      
      // 인증 완료 대기 - 팝업이 닫힐 때까지 무한 대기
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            // 팝업이 닫혔는지 확인
            if (!popup.isConnected()) {
              clearInterval(checkInterval);
              resolve();
            }
          } catch (error) {
            // 팝업이 이미 닫힌 경우
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);

        // 팝업 닫힘 이벤트도 함께 감지
        popup.on('close', () => {
          clearInterval(checkInterval);
          resolve();
        });
      });
      
      // 인증 후 페이지 전환 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);  // 대기 시간 유지

      return popup;
    } catch (e) {
      console.error(`[${store.name}] PASS 인증 중 오류:`, e);
      throw e;
    }
  }

  /**
   * 이메일 입력 및 동의 처리
   */
  private async fillEmailAndAgree(page: Page, store: Store): Promise<void> {
    try {
      // 페이지 안정화를 위한 추가 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(10000); // 10초로 증가
      
      console.log(`[${store.name}] 이메일 필드 대기 시작`);
      
      // 현재 페이지 내용 확인 (디버깅용)
      const pageContent = await page.content();
      const contentPreview = pageContent.substring(0, 500) + '... (truncated)';
      console.log(`[${store.name}] 페이지 HTML 미리보기:\n${contentPreview}`);
      
      // 현재 URL 확인
      const url = await page.url();
      console.log(`[${store.name}] 현재 URL: ${url}`);
      
      // 셀렉터 목록 - 여러 가능한 셀렉터를 시도
      const emailSelectors = [
        '#fmessage > div:nth-child(24) > div:nth-child(1) > div > input',
        'input[type="email"]',
        'input[placeholder*="mail"]',
        'div[data-v-] > div > input',
        'div.fields-row > div > input',
        // 추가 셀렉터 - 더 일반적인 것들
        'input[type="text"]',
        'input.form-control',
        '.field input',
        'form input',
        'div.input-wrapper input'
      ];
      
      // 페이지에서 모든 input 요소 찾기 시도 (더 일반적인 접근법)
      try {
        console.log(`[${store.name}] 페이지 내 모든 입력 필드 검색 중...`);
        const allInputs = await page.$$('input');
        console.log(`[${store.name}] 입력 필드 ${allInputs.length}개 발견`);
        
        // 첫 5개 입력 필드의 정보 로깅
        for (let i = 0; i < Math.min(5, allInputs.length); i++) {
          try {
            const type = await allInputs[i].getAttribute('type');
            const placeholder = await allInputs[i].getAttribute('placeholder');
            const id = await allInputs[i].getAttribute('id');
            const classAttr = await allInputs[i].getAttribute('class');
            console.log(`[${store.name}] 입력 #${i+1}: type=${type}, placeholder=${placeholder}, id=${id}, class=${classAttr}`);
            
            // 동적 셀렉터 추가
            if (id) emailSelectors.push(`#${id}`);
            if (classAttr) emailSelectors.push(`.${classAttr.replace(/\s+/g, '.')}`);
          } catch (attrErr) {
            console.log(`[${store.name}] 입력 #${i+1} 속성 읽기 실패`);
          }
        }
      } catch (inputScanErr) {
        console.log(`[${store.name}] 입력 필드 스캔 실패:`, inputScanErr);
      }
      
      // 모든 셀렉터 시도
      let emailInput = null;
      for (const selector of emailSelectors) {
        try {
          console.log(`[${store.name}] 이메일 셀렉터 시도: ${selector}`);
          emailInput = await page.waitForSelector(selector, {
            state: 'visible',
            timeout: 5000 // 각 셀렉터당 5초 타임아웃
          }).catch(() => null);
          
          if (emailInput) {
            console.log(`[${store.name}] 이메일 필드 발견: ${selector}`);
            break;
          }
        } catch (err) {
          console.log(`[${store.name}] 셀렉터 실패: ${selector}`);
          // 계속 진행
        }
      }
      
      // 좌표 기반 접근법 - 마지막 시도
      if (!emailInput) {
        try {
          console.log(`[${store.name}] 셀렉터 실패, 화면 중앙 부분 클릭 시도...`);
          
          // 페이지 크기 확인
          const size = await page.evaluate(() => {
            return {
              width: window.innerWidth,
              height: window.innerHeight
            };
          });
          
          // 화면 중앙 부분 클릭 시도
          await page.mouse.click(size.width / 2, size.height / 3);
          await page.keyboard.type(store.config.email);
          console.log(`[${store.name}] 화면 중앙 부분에 이메일 타이핑 시도`);
          
          // 성공 가정 (확인할 방법 없음)
          emailInput = true; 
        } catch (clickErr) {
          console.log(`[${store.name}] 좌표 기반 입력 실패:`, clickErr);
        }
      }
      
      if (!emailInput) {
        console.log(`[${store.name}] 이메일 필드를 찾을 수 없음, 스크린샷 저장 시도...`);
        
        // 스크린샷 저장 시도 (디버깅용)
        try {
          await page.screenshot({ 
            path: `email-field-error-${store.id}-${Date.now()}.png`, 
            fullPage: true 
          });
          console.log(`[${store.name}] 오류 상태 스크린샷 저장됨`);
        } catch (screenshotErr) {
          console.log(`[${store.name}] 스크린샷 저장 실패`);
        }
        
        // 일반 입력 필드를 찾아서 시도
        const foundInputs = await page.$$('input');
        if (foundInputs.length > 0) {
          console.log(`[${store.name}] 일반 입력 필드 발견, 첫 번째 필드에 입력 시도...`);
          await foundInputs[0].fill(store.config.email);
          console.log(`[${store.name}] 첫 번째 입력 필드에 이메일 입력 완료`);
        } else {
          // 여전히 입력 필드를 찾지 못한 경우 진행 계속 (다음 단계로)
          console.log(`[${store.name}] 어떤 입력 필드도 찾을 수 없음, 계속 진행...`);
        }
      } else if (typeof emailInput !== 'boolean') {
        // 이메일 입력 (셀렉터로 찾은 경우)
        await emailInput.fill(store.config.email);
        console.log(`[${store.name}] 이메일 입력 완료`);
      }
      
      // 약관 동의 셀렉터 목록 (넓은 범위로 확장)
      const agreeSelectors = [
        '#fmessage > div:nth-child(24) > div:nth-child(4) > div > div > label > span',
        'label.checkbox > span',
        'input[type="checkbox"] + span',
        'div.checkbox-wrapper label',
        // 추가 셀렉터
        'input[type="checkbox"]',
        'label.checkbox',
        '.agreement',
        '.consent',
        '.terms'
      ];
      
      // 약관 동의 시도
      let agreeCheckbox = null;
      for (const selector of agreeSelectors) {
        try {
          console.log(`[${store.name}] 약관 동의 셀렉터 시도: ${selector}`);
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
      
      // 이름 필드 시도 - 여러 셀렉터
      try {
        const nameSelectors = [
          '#fmessage > div:nth-child(24) > div:nth-child(2) > div > input',
          'input[placeholder*="name"]', 
          'input[placeholder*="이름"]',
          'input[name="name"]'
        ];
        
        for (const selector of nameSelectors) {
          const nameExists = await page.waitForSelector(selector, {
            state: 'visible',
            timeout: 3000
          }).then(() => true).catch(() => false);
          
          if (nameExists) {
            await page.fill(selector, store.config.name);
            console.log(`[${store.name}] 이름 입력 완료: ${selector}`);
            break;
          }
        }
      } catch (nameErr) {
        console.log(`[${store.name}] 이름 필드 입력 실패, 계속 진행: ${nameErr}`);
      }
      
      // 전화번호 필드 시도 - 여러 셀렉터
      try {
        const phoneSelectors = [
          '#fmessage > div:nth-child(24) > div:nth-child(3) > div > input',
          'input[placeholder*="phone"]',
          'input[placeholder*="전화"]',
          'input[placeholder*="연락처"]',
          'input[name="phone"]',
          'input[type="tel"]'
        ];
        
        for (const selector of phoneSelectors) {
          const phoneExists = await page.waitForSelector(selector, {
            state: 'visible',
            timeout: 3000
          }).then(() => true).catch(() => false);
          
          if (phoneExists) {
            await page.fill(selector, store.config.phone);
            console.log(`[${store.name}] 전화번호 입력 완료: ${selector}`);
            break;
          }
        }
      } catch (phoneErr) {
        console.log(`[${store.name}] 전화번호 필드 입력 실패, 계속 진행: ${phoneErr}`);
      }

      // 확인 버튼 대기 및 클릭 (인간처럼)
      await humanDelay(1000, 2000);
      
      const submitSelectors = [
        '#fmessage > div:nth-child(24) > footer > button',
        'footer > button',
        'button[type="submit"]',
        'button.primary',
        // 추가 셀렉터
        'input[type="submit"]',
        'button:not([disabled])',
        '.submit-btn',
        '.btn-primary',
        '.action-button'
      ];
      
      let submitClicked = false;
      for (const selector of submitSelectors) {
        try {
          console.log(`[${store.name}] 제출 버튼 셀렉터 시도: ${selector}`);
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
      
      // 마지막 시도 - 화면 하단 부분 클릭
      if (!submitClicked) {
        try {
          console.log(`[${store.name}] 셀렉터로 버튼을 찾지 못함, 화면 하단 중앙 클릭 시도...`);
          
          // 페이지 크기 확인
          const size = await page.evaluate(() => {
            return {
              width: window.innerWidth,
              height: window.innerHeight
            };
          });
          
          // 화면 하단 중앙 클릭
          await page.mouse.click(size.width / 2, size.height * 0.85);
          console.log(`[${store.name}] 화면 하단 중앙 클릭 시도 완료`);
          submitClicked = true;
        } catch (clickErr) {
          console.log(`[${store.name}] 화면 하단 클릭 실패:`, clickErr);
          console.log(`[${store.name}] 확인 버튼을 찾을 수 없어 계속 진행`);
        }
      }
      
      // 페이지 로드 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      console.log(`[${store.name}] 이메일 및 개인정보 입력 단계 완료`);
    } catch (e) {
      console.error(`[${store.name}] 이메일 및 개인정보 입력 실패:`, e);
      // 스크린샷 저장 시도 (오류 발생 시)
      try {
        await page.screenshot({ 
          path: `email-error-${store.id}-${Date.now()}.png`, 
          fullPage: true 
        });
        console.log(`[${store.name}] 오류 스크린샷 저장됨`);
      } catch (screenshotErr) {
        console.log(`[${store.name}] 오류 스크린샷 저장 실패`);
      }
      
      // 에러를 던지지 않고 다음 단계로 진행 시도
      console.log(`[${store.name}] 오류 무시하고 다음 단계 진행 시도`);
    }
  }
} 