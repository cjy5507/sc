import { StoreConfig } from '../types';

/**
 * 자정까지 대기하는 함수
 */
export async function waitUntilMidnight(config: StoreConfig): Promise<void> {
  const now = new Date();
  
  // 테스트 모드일 경우 대기 시간을 짧게 유지
  if (config.testMode) {
    console.log('테스트 모드: 자정 대기를 10초로 단축합니다.');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 테스트 모드에서는 10초만 대기
    return;
  }
  
  // 자정 계산 및 대기
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const timeUntilMidnight = midnight.getTime() - now.getTime();
  
  if (timeUntilMidnight > 0) {
    console.log(`자정까지 ${Math.floor(timeUntilMidnight / 1000 / 60)} 분 ${Math.floor(timeUntilMidnight / 1000) % 60} 초 대기합니다.`);
    await new Promise(resolve => setTimeout(resolve, timeUntilMidnight));
  }
}

/**
 * 지정된 범위 내에서 랜덤한 시간만큼 대기하는 함수
 * @param minMs 최소 대기 시간 (ms)
 * @param maxMs 최대 대기 시간 (ms)
 * @returns Promise<void>
 */
export async function humanDelay(minMs = 500, maxMs = 1000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 현재 시간이 매월 말일인지 확인하는 함수
 * @returns boolean
 */
export function isLastDayOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // 내일이 다음 달의 1일이면 오늘은 이번 달의 마지막 날
  return tomorrow.getDate() === 1;
}

/**
 * 현재 시간이 자정(00:00:00)에 근접한지 확인하는 함수
 * @param thresholdSeconds 자정으로부터의 임계값(초)
 * @returns boolean
 */
export function isNearMidnight(thresholdSeconds = 5): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // 자정 또는 자정에 가까운 시간인지 확인
  if (hours === 0 && minutes === 0 && seconds < thresholdSeconds) {
    return true;
  }
  
  // 자정 직전인지 확인 (23:59:xx)
  if (hours === 23 && minutes === 59 && seconds > (60 - thresholdSeconds)) {
    return true;
  }
  
  return false;
}

/**
 * 이번 달의 마지막 날을 반환하는 함수
 * @returns Date 이번 달의 마지막 날(자정)
 */
