"use strict";

// 필요한 모듈 임포트
const { executeReservationWithCookieHandling } = require('../utils/timeUtils');

// AppointmentService 클래스
class AppointmentService {
  constructor(options) {
    this.mainWindow = options.mainWindow || null;
    this.automationProcesses = options.automationProcesses;
  }

  /**
   * 스토어 자동화 처리
   */
  async handleStore(store) {
    console.log(`[AppointmentService] 스토어 처리 시작: ${store.name} (ID: ${store.id})`);
    
    try {
      // Playwright 브라우저 시작
      // console.log(`[AppointmentService] Playwright 로드 중...`);
      const { chromium } = require('playwright');
      // console.log(`[AppointmentService] Playwright 로드 성공`);
      
      // console.log(`[AppointmentService] 브라우저 시작 중...`);
      const browser = await chromium.launch({
        headless: false,
        slowMo: 100,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      console.log(`[AppointmentService] 브라우저 시작 성공`);
      
      // 브라우저 컨텍스트 및 페이지 생성
      // console.log(`[AppointmentService] 컨텍스트 생성 중...`);
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
      
      // 두 개의 탭 생성
      // console.log(`[AppointmentService] 페이지 생성 중...`);
      const authPage = await context.newPage();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 탭 생성 간에 약간의 지연
      const appointmentPage = await context.newPage();
      // console.log(`[AppointmentService] 페이지 생성 성공`);
      
      // URL 생성
      const appointmentUrl = store.url.includes('/appointment/') 
        ? store.url 
        : `${store.url}/appointment/`.replace(/\/+/g, '/').replace(':/', '://');
      const authUrl = store.url.includes('/appointment/') 
        ? store.url.replace('/appointment/', '/') 
        : store.url;
      
      console.log(`[AppointmentService] 인증 URL: ${authUrl}`);
      console.log(`[AppointmentService] 예약 URL: ${appointmentUrl}`);
      
      // 순차적으로 처리 (병렬 처리 대신)
      console.log(`[AppointmentService] 인증 페이지 처리 시작...`);
      await this.handleAuthPage(authPage, authUrl, store);
      
      console.log(`[AppointmentService] 예약 페이지 처리 시작...`);
      await this.handleAppointmentPage(appointmentPage, appointmentUrl, store);
      
      console.log(`[AppointmentService] 브라우저 인스턴스 반환`);
      return browser;
      
    } catch (error) {
      console.error(`[AppointmentService] 오류 발생:`, error);
      throw error;
    }
  }
  
  /**
   * 인증 페이지 처리
   */
  async handleAuthPage(page, url, store) {
    try {
      console.log(`[AuthPage] 인증 페이지로 이동 중: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // console.log(`[AuthPage] 인증 페이지 이동 완료`);
      
      const title = await page.title();
      console.log(`[AuthPage] 인증 페이지 제목: ${title}`);
      console.log(`[AuthPage] 인증 페이지 액션 시작`);
      
      // await page.screenshot({ path: `auth-page-initial-${store.id}.png` });
      
      // console.log(`[AuthPage] 페이지 완전 로딩 대기 중...`);
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        // console.log(`[AuthPage] 페이지 완전 로딩 완료`);
      } catch (loadError) {
        // console.log(`[AuthPage] 페이지 완전 로딩 타임아웃, 계속 진행합니다: ${loadError.message}`);
      }
      
      // console.log(`[AuthPage] 쿠키 동의 팝업 확인 중...`);
      const cookieSelectors = [
        'button.cookie-notice__agree-button',
        '.consent-banner__cta',
        '.cookie-accept-button',
        '#onetrust-accept-btn-handler',
        'button[class*="cookie"]',
        '[aria-label*="cookie"]',
        '[id*="cookie"]',
        'button.cookies__button',
        '#accept-cookies',
        '.accept-cookies',
        'button:has-text("수락")',
        'button:has-text("모두 수락")',
        'button:has-text("동의")',
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button:has-text("OK")'
      ];
      let cookieButtonClicked = false;
      for (const selector of cookieSelectors) {
        if (cookieButtonClicked) break;
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            // console.log(`[AuthPage] 쿠키 버튼 발견 (${selector}), 가시성 확인 중...`);
            const isVisible = await page.locator(selector).first().isVisible();
            if (isVisible) {
              // console.log(`[AuthPage] 쿠키 버튼 보임, 클릭 시도 중...`);
              try {
                await page.locator(selector).first().scrollIntoViewIfNeeded();
                await page.locator(selector).first().click({ timeout: 5000 });
                console.log(`[AuthPage] 쿠키 버튼 클릭 성공 (${selector})`);
                cookieButtonClicked = true;
                await page.waitForTimeout(1000);
              } catch (clickError) {
                // console.log(`[AuthPage] 쿠키 버튼 클릭 실패: ${clickError.message}`);
                try {
                  await page.evaluate((sel) => {
                    const elements = document.querySelectorAll(sel);
                    if (elements.length > 0) {
                      elements[0].click();
                      return true;
                    }
                    return false;
                  }, selector);
                  console.log(`[AuthPage] 쿠키 버튼 JavaScript 클릭 시도`);
                  cookieButtonClicked = true;
                  await page.waitForTimeout(1000);
                } catch (jsClickError) {
                  // console.log(`[AuthPage] JavaScript 클릭도 실패: ${jsClickError.message}`);
                }
              }
            } else {
              // console.log(`[AuthPage] 쿠키 버튼 발견되었으나 보이지 않음 (${selector})`);
            }
          }
        } catch (selectorError) {
          // console.log(`[AuthPage] 선택자 오류 (${selector}): ${selectorError.message}`);
        }
      }
      if (!cookieButtonClicked) {
        console.log(`[AuthPage] 쿠키 동의 버튼을 찾거나 클릭할 수 없음, 계속 진행합니다.`);
      }
      // await page.screenshot({ path: `auth-page-after-cookie-${store.id}.png` });
      
      console.log(`[AuthPage] 문의하기 버튼 찾는 중...`);
      const contactButtonSelectors = [
        '#intro > div > div > div.body-text-wrap > a',
        '#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a',
        'a:has-text("문의하기")',
        'a.contact-button',
        'a[href*="contact"]',
        'a.button:has-text("문의")',
        'a.btn:has-text("문의")',
        'a.link:has-text("문의")'
      ];
      
      try {
        // console.log(`[AuthPage] 페이지 분석 중...`);
        const pageInfo = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent?.trim(),
            href: a.getAttribute('href'),
            id: a.getAttribute('id'),
            classes: a.getAttribute('class')
          })).filter(link => link.text && (link.text.includes('문의') || link.text.includes('연락') || link.text.includes('Contact')));
          const buttons = Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent?.trim(),
            id: btn.getAttribute('id'),
            classes: btn.getAttribute('class')
          })).filter(btn => btn.text && (btn.text.includes('문의') || btn.text.includes('연락') || btn.text.includes('Contact')));
          return { links, buttons };
        });
        if (pageInfo.links.length > 0) {
          // console.log(`[AuthPage] 문의 관련 링크 발견: ${pageInfo.links.length}개`);
          // pageInfo.links.forEach((link, idx) => console.log(`[AuthPage] 링크 ${idx+1}: ...`));
        }
        if (pageInfo.buttons.length > 0) {
          // console.log(`[AuthPage] 문의 관련 버튼 발견: ${pageInfo.buttons.length}개`);
          // pageInfo.buttons.forEach((btn, idx) => console.log(`[AuthPage] 버튼 ${idx+1}: ...`));
        }
      } catch (evalError) {
        // console.log(`[AuthPage] 페이지 분석 오류: ${evalError.message}`);
      }
      
      let contactButtonClicked = false;
      for (const selector of contactButtonSelectors) {
        if (contactButtonClicked) break;
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            // console.log(`[AuthPage] 문의하기 버튼 발견 (${selector}), 가시성 확인 중...`);
            try {
              await page.locator(selector).first().scrollIntoViewIfNeeded();
              const isVisible = await page.locator(selector).first().isVisible();
              if (isVisible) {
                // console.log(`[AuthPage] 문의하기 버튼 보임, 클릭 시도 중...`);
                try {
                  await page.locator(selector).first().click({ timeout: 5000 });
                  console.log(`[AuthPage] 문의하기 버튼 클릭 성공 (${selector})`);
                  contactButtonClicked = true;
                } catch (clickError) {
                  // console.log(`[AuthPage] 문의하기 버튼 클릭 실패: ${clickError.message}`);
                  try {
                    await page.evaluate((sel) => {
                      const elements = document.querySelectorAll(sel);
                      if (elements.length > 0) { elements[0].click(); return true; }
                      return false;
                    }, selector);
                    console.log(`[AuthPage] 문의하기 버튼 JavaScript 클릭 시도`);
                    contactButtonClicked = true;
                  } catch (jsClickError) {
                    // console.log(`[AuthPage] JavaScript 클릭도 실패: ${jsClickError.message}`);
                  }
                }
              } else {
                // console.log(`[AuthPage] 문의하기 버튼 발견되었으나 보이지 않음 (${selector})`);
              }
            } catch (visibilityError) {
              // console.log(`[AuthPage] 문의하기 버튼 가시성 확인 실패: ${visibilityError.message}`);
            }
          }
        } catch (selectorError) {
          // console.log(`[AuthPage] 선택자 오류 (${selector}): ${selectorError.message}`);
        }
      }
      if (!contactButtonClicked) {
        console.error(`[AuthPage] 모든 문의하기 버튼 선택자가 실패했습니다. 계속 진행 불가능.`);
        return false;
      }
      
      // console.log(`[AuthPage] 페이지 변화 대기 중...`);
      await page.waitForTimeout(3000);
      // await page.screenshot({ path: `auth-page-after-contact-click-${store.id}.png` });
      
      console.log(`[AuthPage] 메시지 입력 필드 찾는 중...`);
      const textareaSelectors = [
        'textarea[name="message"]',
        'textarea.text-fixed-16',
        'textarea[placeholder="메시지를 입력하세요."]',
        '#fmessage textarea',
        '#contact_form textarea',
        'form textarea',
        'textarea'
      ];
      let textareaFound = false;
      let messageEntered = false;
      try {
        // console.log(`[AuthPage] 폼 요소 로딩 대기 중...`);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (loadError) {
        // console.log(`[AuthPage] 추가 로딩 완료 대기 시간 초과, 계속 진행합니다.`);
      }
      
      try {
        const formElements = await page.evaluate(() => {
          const formsData = Array.from(document.querySelectorAll('form')).map(form => ({ id: form.id || 'no-id', name: form.name || 'no-name', action: form.action || 'no-action', method: form.method || 'no-method', hasTextarea: form.querySelector('textarea') !== null }));
          const textareasData = Array.from(document.querySelectorAll('textarea')).map(ta => ({ id: ta.id || 'no-id', name: ta.name || 'no-name', placeholder: ta.placeholder || 'no-placeholder', classes: ta.className || 'no-classes', isVisible: ta.offsetParent !== null, parentForm: ta.closest('form')?.id || 'not-in-form', xpath: getXPath(ta) }));
          function getXPath(element) {
            if (element.id !== '') return `//*[@id="${element.id}"]`;
            const paths = []; let current = element;
            while (current && current.nodeType === Node.ELEMENT_NODE) {
              let index = 0; let hasSiblings = false; let sibling = current.previousSibling;
              while (sibling) { if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) { index++; hasSiblings = true; } sibling = sibling.previousSibling; }
              const tagName = current.tagName.toLowerCase(); const pathIndex = (hasSiblings ? `[${index + 1}]` : ''); paths.unshift(`${tagName}${pathIndex}`); current = current.parentNode;
            }
            return `//${paths.join('/')}`;
          }
          return { forms: formsData, textareas: textareasData };
        });
        // if (formElements.forms.length > 0) console.log(`[AuthPage] 폼 요소 발견: ${formElements.forms.length}개`);
        // if (formElements.textareas.length > 0) console.log(`[AuthPage] Textarea 요소 발견: ${formElements.textareas.length}개`);
        for (const ta of formElements.textareas) {
          if (ta.xpath && !textareaSelectors.includes(ta.xpath)) {
            textareaSelectors.push(ta.xpath);
            // console.log(`[AuthPage] XPath 선택자 추가: ${ta.xpath}`);
          }
        }
      } catch (evalError) {
        // console.log(`[AuthPage] 폼/Textarea 분석 오류: ${evalError.message}`);
      }
      
