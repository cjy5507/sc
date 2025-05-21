"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentService = void 0;
const timeUtils_1 = require("../utils/timeUtils");
const botDetectionAvoidance_1 = require("../utils/botDetectionAvoidance");
const timeUtils_2 = require("../utils/timeUtils");
class AppointmentService {
    constructor(options) {
        this.mainWindow = options.mainWindow;
        this.automationProcesses = options.automationProcesses;
    }
    /**
     * 팝업 페이지 처리 핸들러
     */
    async handlePopup(context, store, triggerPromise) {
        return Promise.all([
            new Promise((resolve) => {
                const popupHandler = async (newPage) => {
                    try {
                        // 팝업 페이지가 완전히 로드될 때까지 대기
                        await newPage.waitForLoadState('domcontentloaded');
                        await newPage.waitForLoadState('networkidle');
                        // 통신사 선택 UI가 렌더링될 때까지 대기
                        await newPage.waitForSelector('#ct > form > fieldset > ul.agency_select__items', {
                            state: 'visible',
                            timeout: 30000
                        });
                        context.removeListener('page', popupHandler);
                        resolve(newPage);
                    }
                    catch (error) {
                        console.log('팝업 처리 중 오류:', error);
                        // 오류 발생 시에도 리스너 제거
                        context.removeListener('page', popupHandler);
                        resolve(null);
                    }
                };
                context.on('page', popupHandler);
            }),
            triggerPromise
        ]);
    }
    /**
     * 예약 버튼을 찾아 클릭하는 함수
     */
    async findAndClickReservationButton(page, store, retries = 3) {
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
                await (0, timeUtils_2.humanDelay)(1000, 2000);
                // 페이지 상단으로 부드럽게 스크롤 복귀
                await page.evaluate(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
                await (0, timeUtils_2.humanDelay)(1000, 3000);
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
                            const tempId = await page.evaluate((el) => {
                                if (!el.id) {
                                    el.id = 'temp-btn-' + Date.now();
                                }
                                return el.id;
                            }, button);
                            selectors.push('#' + tempId);
                        }
                    }
                }
                catch (textErr) {
                    console.log(`[${store.name}] 텍스트로 버튼 찾기 실패:`, textErr);
                }
                // 랜덤 지연
                await (0, timeUtils_2.humanDelay)();
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
                            const clickSuccess = await (0, botDetectionAvoidance_1.humanClick)(page, selector);
                            if (clickSuccess) {
                                // 확인 버튼도 인간처럼 클릭 시도
                                await (0, timeUtils_2.humanDelay)(1000, 3000);
                                try {
                                    const confirmButtonSelector = '#fappointment > div:nth-child(25) > footer > button';
                                    await (0, botDetectionAvoidance_1.humanClick)(page, confirmButtonSelector);
                                    console.log(`[${store.name}] 확인 버튼 클릭 성공!`);
                                }
                                catch (confirmErr) {
                                    console.log(`[${store.name}] 확인 버튼 클릭 실패, 계속 진행:`, confirmErr);
                                }
                                return true;
                            }
                        }
                    }
                    catch (selectorErr) {
                        // 셀렉터 오류 무시하고 다음 셀렉터 시도
                        continue;
                    }
                }
                // 재시도 전 페이지 리로드 및 지연
                if (i < retries - 1) {
                    console.log(`[${store.name}] 예약 버튼을 찾지 못함, 페이지 새로고침 후 재시도...`);
                    await page.reload({ waitUntil: 'networkidle' });
                    await (0, timeUtils_2.humanDelay)(3000, 7000);
                }
            }
            catch (err) {
                console.log(`[${store.name}] 예약 시도 중 오류 발생, 재시도...`, err);
                await (0, timeUtils_2.humanDelay)(2000, 5000);
            }
        }
        return false;
    }
    /**
     * 예약 페이지로 이동하는 함수
     */
    async navigateToAppointmentPage(browser, context, page, store, retries = 3) {
        console.log(`[${store.name}] 예약 페이지 URL: ${store.url}appointment/`);
        let appointmentPage = null;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // 3가지 다른 방법으로 시도
                if (attempt === 1) {
                    console.log(`[${store.name}] 예약 페이지로 이동 시도 #1: context.newPage()`);
                    appointmentPage = await context.newPage();
                }
                else if (attempt === 2) {
                    console.log(`[${store.name}] 예약 페이지로 이동 시도 #2: browser.newPage()`);
                    appointmentPage = await browser.newPage();
                }
                else {
                    console.log(`[${store.name}] 예약 페이지로 이동 시도 #3: 새 컨텍스트 생성`);
                    const newContext = await browser.newContext();
                    appointmentPage = await newContext.newPage();
                }
                // 예약 페이지로 이동
                await appointmentPage.goto(`${store.url}appointment/`, { waitUntil: 'networkidle', timeout: 30000 });
                // 페이지가 제대로 로드됐는지 확인
                try {
                    // URL 확인 - catch 메서드 사용하지 않고 try-catch로 감싸기
                    let currentUrl = '';
                    try {
                        currentUrl = await appointmentPage.url();
                    }
                    catch (err) {
                        console.log(`[${store.name}] URL 가져오기 실패:`, err);
                        continue;
                    }
                    console.log(`[${store.name}] 현재 페이지 URL: ${currentUrl}`);
                    if (currentUrl === 'about:blank' || !currentUrl.includes('appointment')) {
                        console.log(`[${store.name}] 잘못된 URL로 로드됨 (${currentUrl}), 재시도...`);
                        continue; // 다음 시도로 넘어감
                    }
                }
                catch (urlErr) {
                    console.log(`[${store.name}] URL 확인 중 오류:`, urlErr);
                    continue;
                }
                // 페이지가 올바르게 로드되었으면 반환
                return appointmentPage;
            }
            catch (err) {
                console.log(`[${store.name}] 예약 페이지 이동 실패 (시도 ${attempt}/${retries}):`, err);
                // 실패한 페이지 닫기
                if (appointmentPage) {
                    try {
                        // 페이지가 이미 닫혔는지 확인
                        let isClosed = true;
                        try {
                            isClosed = await appointmentPage.isClosed();
                        }
                        catch (e) {
                            console.log(`[${store.name}] 페이지 상태 확인 오류:`, e);
                        }
                        if (!isClosed) {
                            try {
                                await appointmentPage.close();
                            }
                            catch (e) {
                                console.log(`[${store.name}] 페이지 닫기 실패:`, e);
                            }
                        }
                    }
                    catch (closeErr) {
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
    checkStopped(store) {
        if (!this.automationProcesses[store.id] || this.automationProcesses[store.id].stopped) {
            if (this.mainWindow)
                this.mainWindow.webContents.send('automation-status', {
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
    async handleStore(store) {
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
                await (0, timeUtils_1.waitUntilMidnight)(store.config);
            }
            catch (midnightErr) {
                console.log(`[${store.name}] 자정 대기 중 오류 발생, 예약 진행:`, midnightErr);
            }
            // 6. 예약 페이지로 이동
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
                await (0, timeUtils_2.humanDelay)(5000, 10000);
                console.log(`[${store.name}] 봇 감지 우회를 위해 충분히 대기 후 예약 시도 시작`);
                // 예약 버튼 찾기 실행
                const buttonClicked = await this.findAndClickReservationButton(appointmentPage, store, 5);
                if (buttonClicked) {
                    console.log(`[${store.name}] 예약 버튼 클릭 성공`);
                    this.updateStatus(store, 'success', '예약 버튼 클릭 완료! 브라우저를 유지합니다.');
                }
                else {
                    console.log(`[${store.name}] 예약 버튼을 찾지 못함, 수동 예약 대기`);
                    this.updateStatus(store, 'warning', '예약 버튼을 찾지 못했습니다. 브라우저를 유지하며 수동 예약 대기 중입니다.');
                }
            }
            catch (e) {
                console.log(`[${store.name}] 예약 버튼 클릭 실패, 하지만 브라우저 유지:`, e);
                this.updateStatus(store, 'warning', '예약 버튼 클릭에 실패했으나, 브라우저는 유지됩니다. 수동으로 작업을 완료하세요.');
            }
            // 예약 프로세스 완료 후에도 브라우저 유지
            console.log(`[${store.name}] 예약 프로세스 완료, 브라우저 유지 중`);
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
        }
        catch (e) {
            const errMsg = (e && e.message) ? e.message : '';
            if (!this.automationProcesses[store.id] || this.automationProcesses[store.id].stopped || (errMsg && errMsg.includes('Browser has been closed'))) {
                this.updateStatus(store, 'stopped', '중지됨');
                return browser;
            }
            this.updateStatus(store, 'error', `자동화 실패: ${errMsg || '알 수 없는 오류'}`);
            console.error(`[${store.name}] 전체 자동화 실패:`, e);
        }
        finally {
            // 사용자가 중지했을 때만 브라우저 닫기 (stopped 플래그 확인)
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
    async setupBrowser(store) {
        const { chromium } = await Promise.resolve().then(() => require('playwright'));
        return await chromium.launch({ headless: false });
    }
    /**
     * 상태 업데이트 함수
     */
    updateStatus(store, status, message) {
        if (this.mainWindow) {
            const automationStatus = {
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
    async handleCookiesAndAds(page, store) {
        try {
            await page.click('button.cookies__button--accept', { timeout: 2000 });
            console.log(`[${store.name}] 쿠키 동의 버튼 클릭 성공`);
        }
        catch (e) {
            console.log(`[${store.name}] 쿠키 동의 버튼 없음 또는 이미 처리됨`);
        }
        try {
            await page.click('.popin-close', { timeout: 2000 });
            console.log(`[${store.name}] 광고/기타 팝업 닫기 성공`);
        }
        catch (e) {
            console.log(`[${store.name}] 광고/기타 팝업 없음 또는 이미 처리됨`);
        }
    }
    /**
     * 문의 버튼 클릭 함수
     */
    async clickContactButton(page, store) {
        try {
            await page.waitForSelector('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a', { timeout: 10000 });
            this.checkStopped(store);
            await page.click('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            console.log(`[${store.name}] 문의 버튼 클릭 성공`);
        }
        catch (e) {
            this.updateStatus(store, 'error', '문의 버튼 클릭 실패');
            console.error(`[${store.name}] 문의 버튼 클릭 실패:`, e);
            throw e;
        }
    }
    /**
     * 메시지 입력 및 PASS 인증 처리
     */
    async handleMessageAndPassAuth(context, page, store) {
        try {
            // 메시지 입력 대기 및 입력
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000); // 페이지 안정화를 위한 대기
            await page.waitForSelector('#fmessage > div:nth-child(24) > div > textarea', { timeout: 10000, state: 'visible' });
            await page.fill('#fmessage > div:nth-child(24) > div > textarea', store.config.message);
            // PASS 인증 팝업 대기 및 메시지 전송
            const [popup] = await this.handlePopup(context, store, page.click('#fmessage > div:nth-child(24) > footer > button'));
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
            const carrierSelector = carrierSelectors[store.config.carrier];
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
            await new Promise((resolve) => {
                const checkInterval = setInterval(async () => {
                    try {
                        // 팝업이 닫혔는지 확인
                        if (!popup.isConnected()) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }
                    catch (error) {
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
            await page.waitForTimeout(5000); // 대기 시간 유지
            return popup;
        }
        catch (e) {
            console.error(`[${store.name}] PASS 인증 중 오류:`, e);
            throw e;
        }
    }
}
exports.AppointmentService = AppointmentService;