export function getLastDayOfMonth(): Date {
  const now = new Date();
  // 다음 달의 0일 = 현재 달의 마지막 날
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

/**
 * 이번 달 말일 자정까지 남은 시간(밀리초)을 계산
 * @returns number 말일 자정까지 남은 밀리초
 */
export function getTimeToMonthEndMidnight(): number {
  const now = new Date();
  const lastDay = getLastDayOfMonth();
  // 말일 자정으로 설정
  const midnight = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * 이번 달 말일 자정까지 남은 시간(밀리초)을 계산 (getTimeToMonthEndMidnight의 별칭)
 * @returns number 말일 자정까지 남은 밀리초
 */
export function getTimeUntilMonthEndMidnight(): number {
  return getTimeToMonthEndMidnight();
}

/**
 * 이번 달 말일 자정 59초 전까지 대기하는 함수
 * @returns Promise<void>
 */
export async function waitUntilMonthEndPreMidnight(): Promise<void> {
  const now = new Date();
  const lastDay = getLastDayOfMonth();
  
  // 오늘이 말일이 아니면 함수 종료
  if (now.getDate() !== lastDay.getDate()) {
    console.log('오늘은 말일이 아닙니다. 말일에 다시 시도해주세요.');
    return;
  }
  
  // 현재 시간이 23:59:00 이후면 함수 종료
  if (now.getHours() === 23 && now.getMinutes() === 59 && now.getSeconds() >= 0) {
    console.log('이미 말일 자정 1분 전입니다.');
    return;
  }
  
  // 말일 23:59:00 생성
  const preMidnight = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 0, 0);
  const waitTime = preMidnight.getTime() - now.getTime();
  
  if (waitTime <= 0) {
    console.log('이미 말일 23:59:00이 지났습니다.');
    return;
  }
  
  console.log(`말일 23:59:00까지 ${Math.floor(waitTime / 1000 / 60)} 분 ${Math.floor(waitTime / 1000) % 60} 초 대기합니다.`);
  await new Promise(resolve => setTimeout(resolve, waitTime));
  console.log('말일 23:59:00에 도달했습니다. 자정 정각 예약 준비를 시작합니다.');
}

/**
 * 정확히 자정에 예약 버튼 클릭을 실행합니다.
 * @param page Playwright Page 객체
 * @param selector 클릭할 요소의 CSS 선택자 또는 선택자 배열
 * @returns Promise<boolean> 클릭 성공 여부
 */
export async function executeExactMidnightReservation(
  page: any,
  selector: string | string[]
): Promise<boolean> {
  try {
    // 선택자를 배열로 변환
    const selectors = Array.isArray(selector) ? selector : [selector];
    console.log(`자정 예약 실행 준비: ${selectors.length}개의 선택자 사용`);
    
    // HTML 덤프 저장 함수 (디버깅용)
    const saveHtmlDump = async (prefix: string) => {
      try {
        const html = await page.content();
        const fs = require('fs');
        const path = require('path');
        const htmlPath = path.join(process.cwd(), `${prefix}-html-${Date.now()}.html`);
        fs.writeFileSync(htmlPath, html);
        console.log(`HTML 덤프 저장 완료: ${htmlPath}`);
        return htmlPath;
      } catch (error) {
        console.error('HTML 덤프 저장 실패:', error);
        return null;
      }
    };
    
    // 현재 시간과 다음 자정까지의 대기 시간 계산
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // 다음 날 00:00:00
    let waitTime = midnight.getTime() - now.getTime();
    
    // 디버깅용 시간 로그
    console.log(`현재 시간: ${now.toLocaleTimeString()}`);
    console.log(`목표 자정 시간: ${midnight.toLocaleTimeString()}`);
    console.log(`자정까지 대기 시간: ${waitTime}ms (약 ${Math.round(waitTime/1000/60)}분 ${Math.round((waitTime/1000) % 60)}초)`);
    
    // 테스트 모드 (즉시 실행)
    const isTestMode = process.env.NODE_ENV === 'development';
    if (isTestMode) {
      console.log('⚠️ 테스트 모드: 즉시 실행 모드로 동작합니다.');
      waitTime = 100; // 0.1초만 대기
    }
    
    // 자정 1초 전에 페이지 리프레시 (새로운 요소 로드)
    if (waitTime > 1000 && !isTestMode) {
      console.log(`자정 1초 전에 페이지를 새로고침합니다...`);
      const refreshTime = waitTime - 1000;
      await new Promise(resolve => setTimeout(resolve, refreshTime));
      
      console.log(`페이지 새로고침 시작 - 자정 1초 전`);
      await page.reload({ waitUntil: 'networkidle' });
      console.log(`페이지 새로고침 완료`);
      
      // 예약 버튼을 찾기 위한 준비
      waitTime = 1000; // 자정까지 1초 남음
      
      // 페이지 새로고침 후 현재 HTML 덤프 저장 (디버깅용)
      await saveHtmlDump('refresh-complete');
    }
    
    // 자정까지 대기
    console.log(`자정까지 마지막 대기: ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // 현재 시각 기록 (디버깅용)
    const clickTime = new Date();
    console.log(`클릭 시도 시각: ${clickTime.toLocaleTimeString()}.${clickTime.getMilliseconds()}`);
    
    // 페이지 전체 스크린샷 (클릭 시도 전)
    const beforeClickScreenshotPath = await page.screenshot({ 
      path: `reservation-before-click-${Date.now()}.png`,
      fullPage: true 
    });
    console.log(`클릭 시도 전 스크린샷 저장: ${beforeClickScreenshotPath}`);
    
    // HTML 덤프 저장 (클릭 시도 전)
    await saveHtmlDump('before-click');
    
    // DOM에서 모든 가능한 예약 관련 요소 찾기 (더 적극적인 방법)
    console.log('페이지에서 모든 가능한 예약 관련 요소 찾는 중...');
    
    // DOM 전체에서 "예약", "appointment" 등의 텍스트가 포함된 모든 요소 검색
    const reservationTexts = ['예약', 'Appointment', 'Reserve', 'Book', 'Booking'];
    const additionalSelectors = [];
    
    // JavaScript 실행을 통해 텍스트 기반 요소 찾기
    for (const text of reservationTexts) {
      try {
        const elements = await page.evaluate((searchText: string) => {
          const allElements = Array.from(document.querySelectorAll('a, button, div[role="button"], span[role="button"], input[type="submit"]'));
          return allElements
            .filter(el => {
              const elementText = el.textContent || '';
              const elementValue = (el as HTMLInputElement).value || '';
              const elementAriaLabel = el.getAttribute('aria-label') || '';
              return elementText.includes(searchText) || 
                    elementValue.includes(searchText) || 
                    elementAriaLabel.includes(searchText);
            })
            .map(el => {
              // 요소의 고유 식별자 생성 시도
              const id = el.id ? `#${el.id}` : '';
              const classNames = Array.from(el.classList).map(c => `.${c}`).join('');
              const tagName = el.tagName.toLowerCase();
              
              // 속성을 통한 선택자
              const attributes = [];
              if (el.hasAttribute('role')) attributes.push(`[role="${el.getAttribute('role')}"]`);
              if (el.hasAttribute('type')) attributes.push(`[type="${el.getAttribute('type')}"]`);
              if (el.hasAttribute('name')) attributes.push(`[name="${el.getAttribute('name')}"]`);
              
              // 다양한 선택자 생성
              return [
                id ? id : null,
                classNames ? `${tagName}${classNames}` : null,
                attributes.length > 0 ? `${tagName}${attributes.join('')}` : null,
                `${tagName}:contains("${searchText}")`, // 의사 선택자 (실제로는 지원되지 않지만 참고용)
                `${tagName}[aria-label*="${searchText}"]`
              ].filter(Boolean); // null 제거
            });
        }, text);
        
        // 평탄화 및 중복 제거
        const flattenedSelectors = [...new Set(elements.flat().filter(Boolean))];
        additionalSelectors.push(...flattenedSelectors);
        console.log(`"${text}" 관련 추가 선택자 ${flattenedSelectors.length}개 찾음`);
      } catch (error) {
        console.error(`"${text}" 관련 요소 검색 중 오류:`, error);
      }
    }
    
    // 찾은 모든 선택자 출력 (디버깅용)
    console.log('찾은 모든 추가 선택자:', additionalSelectors);
    
    // 원본 선택자와 추가 선택자 결합
    const allSelectors = [...selectors, ...additionalSelectors];
    console.log(`총 ${allSelectors.length}개의 선택자로 클릭 시도 예정`);
    
    // 사용 가능한 선택자 중 첫 번째로 찾을 수 있는 것을 사용하여 클릭
    let clickSuccess = false;
    let foundSelector = null;
    
    // 일반 클릭 시도
    for (const currentSelector of allSelectors) {
      try {
        // 선택자가 유효한지 확인
        if (!currentSelector || typeof currentSelector !== 'string') continue;
        
        // 선택자에 해당하는 요소가 있는지 확인
        console.log(`선택자 시도: ${currentSelector}`);
        const elementExists = await page.$(currentSelector);
        
        if (elementExists) {
          console.log(`선택자 발견: ${currentSelector}`);
          foundSelector = currentSelector;
          
          // 요소가 화면에 보이는지 확인
          const isVisible = await elementExists.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`선택자 ${currentSelector}가 화면에 보입니다. 클릭 시도...`);
            
            // 요소를 화면 중앙에 스크롤
            await elementExists.scrollIntoViewIfNeeded();
            console.log('요소를 화면 중앙으로 스크롤 완료');
            
            // 클릭 시도 (최대 3번)
            for (let i = 0; i < 3; i++) {
              try {
                // 먼저 일반 클릭 시도
                await page.click(currentSelector, { force: true });
                console.log(`클릭 성공! 선택자: ${currentSelector}, 시도: ${i+1}`);
                clickSuccess = true;
                break;
              } catch (clickError) {
                console.log(`일반 클릭 시도 ${i+1} 실패: ${(clickError as Error).message}`);
                
                // 일반 클릭 실패 시 다른 방법 시도
                try {
                  // 방법 1: 자바스크립트로 직접 클릭 이벤트 발생
                  console.log(`대체 방법 1: 자바스크립트 클릭 이벤트 발생 시도`);
                  await page.evaluate((selector: string) => {
                    const element = document.querySelector(selector) as HTMLElement;
                    if (element) {
                      element.click();
                      return true;
                    }
                    return false;
                  }, currentSelector);
                  
                  // 3초 대기하며 URL 또는 DOM 변화 감지
                  console.log('클릭 이벤트 발생 후 변화 감지 대기 중...');
                  const changeDetected = await Promise.race([
                    page.waitForNavigation({ timeout: 3000 }).then(() => true).catch(() => false),
                    page.waitForFunction(() => {
                      // 예약 성공 메시지나 form 등장 감지
                      return document.querySelector('form[id*="appointment"], div[class*="success"], .confirmation');
                    }, { timeout: 3000 }).then(() => true).catch(() => false),
                    new Promise(r => setTimeout(() => r(false), 3000)) // 3초 타임아웃
                  ]);
                  
                  if (changeDetected) {
                    console.log('페이지 변화 감지됨 - 클릭 성공!');
                    clickSuccess = true;
                    break;
                  }
                  
                  // 방법 2: 좌표로 클릭
                  console.log(`대체 방법 2: 요소 좌표로 직접 클릭 시도`);
                  const boundingBox = await elementExists.boundingBox();
                  if (boundingBox) {
                    await page.mouse.click(
                      boundingBox.x + boundingBox.width/2,
                      boundingBox.y + boundingBox.height/2
                    );
                    console.log(`좌표 클릭 시도 완료: x=${boundingBox.x + boundingBox.width/2}, y=${boundingBox.y + boundingBox.height/2}`);
                    
                    // 3초 대기하며 URL 또는 DOM 변화 감지
                    const changeDetected = await Promise.race([
                      page.waitForNavigation({ timeout: 3000 }).then(() => true).catch(() => false),
                      page.waitForFunction(() => {
                        // 예약 성공 메시지나 form 등장 감지
                        return document.querySelector('form[id*="appointment"], div[class*="success"], .confirmation');
                      }, { timeout: 3000 }).then(() => true).catch(() => false),
                      new Promise(r => setTimeout(() => r(false), 3000)) // 3초 타임아웃
                    ]);
                    
                    if (changeDetected) {
                      console.log('페이지 변화 감지됨 - 좌표 클릭 성공!');
                      clickSuccess = true;
                      break;
                    }
                  }
                } catch (alternativeClickError) {
                  console.log(`대체 클릭 방법 실패: ${(alternativeClickError as Error).message}`);
                }
                
                if (i < 2) await new Promise(r => setTimeout(r, 300)); // 300ms 기다린 후 재시도
              }
            }
            
            if (clickSuccess) break; // 클릭 성공시 루프 종료
          } else {
            console.log(`선택자 ${currentSelector}가 존재하지만 화면에 보이지 않습니다. 스크롤 시도...`);
            
            // 보이지 않는 요소 스크롤 시도
            try {
              await elementExists.scrollIntoViewIfNeeded();
              console.log('요소를 화면으로 스크롤 완료, 다시 확인...');
              
              // 스크롤 후 다시 가시성 확인
              const isVisibleAfterScroll = await elementExists.isVisible().catch(() => false);
              if (isVisibleAfterScroll) {
                console.log('스크롤 후 요소가 보입니다. 클릭 시도...');
                await page.click(currentSelector, { force: true });
                console.log(`스크롤 후 클릭 성공! 선택자: ${currentSelector}`);
                clickSuccess = true;
                break;
              } else {
                console.log('스크롤 후에도 요소가 보이지 않습니다.');
              }
            } catch (scrollError) {
              console.log(`요소 스크롤 시도 실패: ${(scrollError as Error).message}`);
            }
          }
        } else {
          console.log(`선택자 ${currentSelector}를 찾을 수 없습니다.`);
        }
      } catch (selectorError) {
        console.log(`선택자 ${currentSelector} 처리 중 오류: ${(selectorError as Error).message}`);
      }
    }
    
    // 클릭 후 HTML 덤프 저장 (디버깅용)
    await saveHtmlDump('after-click');
    
    // 클릭 성공 여부에 따른 스크린샷 캡처
    try {
      const screenshotTime = new Date();
      const filename = `reservation-${clickSuccess ? 'success' : 'fail'}-${screenshotTime.getTime()}.png`;
      console.log(`최종 스크린샷 캡처 중: ${filename}`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`최종 스크린샷 저장 완료: ${filename}`);
    } catch (screenshotError) {
      console.log(`최종 스크린샷 캡처 실패: ${(screenshotError as Error).message}`);
    }
    
    // 로그 기록
    if (clickSuccess) {
      console.log(`예약 버튼 클릭 성공! 사용된 선택자: ${foundSelector}`);
      
      // 성공 후 페이지 변화 감지
      console.log('예약 성공 후 페이지 변화 감지 중...');
      try {
        // 페이지 URL 또는 내용 변화 감지 (예약 성공 여부 확인)
        const currentUrl = page.url();
        console.log(`현재 URL: ${currentUrl}`);
        
        // 성공 메시지 또는 예약 폼 검사
        const successContent = await page.evaluate(() => {
          // 가능한 성공 메시지나 예약 폼 검색
          const successElements = document.querySelectorAll(
            '.success, .confirmation, form[id*="appointment"], form[class*="appointment"], ' +
            'div:has-text("예약 완료"), div:has-text("예약이 성공"), div:has-text("Appointment Confirmed")'
          );
          
          if (successElements.length > 0) {
            return Array.from(successElements).map(el => ({
              text: el.textContent?.substring(0, 100),
              elementType: el.tagName
            }));
          }
          return null;
        });
        
        if (successContent) {
          console.log('예약 성공 흔적 발견:', successContent);
        } else {
          console.log('예약은 성공했으나 성공 메시지를 찾을 수 없음');
        }
      } catch (confirmError) {
        console.log('예약 성공 확인 중 오류:', confirmError);
      }
    } else {
      console.log(`예약 버튼 클릭 실패. 시도한 모든 선택자: ${allSelectors.length}개`);
      
      // 디버깅: 페이지에서 클릭 가능한 모든 요소 출력
      try {
        console.log('페이지 내 모든 클릭 가능한 요소 탐색 중...');
        const clickableElements = await page.$$('button, a, [role="button"], input[type="submit"], input[type="button"]');
        console.log(`클릭 가능한 요소 수: ${clickableElements.length}`);
        
        for (let i = 0; i < Math.min(clickableElements.length, 20); i++) { // 최대 20개만 출력
          try {
            const element = clickableElements[i];
            const text = await element.innerText().catch(() => 'No text');
            const id = await element.getAttribute('id').catch(() => 'No ID');
            const classes = await element.getAttribute('class').catch(() => 'No class');
            const href = await element.getAttribute('href').catch(() => 'No href');
            const role = await element.getAttribute('role').catch(() => 'No role');
            const type = await element.getAttribute('type').catch(() => 'No type');
            
            console.log(`클릭 가능한 요소 ${i+1}:`, {
              text: text.substring(0, 30),
              id,
              classes,
              href: href ? href.substring(0, 30) : 'No href',
              role,
              type
            });
          } catch (error) {
            console.log(`요소 ${i+1} 정보 가져오기 실패:`, error);
          }
        }
      } catch (error) {
        console.log('클릭 가능한 요소 탐색 실패:', error);
      }
    }
    
    return clickSuccess;
  } catch (error) {
    console.error('자정 예약 실행 중 오류:', error);
    return false;
  }
} 