      for (const selector of textareaSelectors) {
        if (textareaFound) break;
        try {
          // console.log(`[AuthPage] 선택자로 textarea 찾는 중: ${selector}`);
          const count = await page.locator(selector).count();
          if (count > 0) {
            // console.log(`[AuthPage] Textarea 발견 (${selector}), 가시성 확인 중...`);
            await page.locator(selector).first().scrollIntoViewIfNeeded();
            const isVisible = await page.locator(selector).first().isVisible();
            if (isVisible) {
              // console.log(`[AuthPage] 보이는 Textarea 발견, 메시지 입력 시도 중...`);
              try {
                await page.locator(selector).first().click();
                await page.locator(selector).first().fill('매장 방문 예약을 원합니다. 예약 가능한 시간대를 확인하고 싶습니다.');
                console.log(`[AuthPage] Textarea에 메시지 입력 성공`);
                // await page.screenshot({ path: `auth-page-message-entered-${store.id}.png` });
                textareaFound = true; messageEntered = true;
              } catch (inputError) {
                // console.log(`[AuthPage] Textarea 입력 실패: ${inputError.message}`);
                try {
                  await page.evaluate((sel) => {
                    const elements = document.querySelectorAll(sel);
                    if (elements.length > 0) { elements[0].value = '매장 방문 예약을 원합니다. 예약 가능한 시간대를 확인하고 싶습니다.'; return true; }
                    return false;
                  }, selector);
                  console.log(`[AuthPage] JavaScript로 메시지 입력 시도`);
                  textareaFound = true; messageEntered = true;
                } catch (jsInputError) {
                  // console.log(`[AuthPage] JavaScript 입력도 실패: ${jsInputError.message}`);
                }
              }
            } else {
              // console.log(`[AuthPage] Textarea 발견되었으나 보이지 않음 (${selector})`);
            }
          }
        } catch (selectorError) {
          // console.log(`[AuthPage] Textarea 선택자 오류 (${selector}): ${selectorError.message}`);
        }
      }
      if (!textareaFound || !messageEntered) {
        console.warn(`[AuthPage] 메시지 입력 필드를 찾지 못했거나 메시지 입력에 실패했습니다. 계속 진행합니다.`);
      } else {
        console.log(`[AuthPage] 메시지 입력 완료, 제출 버튼 찾는 중...`);
      }
      
