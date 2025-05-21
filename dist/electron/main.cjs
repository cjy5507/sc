"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const electron_is_dev_1 = require("electron-is-dev");
// const { ReservationScheduler } = require('../src/services/reservationScheduler');
// const StoreModule = require('electron-store');
// const Store = StoreModule.default || StoreModule;
const playwright_1 = require("playwright");
const timeSync_1 = require("./timeSync");
require('dotenv').config();
const isDev = electron_is_dev_1.default;
// In Electron, __dirname and __filename are already defined in CommonJS
// Initialize store
// const store = new Store({
//   defaults: {
//     settings: {
//       notifications: true,
//       theme: 'light',
//       autoStart: false
//     },
//     auth: {
//       token: null,
//       user: null
//     }
//   }
// });
let mainWindow = null;
let reservationScheduler = null;
const automationProcesses = {};
// Initialize reservation scheduler
// function initializeScheduler() {
//   if (reservationScheduler) {
//     reservationScheduler.removeAllListeners();
//   }
//   
//   reservationScheduler = new ReservationScheduler();
//   
//   // Forward status updates to renderer
//   reservationScheduler.on('status', (status) => {
//     if (mainWindow) {
//       mainWindow.webContents.send('reservation-update', status);
//     }
//   });
//   
//   return reservationScheduler;
// }
// Create the main window
function createWindow() {
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // 항상 빌드 산출물(dist/electron/preload.js)을 preload로 지정
            preload: path.resolve(__dirname, 'preload.js'),
            webSecurity: !isDev // Disable in dev for CORS
        },
        show: false // Don't show until ready-to-show
    });
    // Load the app
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.resolve(__dirname, '../../out/index.html')}`;
    mainWindow.loadURL(startUrl);
    // Show window when page is ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // Open DevTools in development mode
        if (isDev) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
    });
    // Initialize scheduler
    // initializeScheduler();
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Handle web contents events
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorDescription);
    });
}
// IPC Handlers
function setupIpcHandlers() {
    console.log('setupIpcHandlers called');
    // Automation
    electron_1.ipcMain.handle('start-automation', async (event, params) => {
        console.log('start-automation called', params);
        const { stores } = params;
        if (!Array.isArray(stores))
            return { success: false, error: 'Invalid stores format' };
        const results = [];
        await Promise.all(stores.map(async (storeId) => {
            // 기존 프로세스가 있으면 강제 종료 및 삭제
            const prev = automationProcesses[storeId];
            if (prev && prev.browser) {
                try {
                    await prev.browser.close();
                }
                catch { }
                delete automationProcesses[storeId];
            }
            const store = STORES.find((s) => s.id === storeId);
            if (store) {
                // 프로세스 객체를 명시적으로 초기화
                automationProcesses[storeId] = {
                    stopped: false,
                    browser: null,
                    abortController: new AbortController()
                };
                // 상태 즉시 전송 (동기)
                if (mainWindow) {
                    mainWindow.webContents.send('automation-status', {
                        storeId,
                        status: 'running',
                        message: '자동화 시작'
                    });
                }
                try {
                    automationProcesses[storeId].browser = await handleStore(store);
                    // stopped 속성 안전하게 접근
                    if (mainWindow && automationProcesses[storeId] && !automationProcesses[storeId].stopped) {
                        mainWindow.webContents.send('automation-status', {
                            storeId,
                            status: 'completed',
                            message: '자동화 완료'
                        });
                    }
                }
                catch (error) {
                    console.error(`Automation error for ${storeId}:`, error);
                    // stopped 속성 안전하게 접근
                    if (mainWindow && automationProcesses[storeId] && !automationProcesses[storeId].stopped) {
                        mainWindow.webContents.send('automation-status', {
                            storeId,
                            status: 'error',
                            message: `오류: ${error.message || '알 수 없는 오류'}`
                        });
                    }
                    // 에러 발생 시 프로세스 정리
                    if (automationProcesses[storeId]?.browser) {
                        try {
                            await automationProcesses[storeId].browser.close();
                        }
                        catch { }
                    }
                    delete automationProcesses[storeId];
                }
            }
            results.push({ storeId, status: 'running', message: '자동화 시작' });
        }));
        return { success: true, data: results };
    });
    // Reservation
    // ipcMain.handle('start-reservation', async (event, config) => { ... });
    // ipcMain.handle('stop-reservation', async () => { ... });
    // ipcMain.handle('get-reservation-status', () => { ... });
    // Settings
    // ipcMain.handle('save-settings', async (event, settings) => { ... });
    // ipcMain.handle('load-settings', async () => { ... });
    // Auth
    // ipcMain.handle('login', async (event, credentials) => { ... });
    // ipcMain.handle('logout', async () => { ... });
    // ipcMain.handle('get-auth-status', async () => { ... });
    electron_1.ipcMain.handle('stop-automation', async (event, { stores }) => {
        if (!Array.isArray(stores))
            return { success: false, error: 'No stores provided' };
        for (const storeId of stores) {
            const proc = automationProcesses[storeId];
            if (proc) {
                proc.stopped = true;
                if (proc.abortController) {
                    proc.abortController.abort(); // 논리적 중단 신호
                }
                if (proc.browser) {
                    try {
                        await proc.browser.close();
                    }
                    catch { }
                }
                if (mainWindow) {
                    mainWindow.webContents.send('automation-status', {
                        storeId,
                        status: 'stopped',
                        message: '자동화 중지됨'
                    });
                }
            }
        }
        return { success: true };
    });
    electron_1.ipcMain.on('time-sync-error', (event, err) => {
        mainWindow?.webContents.send('time-sync-error', err);
    });
    // 메인 윈도우 닫기 이벤트 핸들러 추가
    electron_1.ipcMain.on('close-main-window', () => {
        if (mainWindow) {
            mainWindow.close();
            mainWindow = null;
        }
    });
}
// App event handlers
electron_1.app.whenReady().then(async () => {
    // Set app name
    if (process.platform === 'darwin') {
        electron_1.app.setName('Rolex Reservation Client');
    }
    // Set app user model ID for Windows
    if (process.platform === 'win32') {
        electron_1.app.setAppUserModelId('com.rolex.reservation.client');
    }
    // Disable hardware acceleration for better compatibility
    // app.disableHardwareAcceleration();
    // Set up session
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' data:;",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
                    "style-src 'self' 'unsafe-inline';",
                    "img-src 'self' data: https:;",
                    "font-src 'self' data:;",
                    "connect-src 'self' http://localhost:* https:;",
                ].join(' ')
            }
        });
    });
    // Set up IPC handlers
    setupIpcHandlers();
    // Create the window
    createWindow();
    // Initialize time sync
    try {
        await timeSync_1.timeSync.syncTime();
        console.log('Time sync successful');
        if (mainWindow) {
            mainWindow.webContents.send('time-sync-update', {
                status: 'success',
                message: '시간 동기화 완료'
            });
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        console.error('Time sync failed:', errorMessage);
        if (mainWindow) {
            mainWindow.webContents.send('time-sync-error', {
                status: 'error',
                message: '시간 동기화에 실패했습니다. 관리자 권한으로 실행해주세요.'
            });
        }
        electron_1.dialog.showErrorBox('시간 동기화 오류', '시스템 시간 동기화에 실패했습니다.\n\n' +
            '해결 방법:\n' +
            '1. 프로그램을 관리자 권한으로 실행해주세요.\n' +
            '2. Windows Time 서비스가 실행 중인지 확인해주세요.\n' +
            '3. 인터넷 연결을 확인해주세요.');
    }
});
// Quit when all windows are closed, except on macOS
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Recreate window when activated (macOS)
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// Handle app quit
electron_1.app.on('will-quit', (event) => {
    // Clean up resources
    if (reservationScheduler) {
        reservationScheduler.stop().catch(console.error);
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// 매장별 Playwright 자동화 시나리오 (간단 버전)
const STORES = [
    { id: 'chronodigm', name: '크로노다임', url: 'https://www.chronodigmwatch.co.kr/rolex/' },
    { id: 'unopangyo', name: '우노판교', url: 'https://www.unopangyo.com/rolex/' },
    { id: 'hyundai', name: '현대', url: 'https://www.hyundaiwatch.co.kr/rolex/' },
    { id: 'hongbo', name: '홍보', url: 'https://www.hongbowatch.co.kr/rolex/' },
];
const config = {
    name: process.env.USER_NAME || '홍길동',
    phone: process.env.USER_PHONE || '01012345678',
    message: process.env.USER_MESSAGE || '롤렉스 데이토나 모델에 관심이 있습니다. 매장 방문 예약을 원합니다.',
    carrier: process.env.USER_CARRIER || 'SKT', // SKT, KT, LGU
    testMode: process.env.TEST_MODE === 'true',
    email: 'rolex@rolex.com' // 이메일 필드 추가
};
async function handleStore(store) {
    const browser = await playwright_1.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    // AbortController 추가
    const abortController = new AbortController();
    automationProcesses[store.id] = automationProcesses[store.id] || {};
    automationProcesses[store.id].abortController = abortController;
    function checkStopped() {
        if (!automationProcesses[store.id] || automationProcesses[store.id].stopped) {
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'stopped', message: '중지됨' });
            throw new Error('중지됨');
        }
    }
    try {
        // 0. 대기중
        checkStopped();
        if (mainWindow)
            mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'waiting', message: '대기중' });
        await page.goto(store.url, { waitUntil: 'networkidle', timeout: 20000 });
        // 1. 쿠키/광고 팝업 닫기중
        checkStopped();
        if (mainWindow)
            mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'cookie', message: '쿠키/광고 닫기중' });
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
        // 2. 문의 버튼 클릭중
        checkStopped();
        if (mainWindow)
            mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'contact', message: '문의 버튼 클릭중' });
        try {
            await page.waitForSelector('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a', { timeout: 10000 });
            checkStopped();
            await page.click('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            console.log(`[${store.name}] 문의 버튼 클릭 성공`);
        }
        catch (e) {
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: '문의 버튼 클릭 실패' });
            console.error(`[${store.name}] 문의 버튼 클릭 실패:`, e);
            throw e;
        }
        // 3. 메시지 입력 및 PASS 인증
        checkStopped();
        if (mainWindow)
            mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'message', message: '메시지 입력중' });
        let popup = null;
        try {
            // 메시지 입력 대기 및 입력
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000); // 페이지 안정화를 위한 대기
            await page.waitForSelector('#fmessage > div:nth-child(24) > div > textarea', { timeout: 10000, state: 'visible' });
            await page.fill('#fmessage > div:nth-child(24) > div > textarea', config.message);
            // PASS 인증 팝업 대기 및 메시지 전송
            [popup] = await Promise.all([
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
                page.click('#fmessage > div:nth-child(24) > footer > button')
            ]);
            if (!popup) {
                throw new Error('PASS 인증 팝업이 정상적으로 열리지 않았습니다.');
            }
            // PASS 인증 진행
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'pass', message: 'PASS 인증중' });
            // 통신사 선택
            const carrierSelectors = {
                'SKT': '#ct > form > fieldset > ul.agency_select__items > li:nth-child(1)',
                'KT': '#ct > form > fieldset > ul.agency_select__items > li:nth-child(2)',
                'LGU': '#ct > form > fieldset > ul.agency_select__items > li:nth-child(3)'
            };
            const carrierSelector = carrierSelectors[config.carrier];
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
            // 4. 이메일 입력 및 동의
            checkStopped();
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'email', message: '이메일 입력중' });
            // 예약 페이지를 위한 변수 미리 선언
            let appointmentPage = null;
            let appointmentUrl = '';
            try {
                // DOM 변화 감지로 이메일 필드 대기
                await page.waitForFunction(() => {
                    const emailField = document.querySelector('#email');
                    return emailField && emailField.offsetParent !== null;
                }, { timeout: 30000 });
                await page.fill('#email', config.email);
                await page.check('#message-reception-consent');
                // 이메일 입력과 동의 체크박스 체크 후, 제출 버튼 클릭 없이 바로 새 탭 열기
                console.log(`[${store.name}] 이메일 입력 완료, 새 탭에서 예약 페이지로 직접 이동`);
                // 5. 새 탭에서 예약 페이지 열기
                checkStopped();
                if (mainWindow)
                    mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'appointment', message: '예약 페이지로 이동중' });
                // 매장별 기본 URL에 appointment 경로 추가하여 직접 접근
                const baseStoreUrl = STORES.find(s => s.id === store.id)?.url || '';
                appointmentUrl = baseStoreUrl.replace(/\/?$/, '/appointment/');
                console.log(`[${store.name}] 예약 페이지 URL: ${appointmentUrl}`);
                try {
                    // 직접 URL로 이동하는 함수 정의
                    const navigateToAppointmentPage = async (retries = 3) => {
                        let currentPage = null;
                        for (let i = 0; i < retries; i++) {
                            try {
                                // 이전 페이지가 있으면 닫기
                                if (currentPage) {
                                    try {
                                        const isClosed = await currentPage.isClosed().catch(() => true);
                                        if (!isClosed) {
                                            await currentPage.close().catch(e => console.log(`[${store.name}] 페이지 닫기 실패:`, e));
                                        }
                                    }
                                    catch (e) { /* 무시 */ }
                                }
                                // 시도 방법에 따라 다른 접근법 사용
                                if (i === 0) {
                                    // 첫 번째 시도: Context에서 새로운 브라우저 탭 열기 
                                    console.log(`[${store.name}] 예약 페이지로 이동 시도 #${i + 1}: context.newPage()`);
                                    try {
                                        currentPage = await context.newPage().catch(e => {
                                            console.log(`[${store.name}] context.newPage() 실패:`, e);
                                            return null;
                                        });
                                        if (!currentPage) {
                                            throw new Error('새 페이지를 열지 못했습니다.');
                                        }
                                        // 새 탭이 로드되는 것 확인
                                        await currentPage.waitForLoadState('domcontentloaded').catch(() => { });
                                        await currentPage.goto(appointmentUrl, { waitUntil: 'networkidle', timeout: 60000 });
                                    }
                                    catch (e) {
                                        console.log(`[${store.name}] 첫 번째 탭 열기 방식 실패:`, e);
                                        continue;
                                    }
                                }
                                else if (i === 1) {
                                    // 두 번째 시도: 브라우저 인스턴스에서 새로운 페이지 열기 (컨텍스트와 다름)
                                    console.log(`[${store.name}] 예약 페이지로 이동 시도 #${i + 1}: browser.newPage()`);
                                    try {
                                        currentPage = await browser.newPage().catch(e => {
                                            console.log(`[${store.name}] browser.newPage() 실패:`, e);
                                            return null;
                                        });
                                        if (!currentPage) {
                                            throw new Error('브라우저에서 새 페이지를 열지 못했습니다.');
                                        }
                                        await currentPage.goto(appointmentUrl, { waitUntil: 'networkidle', timeout: 60000 });
                                    }
                                    catch (e) {
                                        console.log(`[${store.name}] 두 번째 탭 열기 방식 실패:`, e);
                                        continue;
                                    }
                                }
                                else {
                                    // 세 번째 시도: 새 브라우저 컨텍스트 생성 후 페이지 열기
                                    console.log(`[${store.name}] 예약 페이지로 이동 시도 #${i + 1}: 새 컨텍스트 생성`);
                                    try {
                                        const newContext = await browser.newContext();
                                        currentPage = await newContext.newPage().catch(e => {
                                            console.log(`[${store.name}] newContext.newPage() 실패:`, e);
                                            return null;
                                        });
                                        if (!currentPage) {
                                            throw new Error('새 컨텍스트에서 페이지를 열지 못했습니다.');
                                        }
                                        await currentPage.goto(appointmentUrl, { waitUntil: 'networkidle', timeout: 60000 });
                                    }
                                    catch (e) {
                                        console.log(`[${store.name}] 세 번째 탭 열기 방식 실패:`, e);
                                        continue;
                                    }
                                }
                                // 페이지가 열렸는지 확인
                                if (!currentPage) {
                                    console.log(`[${store.name}] 페이지 객체가 생성되지 않음, 재시도...`);
                                    continue;
                                }
                                try {
                                    // URL 확인
                                    const currentUrl = await currentPage.url().catch(() => '');
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
                                // 성공적으로 로드됨
                                appointmentPage = currentPage;
                                console.log(`[${store.name}] 예약 페이지 로드 성공`);
                                return true;
                            }
                            catch (err) {
                                console.log(`[${store.name}] 예약 페이지 로딩 시도 #${i + 1} 실패:`, err);
                                if (i === retries - 1) {
                                    // 마지막 시도였을 경우, 현재 페이지를 그대로 사용
                                    if (currentPage) {
                                        try {
                                            const isClosed = await currentPage.isClosed().catch(() => true);
                                            if (!isClosed) {
                                                appointmentPage = currentPage;
                                            }
                                        }
                                        catch (e) {
                                            console.log(`[${store.name}] 페이지 상태 확인 중 오류:`, e);
                                        }
                                    }
                                }
                            }
                        }
                        // 모든 시도 실패, 하지만 마지막 페이지를 반환
                        return false;
                    };
                    // 예약 페이지로 이동 시도
                    const navigationSuccess = await navigateToAppointmentPage();
                    // 결과에 따른 메시지 표시
                    if (navigationSuccess) {
                        if (mainWindow)
                            mainWindow.webContents.send('automation-status', {
                                storeId: store.id,
                                status: 'success',
                                message: '예약 페이지 로딩 완료, 예약 버튼 대기중'
                            });
                    }
                    else {
                        if (mainWindow)
                            mainWindow.webContents.send('automation-status', {
                                storeId: store.id,
                                status: 'warning',
                                message: '예약 페이지 로딩에 문제가 있으나, 계속 진행합니다.'
                            });
                    }
                }
                catch (e2) {
                    console.log(`[${store.name}] 예약 페이지 로딩 중 오류 발생, 하지만 진행 계속:`, e2);
                    if (mainWindow)
                        mainWindow.webContents.send('automation-status', {
                            storeId: store.id,
                            status: 'warning',
                            message: '예약 페이지 로딩에 문제가 있으나, 계속 진행합니다.'
                        });
                }
            }
            catch (e) {
                // 타임아웃이나 다른 오류가 발생해도 계속 진행
                console.log(`[${store.name}] 이메일 입력 과정에서 오류 발생, 하지만 진행 계속:`, e);
                if (mainWindow)
                    mainWindow.webContents.send('automation-status', {
                        storeId: store.id,
                        status: 'warning',
                        message: '이메일 입력 단계에서 문제가 발생했지만, 예약 페이지로 진행합니다.'
                    });
            }
            // 6. 자정까지 대기
            checkStopped();
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'waiting', message: '자정 대기중' });
            try {
                await waitUntilMidnight();
            }
            catch (e) {
                console.log(`[${store.name}] 자정 대기 중 오류 발생, 예약 진행:`, e);
                if (mainWindow)
                    mainWindow.webContents.send('automation-status', {
                        storeId: store.id,
                        status: 'warning',
                        message: '자정 대기 중 문제가 발생했으나, 예약을 시도합니다.'
                    });
            }
            // 7. 예약 버튼 클릭
            checkStopped();
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'reserving', message: '예약 진행중' });
            try {
                // 인간 같은 지연 시간 추가 함수
                const humanDelay = async (min = 500, max = 2000) => {
                    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
                    console.log(`[${store.name}] 자연스러운 지연 ${delay}ms 적용중...`);
                    await appointmentPage.waitForTimeout(delay);
                };
                // 인간 같은 마우스 움직임 시뮬레이션
                const moveMouseNaturally = async (selector) => {
                    try {
                        // 요소 위치 가져오기
                        const boundingBox = await appointmentPage.locator(selector).boundingBox();
                        if (!boundingBox)
                            return false;
                        // 요소의 중앙 좌표
                        const x = boundingBox.x + boundingBox.width / 2;
                        const y = boundingBox.y + boundingBox.height / 2;
                        // 마우스를 요소 주변으로 움직인 후 중앙으로 이동
                        await appointmentPage.mouse.move(x + (Math.random() * 20 - 10), y + (Math.random() * 20 - 10));
                        await humanDelay(100, 500);
                        await appointmentPage.mouse.move(x, y);
                        await humanDelay(100, 300);
                        return true;
                    }
                    catch (err) {
                        console.log(`[${store.name}] 마우스 움직임 시뮬레이션 실패:`, err);
                        return false;
                    }
                };
                // 인간 같은 클릭 구현
                const humanClick = async (selector, options = { timeout: 5000 }) => {
                    try {
                        // 요소가 보이는지 확인
                        const visible = await appointmentPage.waitForSelector(selector, {
                            state: 'visible',
                            timeout: options.timeout
                        }).then(() => true).catch(() => false);
                        if (!visible)
                            return false;
                        // 페이지 스크롤 조정 (요소가 보이도록)
                        await appointmentPage.evaluate((sel) => {
                            const element = document.querySelector(sel);
                            if (element) {
                                // 부드러운 스크롤
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, selector);
                        await humanDelay(500, 1500);
                        // 마우스 자연스럽게 움직이기
                        await moveMouseNaturally(selector);
                        // 클릭 전 짧은 지연
                        await humanDelay(200, 500);
                        // 실제 클릭
                        await appointmentPage.click(selector, { delay: Math.floor(Math.random() * 100) + 50 });
                        // 클릭 후 지연
                        await humanDelay(1000, 2000);
                        return true;
                    }
                    catch (err) {
                        console.log(`[${store.name}] 인간 같은 클릭 실패:`, err);
                        return false;
                    }
                };
                // 페이지 새로고침 후 랜덤한 지연 시간 추가
                console.log(`[${store.name}] 예약 페이지 새로고침 후 버튼 탐색 준비중...`);
                await appointmentPage.reload({ waitUntil: 'networkidle' });
                await humanDelay(2000, 5000);
                // 예약 버튼 찾기 함수 정의
                const findAndClickReservationButton = async (retries = 3) => {
                    for (let i = 0; i < retries; i++) {
                        try {
                            console.log(`[${store.name}] 예약 버튼 탐색 시도 ${i + 1}/${retries}`);
                            // 먼저 페이지를 천천히 스크롤
                            await appointmentPage.evaluate(() => {
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
                            await appointmentPage.evaluate(() => {
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
                                const buttons = await appointmentPage.$$('a, button');
                                for (const button of buttons) {
                                    const text = await button.textContent();
                                    if (text && (text.includes('시간 선택') || text.includes('예약'))) {
                                        // 요소에 임시 ID 할당
                                        const tempId = await appointmentPage.evaluate((el) => {
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
                            await humanDelay();
                            // 각 셀렉터 시도
                            for (const selector of selectors) {
                                try {
                                    const exists = await appointmentPage.waitForSelector(selector, {
                                        state: 'visible',
                                        timeout: 3000
                                    }).then(() => true).catch(() => false);
                                    if (exists) {
                                        console.log(`[${store.name}] 예약 버튼 발견! 셀렉터: ${selector}`);
                                        // 인간 같은 클릭 실행
                                        const clickSuccess = await humanClick(selector);
                                        if (clickSuccess) {
                                            // 확인 버튼도 인간처럼 클릭 시도
                                            await humanDelay(1000, 3000);
                                            try {
                                                const confirmButtonSelector = '#fappointment > div:nth-child(25) > footer > button';
                                                await humanClick(confirmButtonSelector);
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
                                await appointmentPage.reload({ waitUntil: 'networkidle' });
                                await humanDelay(3000, 7000);
                            }
                        }
                        catch (err) {
                            console.log(`[${store.name}] 예약 시도 중 오류 발생, 재시도...`, err);
                            await humanDelay(2000, 5000);
                        }
                    }
                    return false;
                };
                // 예약 버튼 찾기 실행 전 더 길게 대기 (봇 감지 우회)
                await humanDelay(5000, 10000);
                console.log(`[${store.name}] 봇 감지 우회를 위해 충분히 대기 후 예약 시도 시작`);
                // 예약 버튼 찾기 실행
                const buttonClicked = await findAndClickReservationButton(5);
                if (buttonClicked) {
                    console.log(`[${store.name}] 예약 버튼 클릭 성공`);
                    if (mainWindow)
                        mainWindow.webContents.send('automation-status', {
                            storeId: store.id,
                            status: 'success',
                            message: '예약 버튼 클릭 완료! 브라우저를 유지합니다.'
                        });
                }
                else {
                    console.log(`[${store.name}] 예약 버튼을 찾지 못함, 수동 예약 대기`);
                    if (mainWindow)
                        mainWindow.webContents.send('automation-status', {
                            storeId: store.id,
                            status: 'warning',
                            message: '예약 버튼을 찾지 못했습니다. 브라우저를 유지하며 수동 예약 대기 중입니다.'
                        });
                }
            }
            catch (e) {
                console.log(`[${store.name}] 예약 버튼 클릭 실패, 하지만 브라우저 유지:`, e);
                if (mainWindow)
                    mainWindow.webContents.send('automation-status', {
                        storeId: store.id,
                        status: 'warning',
                        message: '예약 버튼 클릭에 실패했으나, 브라우저는 유지됩니다. 수동으로 작업을 완료하세요.'
                    });
            }
            // 예약 프로세스 완료 후에도 브라우저 유지
            console.log(`[${store.name}] 예약 프로세스 완료, 브라우저 유지 중`);
            // 무한 대기 (사용자가 중지할 때까지)
            while (true) {
                checkStopped(); // 사용자가 중지 버튼을 누르면 여기서 예외가 발생하고 빠져나감
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10초마다 확인
                // mainWindow가 null인지 확인 후 상태 메시지 전송
                if (mainWindow && automationProcesses[store.id] && !automationProcesses[store.id].stopped) {
                    mainWindow.webContents.send('automation-status', {
                        storeId: store.id,
                        status: 'maintain',
                        message: '세션 유지 중 - 수동으로 중지할 때까지 브라우저를 유지합니다.'
                    });
                }
            }
        }
        catch (e) {
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: `오류 발생: ${e instanceof Error ? e.message : '알 수 없는 오류'}` });
            console.error(`[${store.name}] 예약 프로세스 실패:`, e);
            throw e;
        }
    }
    catch (e) {
        const errMsg = (e && e.message) ? e.message : '';
        if (!automationProcesses[store.id] || automationProcesses[store.id].stopped || (errMsg && errMsg.includes('Browser has been closed'))) {
            if (mainWindow)
                mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'stopped', message: '중지됨' });
            return;
        }
        if (mainWindow)
            mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: `자동화 실패: ${errMsg || '알 수 없는 오류'}` });
        console.error(`[${store.name}] 전체 자동화 실패:`, e);
    }
    finally {
        // 사용자가 중지했을 때만 브라우저 닫기 (stopped 플래그 확인)
        if (automationProcesses[store.id]?.stopped && browser && browser.isConnected()) {
            await browser.close();
        }
        // 중지된 경우에만 프로세스 정리
        if (automationProcesses[store.id]?.stopped) {
            delete automationProcesses[store.id];
        }
    }
}
// 자정까지 대기하는 함수
async function waitUntilMidnight() {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const isLastDayOfMonth = now.getDate() === lastDayOfMonth.getDate();
    // 테스트 모드일 경우 매월 말일 체크를 건너뜁니다.
    if (!config.testMode && !isLastDayOfMonth) {
        throw new Error('매월 말일에만 예약이 가능합니다.');
    }
    if (config.testMode) {
        console.log('테스트 모드: 자정 대기를 10초로 단축합니다.');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 테스트 모드에서는 10초만 대기
        return;
    }
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    if (timeUntilMidnight > 0) {
        console.log(`자정까지 ${Math.floor(timeUntilMidnight / 1000 / 60)} 분 ${Math.floor(timeUntilMidnight / 1000) % 60} 초 대기합니다.`);
        await new Promise(resolve => setTimeout(resolve, timeUntilMidnight));
    }
}