/**
 * 쿠키 동의 팝업을 닫고 자정에 예약 버튼을 클릭합니다
 * @param page Playwright Page 객체
 * @param cookieSelector 쿠키 동의 버튼의 CSS 선택자
 * @param reservationSelectors 예약 버튼의 CSS 선택자 또는 선택자 배열
 * @returns Promise<boolean> 예약 클릭 성공 여부
 */
export async function executeReservationWithCookieHandling(
  page: any,
  cookieSelector: string,
  reservationSelectors: string | string[]
): Promise<boolean> {
  try {
    console.log('[TimeUtils] executeReservationWithCookieHandling 함수 시작');
    
    const currentUrl = page.url();
    console.log(`[TimeUtils] 현재 페이지 URL: ${currentUrl}`);
    const pageTitle = await page.title();
    console.log(`[TimeUtils] 현재 페이지 타이틀: ${pageTitle}`);
    
    try {
      const screenshotPath = `debug-reservation-start-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[TimeUtils] 함수 시작 스크린샷: ${screenshotPath}`);
    } catch (e) { console.log(`[TimeUtils] 스크린샷 저장 실패: ${(e as Error).message}`); }

    // 쿠키 동의 팝업 처리
    try {
      console.log(`[TimeUtils] 쿠키 동의 팝업 확인 중... 선택자: ${cookieSelector}`);
      const cookieElement = await page.$(cookieSelector);
      
      if (cookieElement) {
        console.log('[TimeUtils] 쿠키 동의 팝업 발견. 닫기 시도...');
        
        // 쿠키 버튼 클릭 시도
        try {
          await cookieElement.click({ force: true });
          console.log('[TimeUtils] 쿠키 동의 버튼 클릭 성공');
          await page.waitForTimeout(1000);
        } catch (clickError) {
          console.log(`[TimeUtils] 쿠키 버튼 클릭 실패: ${(clickError as Error).message}`);
          
          // JavaScript 클릭 시도
          try {
            await page.evaluate((selector: string) => {
              const element = document.querySelector(selector);
              if (element) (element as HTMLElement).click();
            }, cookieSelector);
            console.log('[TimeUtils] 쿠키 동의 버튼 JavaScript 클릭 성공');
            await page.waitForTimeout(1000);
          } catch (jsError) {
            console.log(`[TimeUtils] 쿠키 버튼 JavaScript 클릭 실패: ${(jsError as Error).message}`);
          }
        }
      } else {
        console.log('[TimeUtils] 쿠키 동의 팝업을 찾을 수 없거나 이미 처리됨');
      }
    } catch (cookieError) {
      console.log(`[TimeUtils] 쿠키 동의 팝업 처리 중 오류: ${(cookieError as Error).message}`);
    }
    
    // 테스트 모드 확인
    const isTestMode = process.env.NODE_ENV === 'development';
    console.log(`[TimeUtils] 현재 모드: ${isTestMode ? '테스트 모드' : '프로덕션 모드'}`);
    
    // 자정 상태 확인
    const nearMidnight = isNearMidnight();
    console.log(`[TimeUtils] 자정 상태: ${nearMidnight ? '자정 근처' : '자정 아님'}`);
    
    // 자정이 아니거나 테스트 모드일 경우 컬렉션 선택 및 동의 버튼 클릭 처리
    if (isTestMode || !isNearMidnight()) {
      try {
        console.log('[TimeUtils] 컬렉션 선택 프로세스 시작...');
        
        // HTML 덤프 (디버깅용)
        try {
          const htmlStructure = await page.evaluate(() => {
            return {
              url: window.location.href,
              title: document.title,
              forms: Array.from(document.forms).map(f => ({ id: f.id, action: f.action })),
              buttons: Array.from(document.querySelectorAll('button')).map(b => ({ 
                text: b.textContent?.trim(), 
                name: b.getAttribute('name'),
                type: b.getAttribute('type')
              })).slice(0, 5),
              links: Array.from(document.querySelectorAll('a')).map(a => ({ 
                text: a.textContent?.trim(), 
                href: a.getAttribute('href'),
                onclick: a.getAttribute('onclick')
              })).slice(0, 5)
            };
          });
          console.log('페이지 HTML 구조:', JSON.stringify(htmlStructure, null, 2));
        } catch (htmlError) {
          console.log(`HTML 구조 분석 실패: ${(htmlError as Error).message}`);
        }
        
        // 컬렉션 선택 요소에 대한 선택자들
        const collectionSelectors = [
          '#fappointment > div:nth-child(24) > div > div > a:nth-child(1)',
          'a.purpose[onclick*="select_type(\'collection\')"]',
          'a[onclick*="select_type(\'collection\')"]',
          '.purpose'
        ];
        
        console.log(`[TimeUtils] 사용할 컬렉션 선택자들: ${collectionSelectors.join(', ')}`);
        
        // 컬렉션 선택 클릭 시도
        let collectionClicked = false;
        
        for (const collectionSelector of collectionSelectors) {
          if (collectionClicked) break;
          console.log(`[TimeUtils] 컬렉션 선택 시도: ${collectionSelector}`);
          const collectionElement = await page.$(collectionSelector);
          
          if (collectionElement) {
            // 요소가 화면에 보이는지 확인
            const isVisible = await collectionElement.isVisible().catch(() => false);
            
            if (isVisible) {
              console.log(`[TimeUtils] 컬렉션 요소 발견 및 클릭 시도: ${collectionSelector}`);
              
              // 스크린샷 캡처 (디버깅용)
              try {
                const screenshotPath = `debug-collection-element-found-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath });
                console.log(`[TimeUtils] 컬렉션 요소 발견 스크린샷 저장: ${screenshotPath}`);
              } catch (screenshotError) {
                console.log(`[TimeUtils] 스크린샷 저장 실패: ${(screenshotError as Error).message}`);
              }
              
              // 1. 일반 클릭 시도
              try {
                await collectionElement.click({ force: true });
                console.log('[TimeUtils] 컬렉션 선택 일반 클릭 성공');
                collectionClicked = true;
              } catch (clickError) {
                console.log(`[TimeUtils] 컬렉션 일반 클릭 실패: ${(clickError as Error).message}`);
                
                // 2. 자바스크립트 직접 함수 호출 시도
                try {
                  await page.evaluate(() => {
                    // 전역 함수 호출 시도 (window 객체의 속성으로 접근)
                    const win = window as any;
                    if (typeof win.select_type === 'function') {
                      win.select_type('collection');
                      return true;
                    }
                    return false;
                  });
                  console.log('[TimeUtils] 컬렉션 선택 JS 함수 호출 시도');
                  collectionClicked = true;
                } catch (jsError) {
                  console.log(`[TimeUtils] 컬렉션 JS 함수 호출 실패: ${(jsError as Error).message}`);
                  
                  // 3. JS click() 시도
                  try {
                    await page.evaluate((selector: string) => {
                      const element = document.querySelector(selector) as HTMLElement;
                      if (element) {
                        element.click();
                        return true;
                      }
                      return false;
                    }, collectionSelector);
                    console.log('[TimeUtils] 컬렉션 JS click() 호출 성공');
                    collectionClicked = true;
                  } catch (jsClickError) {
                    console.log(`[TimeUtils] 컬렉션 JS click() 실패: ${(jsClickError as Error).message}`);
                  }
                }
              }
              
              if (collectionClicked) break;
            } else {
              console.log(`[TimeUtils] 컬렉션 요소 발견되었으나 보이지 않음: ${collectionSelector}`);
            }
          } else {
            console.log(`[TimeUtils] 컬렉션 요소를 찾을 수 없음: ${collectionSelector}`);
          }
        }
        
        if (collectionClicked) {
          console.log('[TimeUtils] 컬렉션 선택 성공. 동의 버튼 대기 및 클릭 시도...');
          await page.waitForTimeout(2000); // 페이지 업데이트 대기
          try {
            const screenshotPath = `debug-after-collection-click-${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`[TimeUtils] 컬렉션 클릭 후 스크린샷: ${screenshotPath}`);
          } catch (e) { console.log(`[TimeUtils] 스크린샷 저장 실패: ${(e as Error).message}`); }
          
          // 잠시 대기하여 페이지 업데이트 허용
          console.log('페이지 업데이트 대기 중...');
          await page.waitForTimeout(2000);
          
          // 페이지 변화 감지를 위한 HTML 덤프 (디버깅용)
          try {
            const htmlStructure = await page.evaluate(() => {
              return {
                url: window.location.href,
                title: document.title,
                forms: Array.from(document.forms).map(f => ({ id: f.id, action: f.action })),
                buttons: Array.from(document.querySelectorAll('button')).map(b => ({ 
                  text: b.textContent?.trim(), 
                  name: b.getAttribute('name'),
                  type: b.getAttribute('type')
                })).slice(0, 5),
                agreeButtons: Array.from(document.querySelectorAll('button')).filter(b => 
                  b.textContent?.includes('동의') || 
                  b.getAttribute('name') === 'submit_appointment'
                ).map(b => ({ 
                  text: b.textContent?.trim(), 
                  name: b.getAttribute('name'),
                  type: b.getAttribute('type')
                }))
              };
            });
            console.log('컬렉션 클릭 후 페이지 HTML 구조:', JSON.stringify(htmlStructure, null, 2));
          } catch (htmlError) {
            console.log(`HTML 구조 분석 실패: ${(htmlError as Error).message}`);
          }
          
          // 동의 버튼이 나타날 때까지 기다림 (최대 5초)
          try {
            const agreeButtonSelectors = [
              'button[name="submit_appointment"].rolex-button',
              'button.rolex-button:contains("동의합니다")',
              '//button[normalize-space()="동의합니다"]' // XPath 추가
            ];
            
            console.log(`[TimeUtils] 사용할 동의 버튼 선택자들: ${agreeButtonSelectors.join(', ')}`);
            
            // 각 선택자에 대해 기다림 시도
            let agreeButtonClicked = false;
            
            for (const agreeSelector of agreeButtonSelectors) {
              if (agreeButtonClicked) break;
              console.log(`[TimeUtils] 동의 버튼 확인 시도: ${agreeSelector}`);
              
              try {
                console.log(`동의 버튼 대기 중: ${agreeSelector}`);
                
                // 선택자가 나타날 때까지 기다림
                const buttonVisible = await Promise.race([
                  page.waitForSelector(agreeSelector, { state: 'visible', timeout: 5000 })
                    .then(() => true)
                    .catch(() => false),
                  new Promise(r => setTimeout(() => r(false), 5000)) // 5초 타임아웃
                ]);
                
                if (buttonVisible) {
                  console.log(`동의 버튼 발견: ${agreeSelector}`);
                  
                  // 자정까지 기다리기 전에 스크린샷 캡처 (디버깅용)
                  try {
                    const screenshotPath = `agree-button-found-${Date.now()}.png`;
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`동의 버튼 발견 스크린샷 저장: ${screenshotPath}`);
                  } catch (screenshotError) {
                    console.log('동의 버튼 발견 스크린샷 저장 실패:', screenshotError);
                  }
                  
                  // 테스트 모드라면 바로 동의 버튼 클릭
                  if (isTestMode) {
                    try {
                      console.log(`테스트 모드: 동의 버튼 클릭 시도 (${agreeSelector})`);
                      await page.click(agreeSelector, { force: true });
                      console.log('테스트 모드: 동의 버튼 클릭 성공!');
                      return true;
                    } catch (agreeClickError) {
                      console.log(`테스트 모드: 동의 버튼 클릭 실패: ${(agreeClickError as Error).message}`);
                      
                      // JS 클릭 시도
                      try {
                        await page.evaluate((selector: string) => {
                          const element = document.querySelector(selector) as HTMLElement;
                          if (element) element.click();
                        }, agreeSelector);
                        console.log('테스트 모드: 동의 버튼 JS 클릭 성공!');
                        return true;
                      } catch (jsClickError) {
                        console.log(`테스트 모드: 동의 버튼 JS 클릭 실패: ${(jsClickError as Error).message}`);
                      }
                    }
                  }
                  
                  // 자정 모드라면 해당 선택자를 reservationSelectors에 추가
                  reservationSelectors = Array.isArray(reservationSelectors) ? 
                    [agreeSelector, ...reservationSelectors] : 
                    [agreeSelector, reservationSelectors];
                  
                  console.log('동의 버튼 선택자를 우선순위로 추가:', agreeSelector);
                  break;
                }
              } catch (waitError) {
                console.log(`동의 버튼 대기 중 오류: ${(waitError as Error).message}`);
              }
            }
          } catch (agreeButtonError) {
            console.log(`동의 버튼 처리 중 오류: ${(agreeButtonError as Error).message}`);
          }
        } else {
          console.log('컬렉션 선택 실패. 기본 예약 프로세스로 진행...');
        }
      } catch (collectionProcessError) {
        console.log(`컬렉션 선택 프로세스 중 오류: ${(collectionProcessError as Error).message}`);
      }
    }
    
    // 기본 예약 선택자에 사용자가 제공한 추가 선택자들 추가
    const specificSelectors = Array.isArray(reservationSelectors) ? reservationSelectors : [reservationSelectors];
    
    // 롤렉스 예약 페이지에서 자주 사용되는 추가 선택자들
    const commonSelectors = [
      '#fappointment > div:nth-child(24) > div > div > a:nth-child(1)',
      '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.picture-wrap > picture > img',
      '#fappointment > div:nth-child(25) > footer > button',
      'button[type="button"][name="submit_appointment"].rolex-button',
      'button.rolex-button:contains("동의합니다")',
      'button:contains("동의합니다")',
      'button[name="submit_appointment"]',
      '.rolex-button'
    ];
    
    // 모든 가능한 선택자 통합
    const allReservationSelectors = [...specificSelectors, ...commonSelectors];
    console.log(`최종 예약 선택자 목록 (${allReservationSelectors.length}개):`);
    allReservationSelectors.forEach((sel, idx) => console.log(`  ${idx+1}. ${sel}`));
    
    // 자정에 예약 버튼 클릭 실행
    console.log('자정 예약 실행기로 이동...');
    return await executeExactMidnightReservation(page, allReservationSelectors);
  } catch (error) {
    console.error('예약 및 쿠키 처리 중 오류:', error);
    return false;
  }
} 