      console.log(`[AuthPage] 제출 버튼 찾는 중...`);
      const submitButtonSelectors = [
        '#fmessage > div:nth-child(24) > footer > button',
        'button[name="verification"].rolex-button',
        'button.rolex-button:has-text("다음")',
        'button:has-text("다음")',
        'button[type="submit"]',
        'button[type="button"][name="verification"]',
        'form button[type="button"]',
        'form button:last-child',
        '.rolex-button',
        'button.button--submit',
        'input[type="submit"]',
        'footer button',
        '#fmessage button',
        '#fmessage footer button',
        'button.rolex-button',
        'button:has(i.i-arrow)',
        'button[name="verification"]'
      ];
      let submitButtonClicked = false;
      
      try {
        const buttonElements = await page.evaluate(() => {
          const buttonsData = Array.from(document.querySelectorAll('button')).map(btn => ({ id: btn.id || 'no-id', name: btn.getAttribute('name') || 'no-name', type: btn.getAttribute('type') || 'no-type', text: btn.textContent.trim() || 'no-text', classes: btn.className || 'no-classes', isVisible: btn.offsetParent !== null, hasArrow: btn.querySelector('i.i-arrow') !== null, inFooter: btn.closest('footer') !== null, inForm: btn.closest('form') !== null, xpath: getXPath(btn) }));
          function getXPath(element) { if (element.id !== '') return `//*[@id="${element.id}"]`; const paths = []; let current = element; while (current && current.nodeType === Node.ELEMENT_NODE) { let index = 0; let hasSiblings = false; let sibling = current.previousSibling; while (sibling) { if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) { index++; hasSiblings = true; } sibling = sibling.previousSibling; } const tagName = current.tagName.toLowerCase(); const pathIndex = (hasSiblings ? `[${index + 1}]` : ''); paths.unshift(`${tagName}${pathIndex}`); current = current.parentNode; } return `//${paths.join('/')}`; }
          return buttonsData;
        });
        // if (buttonElements.length > 0) console.log(`[AuthPage] 버튼 요소 발견: ${buttonElements.length}개`);
        buttonElements.forEach((btn) => {
          if ((btn.text.includes('다음') || btn.hasArrow || btn.name === 'verification') && !submitButtonSelectors.includes(btn.xpath)) {
            submitButtonSelectors.push(btn.xpath);
            // console.log(`[AuthPage] 추가 제출 버튼 선택자 추가: ${btn.xpath}`);
          }
        });
      } catch (evalError) {
        // console.log(`[AuthPage] 버튼 분석 오류: ${evalError.message}`);
      }
      
      for (const selector of submitButtonSelectors) {
        if (submitButtonClicked) break;
        try {
          // console.log(`[AuthPage] 선택자로 제출 버튼 찾는 중: ${selector}`);
          const count = await page.locator(selector).count();
          if (count > 0) {
            // console.log(`[AuthPage] 제출 버튼 발견 (${selector}), 가시성 확인 중...`);
            await page.locator(selector).first().scrollIntoViewIfNeeded();
            const isVisible = await page.locator(selector).first().isVisible();
            if (isVisible) {
              // console.log(`[AuthPage] 보이는 제출 버튼 발견, 클릭 시도 중...`);
              try {
                await page.locator(selector).first().click({ force: true, timeout: 5000 });
                console.log(`[AuthPage] 제출 버튼 클릭 성공`);
                submitButtonClicked = true;
              } catch (clickError) {
                // console.log(`[AuthPage] 제출 버튼 클릭 실패: ${clickError.message}`);
                try {
                  await page.evaluate((sel) => {
                    const elements = document.querySelectorAll(sel);
                    if (elements.length > 0) { elements[0].click(); return true; }
                    return false;
                  }, selector);
                  console.log(`[AuthPage] JavaScript로 제출 버튼 클릭 시도`);
                  submitButtonClicked = true;
                } catch (jsClickError) {
                  // console.log(`[AuthPage] JavaScript 클릭도 실패: ${jsClickError.message}`);
                }
              }
            } else {
              // console.log(`[AuthPage] 제출 버튼 발견되었으나 보이지 않음 (${selector})`);
            }
          }
        } catch (selectorError) {
          // console.log(`[AuthPage] 제출 버튼 선택자 오류 (${selector}): ${selectorError.message}`);
        }
      }
      if (!submitButtonClicked) {
        console.warn(`[AuthPage] 모든 제출 버튼 선택자가 실패했습니다. PASS 인증 진행이 어려울 수 있습니다.`);
      } else {
        console.log(`[AuthPage] 제출 버튼 클릭 완료, PASS 인증 창 대기 중...`);
        await page.waitForTimeout(1000);
        // await page.screenshot({ path: `auth-page-after-submit-${store.id}.png` });
        
        try {
          // console.log(`[AuthPage] PASS 인증 창 감지 시작...`);
          const passPopup = await this.waitForPassPopup(page, 20000);
          if (passPopup) {
            console.log(`[AuthPage] PASS 인증 팝업 감지됨, 인증 처리 시작...`);
            await this.handlePassAuth(passPopup, store);
          } else {
            console.warn(`[AuthPage] PASS 인증 창을 감지하지 못했습니다.`);
            // ... (iframe PASS 로직은 일단 유지)
          }
        } catch (passError) {
          console.error(`[AuthPage] PASS 인증 처리 중 오류: ${passError.message}`);
        }
      }
      
      console.log(`[AuthPage] 인증 페이지 처리 완료`);
      console.log(`[AuthPage] 인증 페이지 세션 유지 중... (30초마다 스크롤)`);
      const keepAliveInterval = setInterval(async () => {
        try {
          if (page.isClosed()) { clearInterval(keepAliveInterval); return; }
          await page.evaluate(() => { window.scrollTo(0, window.scrollY + (Math.random() * 10 - 5)); }).catch(() => {});
        } catch (e) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);
      return true;
    } catch (error) {
      console.error(`[AuthPage] 인증 페이지 처리 중 오류 발생: ${error.message}`);
      // try { await page.screenshot({ path: `auth-page-error-${store.id}.png` }); } catch (e) { console.error(`[AuthPage] 스크린샷 캡처 실패: ${e.message}`); }
      return false;
    }
  }
  
  /**
   * 예약 페이지 처리
   */
  async handleAppointmentPage(page, url, store) {
    try {
      // 예약 페이지 로드
      console.log(`[AppointmentService] 예약 페이지로 이동 중: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`[AppointmentService] 예약 페이지 이동 완료`);
      
      // 예약 페이지 제목 로깅
      const title = await page.title();
      console.log(`[AppointmentService] 예약 페이지 제목: ${title}`);
      
      // 예약 페이지도 쿠키 동의 팝업 처리 (인증 페이지와 동일한 방식)
      console.log(`[AppointmentService] 예약 페이지 쿠키 동의 팝업 확인 중...`);
      const cookieSelector = 'button.cookie-notice__agree-button, .consent-banner__cta, .cookie-accept-button, #onetrust-accept-btn-handler, button[class*="cookie"], [aria-label*="cookie"], [id*="cookie"]';
      
      const hasCookieButton = await page.locator(cookieSelector).count() > 0;
      if (hasCookieButton) {
        console.log(`[AppointmentService] 예약 페이지 쿠키 동의 버튼 클릭`);
        await page.click(cookieSelector);
        await page.waitForTimeout(1000);
        console.log(`[AppointmentService] 예약 페이지 쿠키 동의 완료`);
      } else {
        console.log(`[AppointmentService] 예약 페이지 쿠키 동의 팝업 없음, 다음 단계로 진행`);
      }
      
      await page.screenshot({ path: `appointment-page-after-cookie-${store.id}.png` });
      
      // 페이지 완전 로딩 대기
      console.log(`[AppointmentService] 페이지 완전 로딩 대기 중...`);
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        console.log(`[AppointmentService] 페이지 완전 로딩 완료`);
      } catch (loadError) {
        console.log(`[AppointmentService] 페이지 완전 로딩 타임아웃, 계속 진행합니다: ${loadError.message}`);
      }
      
      // 예약 페이지 추가 액션은 여기에 구현
      console.log(`[AppointmentService] 예약 페이지 액션 시작...`);
      
      // 롤렉스 예약을 위한 선택자들
      const reservationSelectors = [
        '#fappointment > div:nth-child(24) > div > div > a:nth-child(1)',
        '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.picture-wrap > picture > img',
        '#fappointment > div:nth-child(25) > footer > button',
        'button[type="button"][name="submit_appointment"].rolex-button',
        'button.rolex-button:contains("동의합니다")',
        'a.purpose[onclick*="select_type(\'collection\')"]',
        'a[onclick*="select_type(\'collection\')"]'
      ];
      
      // timeUtils의 executeReservationWithCookieHandling 함수 호출
      console.log(`[AppointmentService] 롤렉스 예약 프로세스 시작...`);
      
      // 예약 함수 실행 전 페이지 상태 진단
      console.log(`[AppointmentService] 현재 페이지 URL: ${page.url()}`);
      console.log(`[AppointmentService] 현재 페이지 타이틀: ${await page.title()}`);
      
      // 페이지 요소 분석
      try {
        const pageElements = await page.evaluate(() => {
          return {
            forms: Array.from(document.forms).map(f => ({ id: f.id || 'no-id', name: f.name || 'no-name' })),
            buttons: Array.from(document.querySelectorAll('button')).length,
            links: Array.from(document.querySelectorAll('a')).length,
            images: Array.from(document.querySelectorAll('img')).length,
            iframes: Array.from(document.querySelectorAll('iframe')).length
          };
        });
        console.log(`[AppointmentService] 페이지 요소 분석:`, pageElements);
      } catch (evalError) {
        console.log(`[AppointmentService] 페이지 요소 분석 실패: ${evalError.message}`);
      }
      
      try {
        // 예약 함수 호출
        const reservationResult = await executeReservationWithCookieHandling(
          page, 
          cookieSelector,
          reservationSelectors
        );
        
        if (reservationResult) {
          console.log(`[AppointmentService] 예약 프로세스 성공!`);
        } else {
          console.log(`[AppointmentService] 예약 프로세스 실패 또는 자정 대기 중`);
        }
      } catch (reservationError) {
        console.error(`[AppointmentService] 예약 프로세스 중 치명적 오류: ${reservationError.message}`);
        console.error(reservationError.stack); // 스택 트레이스 출력
        
        // 에러 발생 시 스크린샷
        try {
          const errorScreenshotPath = `reservation-error-${store.id}-${Date.now()}.png`;
          await page.screenshot({ path: errorScreenshotPath, fullPage: true });
          console.log(`[AppointmentService] 에러 스크린샷 저장: ${errorScreenshotPath}`);
        } catch (screenshotError) {
          console.log(`[AppointmentService] 에러 스크린샷 저장 실패: ${screenshotError.message}`);
        }
      }
      
      console.log(`[AppointmentService] 예약 페이지 처리 완료`);
      return true;
    } catch (error) {
      console.error(`[AppointmentService] 예약 페이지 처리 중 오류 발생: ${error.message}`);
      console.error(error.stack); // 스택 트레이스 출력
      await page.screenshot({ path: `appointment-page-error-${store.id}.png` });
      return false;
    }
  }
  
  /**
   * PASS 인증 창 감지 함수
   * @param {Page} page - 현재 브라우저 페이지
   * @param {number} timeout - 대기 시간 (밀리초)
   * @returns {Promise<Page|null>} - PASS 인증 창(팝업)이 감지되면 해당 페이지 객체 반환, 없으면 null 반환
   */
  async waitForPassPopup(page, timeout = 10000) {
    console.log(`[AppointmentService] PASS 인증 창 감지 대기 중... (최대 ${timeout/1000}초)`);
    
    const startTime = Date.now();
    
    try {
      // 일정 시간 동안 팝업 창 감지 시도
      while (Date.now() - startTime < timeout) {
        // 현재 열린 모든 페이지(탭/팝업) 가져오기
        const allPages = await page.context().pages();
        
        // 메인 페이지 외에 다른 페이지가 있는지 확인
        const popups = allPages.filter(p => p !== page);
        
        if (popups.length > 0) {
          // 가장 최근에 열린 팝업 가져오기 (일반적으로 마지막 요소)
          const latestPopup = popups[popups.length - 1];
          
          try {
            // 팝업 페이지 정보 확인
            const title = await latestPopup.title();
            const url = latestPopup.url();
            
            console.log(`[AppointmentService] 팝업 감지됨: 제목="${title}", URL=${url}`);
            
            // PASS 인증 관련 키워드 체크
            const isPassPopup = 
              url.includes('pass.co.kr') || 
              url.includes('passauth') || 
              url.includes('identity') ||
              title.includes('PASS') || 
              title.includes('인증') ||
              title.includes('본인확인');
            
            if (isPassPopup) {
              console.log(`[AppointmentService] PASS 인증 창으로 확인됨: ${title}`);
              return latestPopup;
            } else {
              console.log(`[AppointmentService] PASS 인증 창이 아닌 다른 팝업: ${title}`);
            }
          } catch (popupError) {
            console.log(`[AppointmentService] 팝업 접근 중 오류: ${popupError.message}`);
          }
        }
        
        // iframe 내부에 PASS 인증 UI가 포함된 경우를 위한 추가 체크
        try {
          const frames = page.frames();
          for (const frame of frames) {
            if (frame !== page.mainFrame()) {
              const frameUrl = frame.url();
              if (
                frameUrl.includes('pass.co.kr') || 
                frameUrl.includes('passauth') || 
                frameUrl.includes('identity')
              ) {
                console.log(`[AppointmentService] PASS 인증 iframe 감지됨: ${frameUrl}`);
                // iframe 내 PASS 인증이 발견됨 - iframe 자체를 반환할 수는 없어서 특별한 처리 필요
                // 현재는 프레임을 직접 반환하지 않고 이후 로직에서 별도 처리
                return null;
              }
            }
          }
        } catch (frameError) {
          console.log(`[AppointmentService] iframe 검사 중 오류: ${frameError.message}`);
        }
        
        // 짧은 대기 후 다시 시도
        await page.waitForTimeout(500);
      }
      
      console.log(`[AppointmentService] PASS 인증 창 감지 시간 초과 (${timeout/1000}초)`);
      return null;
    } catch (error) {
      console.error(`[AppointmentService] PASS 인증 창 감지 중 오류: ${error.message}`);
      return null;
    }
  }
  
  /**
   * PASS 인증 처리
   */
  async handlePassAuth(popup, store) {
    try {
      console.log(`[AppointmentService] PASS 인증 처리 시작...`);
      
      // 통신사 선택 영역 대기
      console.log(`[AppointmentService] PASS 인증 통신사 선택 영역 확인 중...`);
      
      // 통신사 선택 영역이 있는지 확인
      const agencySelector = '#ct > form > fieldset > ul.agency_select__items';
      
      // 페이지 HTML 구조 덤프 (디버깅용)
      try {
        const htmlStructure = await popup.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            bodyHTML: document.body ? document.body.innerHTML.substring(0, 1000) : 'No body element', // 처음 1000자만
            forms: Array.from(document.querySelectorAll('form')).map(form => form.getAttribute('id') || 'no-id'),
            iframes: document.querySelectorAll('iframe').length
          };
        });
        
        console.log(`[AppointmentService] 팝업 정보:`, JSON.stringify({
          url: htmlStructure.url,
          title: htmlStructure.title,
          forms: htmlStructure.forms,
          iframes: htmlStructure.iframes
        }));
      } catch (evalError) {
        console.log(`[AppointmentService] 팝업 HTML 구조 분석 실패: ${evalError.message}`);
      }
      
      // 통신사 선택 UI 대기 (최대 10초)
      try {
        await popup.waitForSelector(agencySelector, { timeout: 10000 });
        console.log(`[AppointmentService] 통신사 선택 영역 발견`);
        
        // SKT 통신사 선택 (예시)
        const sktSelector = '#ct > form > fieldset > ul.agency_select__items > li:nth-child(1) label';
        
        // 통신사 버튼이 있는지 확인
        const hasSktButton = await popup.locator(sktSelector).count() > 0;
        if (hasSktButton) {
          console.log(`[AppointmentService] SKT 통신사 버튼 클릭`);
          await popup.click(sktSelector);
          await popup.waitForTimeout(1000);
          
          // 약관 동의 체크박스 클릭
          const agreeSelector = '#ct > form > fieldset > ul.agreelist.all > li > span > label:nth-child(2)';
          const hasAgreeCheckbox = await popup.locator(agreeSelector).count() > 0;
          
          if (hasAgreeCheckbox) {
            console.log(`[AppointmentService] 약관 동의 체크박스 클릭`);
            await popup.click(agreeSelector);
            await popup.waitForTimeout(1000);
            
            // PASS 인증 버튼 클릭
            const passButtonSelector = '#btnPass';
            const hasPassButton = await popup.locator(passButtonSelector).count() > 0;
            
            if (hasPassButton) {
              console.log(`[AppointmentService] PASS 인증 버튼 클릭`);
              await popup.click(passButtonSelector);
              await popup.waitForTimeout(3000);
              
              // 페이지 변화 후 QR 인증 버튼 클릭
              console.log(`[AppointmentService] QR 인증 확인 중...`);
              const qrSelector = '#qr_auth';
              
              try {
                await popup.waitForSelector(qrSelector, { timeout: 5000 });
                console.log(`[AppointmentService] QR 인증 버튼 발견, 클릭 중...`);
                await popup.click(qrSelector);
                console.log(`[AppointmentService] QR 인증 버튼 클릭 완료, QR 코드 표시 대기 중...`);
                
                // QR 코드 표시 대기
                await popup.waitForTimeout(2000);
                await popup.screenshot({ path: `pass-popup-qr-code-${store.id}.png` });
                
                console.log(`[AppointmentService] QR 코드 표시됨, PASS 인증 대기 중...`);
              } catch (qrError) {
                console.log(`[AppointmentService] QR 인증 버튼을 찾을 수 없음: ${qrError.message}`);
              }
            } else {
              console.log(`[AppointmentService] PASS 인증 버튼을 찾을 수 없음`);
            }
          } else {
            console.log(`[AppointmentService] 약관 동의 체크박스를 찾을 수 없음`);
          }
        } else {
          console.log(`[AppointmentService] SKT 통신사 버튼을 찾을 수 없음`);
        }
      } catch (agencyError) {
        console.log(`[AppointmentService] 통신사 선택 영역을 찾을 수 없음: ${agencyError.message}`);
      }
      
      // PASS 인증 완료 대기 (팝업이 닫힐 때까지)
      console.log(`[AppointmentService] PASS 인증 완료 대기 중 (팝업이 닫힐 때까지)...`);
      
      // 팝업 닫힘 감지를 위한 주기적 체크
      let popupClosed = false;
      const checkInterval = setInterval(async () => {
        try {
          await popup.evaluate(() => document.title);
        } catch (e) {
          console.log(`[AppointmentService] PASS 인증 팝업이 닫혔습니다. 인증 완료로 간주합니다.`);
          clearInterval(checkInterval);
          popupClosed = true;
        }
      }, 5000); // 5초마다 확인
      
      // 최대 5분 대기 후 타임아웃
      setTimeout(() => {
        if (!popupClosed) {
          clearInterval(checkInterval);
          console.log(`[AppointmentService] PASS 인증 대기 시간 초과 (5분)`);
        }
      }, 300000); // 5분 대기
      
    } catch (error) {
      console.error(`[AppointmentService] PASS 인증 처리 중 오류 발생: ${error.message}`);
      try {
        await popup.screenshot({ path: `pass-auth-error-${store.id}.png` });
      } catch (e) {
        // 스크린샷 오류는 무시
      }
    }
  }
}

// CommonJS 방식으로 내보내기
module.exports = { AppointmentService }; 