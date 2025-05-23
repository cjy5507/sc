"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// electron-is-dev 대신 직접 isDev 로직 구현
const isDev = process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === undefined ||
    /electron/.test(process.execPath);
// timeSync 변수 선언 추가
let timeSync;
// timeSync 모듈 로드 수정
try {
    // 명시적인 경로로 변경
    const timeSyncModule = require('./utils/timeSync.cjs');
    timeSync = timeSyncModule.timeSync;
    console.log('timeSync 모듈이 성공적으로 로드되었습니다.');
}
catch (error) {
    console.error('timeSync 모듈 로드 실패:', error);
    // 에러가 발생해도 계속 진행할 수 있도록 기본 구현 제공
    timeSync = {
        syncTime: async () => {
            console.warn('기본 timeSync.syncTime 구현이 사용됨');
            return Promise.resolve();
        }
    };
}
// 타입 import 수정
// AppointmentService와 STORES를 모듈을 require로 불러오도록 변경
const { AppointmentService } = require('./services/appointmentService');
const { STORES } = require('./stores');
const midnightReservationService_1 = require("./services/midnightReservationService");
// 변수 선언
let mainWindow = null;
let reservationScheduler = {};
const automationProcesses = {};
let midnightReservationService = null;
// 프로세스 상태 초기화
const processState = {
    name: '',
    status: 'idle'
};
// 자동화 프로세스 초기화
let automation = {
    browser: null,
    context: null,
    page: null,
    stopped: false,
    abortController: null,
    currentRetry: 0,
    lastActionTime: 0
};
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
            preload: path_1.default.resolve(__dirname, 'preload.js'),
            webSecurity: !isDev // Disable in dev for CORS
        },
        show: false // Don't show until ready-to-show
    });
    // Load the app - 개발 서버 URL 및 프로덕션 HTML 파일 경로 결정
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path_1.default.resolve(__dirname, '../../out/index.html')}`;
    console.log('애플리케이션 로드 URL:', startUrl);
    console.log('현재 환경:', isDev ? 'development' : 'production');
    // 개발 서버 연결 시도 후 실패 시 로컬 HTML 파일로 대체
    mainWindow.loadURL(startUrl).catch((err) => {
        console.log('개발 서버 연결 실패, 로컬 파일 로드 시도', err);
        const fallbackPath = isDev
            ? path_1.default.resolve(__dirname, '../index.html')
            : path_1.default.resolve(__dirname, '../../out/index.html');
        console.log('대체 HTML 경로:', fallbackPath);
        // 로컬 HTML 파일 로드
        mainWindow?.loadFile(fallbackPath).catch((err) => {
            console.error('로컬 파일 로드 실패:', err);
        });
    });
    // Show window when page is ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        // Open DevTools in development mode
        if (isDev && mainWindow) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
    });
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
    // 예약 서비스 인스턴스 생성
    const appointmentService = new AppointmentService({
        mainWindow,
        automationProcesses
    });
    // 자정 예약 서비스 인스턴스 생성
    midnightReservationService = new midnightReservationService_1.MidnightReservationService(mainWindow, automationProcesses // 타입 호환성 이슈 해결
    );
    // Automation
    electron_1.ipcMain.handle('start-automation', async (event, params) => {
        console.log('start-automation called', params);
        const { stores: storeIdsToStart } = params; // 파라미터명 변경으로 명확성 확보
        if (!Array.isArray(storeIdsToStart)) {
            return { success: false, error: 'Invalid stores format' };
        }
        const results = [];
        // Promise.all 대신 for...of 루프를 사용하여 순차적으로 또는 병렬(제어된) 실행 고려
        // 여기서는 각 매장 자동화를 독립적으로 시도하고 결과를 집계합니다.
        for (const storeId of storeIdsToStart) {
            console.log(`[${storeId}] 자동화 처리 시작`);
            // 기존 프로세스 정리 (더 안전하게)
            if (automationProcesses[storeId]) {
                console.log(`[${storeId}] 기존 자동화 프로세스 정리 시도`);
                try {
                    if (automationProcesses[storeId].browser && typeof automationProcesses[storeId].browser.close === 'function') {
                        await automationProcesses[storeId].browser.close();
                        console.log(`[${storeId}] 기존 브라우저 인스턴스 종료됨`);
                    }
                }
                catch (e) {
                    console.error(`[${storeId}] 기존 브라우저 종료 오류:`, e);
                }
                delete automationProcesses[storeId];
            }
            const storeInfo = STORES.find((s) => s.id === storeId);
            if (!storeInfo) {
                console.error(`[${storeId}] 스토어 정보를 찾을 수 없음`);
                results.push({ storeId, success: false, message: '스토어 정보를 찾을 수 없음' });
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('automation-status', {
                        storeId,
                        status: 'error',
                        message: '스토어 정보를 찾을 수 없음'
                    });
                }
                continue; // 다음 매장으로 진행
            }
            console.log(`[${storeId}] 스토어 정보:`, storeInfo.name);
            automationProcesses[storeId] = initializeAutomationProcess(); // 새 프로세스 초기화
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('automation-status', {
                    storeId,
                    status: 'running',
                    message: '자동화 시작 중...'
                });
            }
            try {
                // appointmentService.handleStore가 Playwright Browser 인스턴스를 반환한다고 가정
                const browserInstance = await appointmentService.handleStore(storeInfo);
                if (browserInstance) {
                    automationProcesses[storeId].browser = browserInstance; // 브라우저 인스턴스 저장
                    automationProcesses[storeId].stopped = false;
                    console.log(`[${storeId}] 자동화 성공적으로 시작됨, 브라우저 ID: ${browserInstance.version()}`); // version() 등으로 식별자 확인 가능
                    results.push({ storeId, success: true, message: '자동화 시작됨', browserId: browserInstance.version() });
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('automation-status', {
                            storeId,
                            status: 'completed', // 또는 'running' 상태를 유지하고 상세 진행 상황을 appointmentService에서 보내도록 구성
                            message: '자동화 실행 중/완료'
                        });
                    }
                }
                else {
                    // handleStore가 null이나 undefined를 반환한 경우 (예: 내부 오류 또는 조건 불충족)
                    console.error(`[${storeId}] appointmentService.handleStore에서 유효한 브라우저 인스턴스를 반환하지 않음`);
                    throw new Error('자동화 프로세스 시작에 실패했습니다 (브라우저 없음).');
                }
            }
            catch (error) {
                console.error(`[${storeId}] 자동화 처리 중 오류 발생:`, error);
                results.push({ storeId, success: false, message: error.message || '알 수 없는 오류' });
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('automation-status', {
                        storeId,
                        status: 'error',
                        message: `오류: ${error.message || '알 수 없는 오류'}`
                    });
                }
                // 오류 발생 시 해당 스토어의 프로세스 정리
                if (automationProcesses[storeId]?.browser) {
                    try {
                        await automationProcesses[storeId].browser.close();
                    }
                    catch { }
                }
                delete automationProcesses[storeId];
            }
        }
        // 모든 요청 처리 후 최종 결과 반환
        const overallSuccess = results.every(r => r.success);
        return { success: overallSuccess, data: results };
    });
    // 자정 예약 자동화 시작 핸들러
    electron_1.ipcMain.handle('start-midnight-reservation', async (event, params) => {
        try {
            const { url, credentials } = params;
            console.log('자정 예약 시작 요청 수신:', url);
            processState.name = 'midnight-reservation';
            processState.status = 'running';
            if (midnightReservationService) {
                await midnightReservationService.startMidnightReservation(url, credentials);
            }
            else {
                throw new Error('자정 예약 서비스가 초기화되지 않았습니다.');
            }
            event.sender.send('midnight-reservation-status', {
                status: 'running',
                message: '자정 예약 자동화가 실행 중입니다.'
            });
            return { success: true };
        }
        catch (error) {
            console.error('자정 예약 시작 중 오류 발생:', error);
            processState.status = 'error';
            event.sender.send('midnight-reservation-status', {
                status: 'error',
                message: `자정 예약 자동화 시작 실패: ${error.message || '알 수 없는 오류'}`
            });
            return { success: false, error: error.message || '알 수 없는 오류' };
        }
    });
    // 자정 예약 자동화 중지 핸들러
    electron_1.ipcMain.handle('stop-midnight-reservation', async (event) => {
        try {
            console.log('자정 예약 중지 요청 수신');
            processState.status = 'stopped';
            // 강제 리소스 정리 메서드 호출
            if (midnightReservationService) {
                console.log('자정 예약 서비스의 forceClearResources 메서드 호출');
                await midnightReservationService.forceClearResources().catch(err => {
                    console.error('자원 정리 중 오류 발생:', err);
                });
            }
            event.sender.send('midnight-reservation-status', {
                status: 'stopped',
                message: '자정 예약 자동화가 중지되었습니다.'
            });
            return { success: true };
        }
        catch (error) {
            console.error('자정 예약 중지 중 오류 발생:', error);
            // 오류 발생 시에도 상태 업데이트
            processState.status = 'error';
            // 다시 한번 강제 종료 시도
            if (midnightReservationService) {
                try {
                    await midnightReservationService.forceClearResources();
                }
                catch (cleanupError) {
                    console.error('자원 강제 정리 중 추가 오류 발생:', cleanupError);
                }
            }
            event.sender.send('midnight-reservation-status', {
                status: 'error',
                message: `자정 예약 자동화 중지 실패: ${error.message || '알 수 없는 오류'}`
            });
            return { success: false, error: error.message || '알 수 없는 오류' };
        }
    });
    electron_1.ipcMain.handle('stop-automation', async (event, params) => {
        const storeIdToStop = params?.storeId;
        console.log(`자동화 중지 요청 수신: ${storeIdToStop || '모든 매장'}`);
        const processesToStop = storeIdToStop
            ? automationProcesses[storeIdToStop] ? { [storeIdToStop]: automationProcesses[storeIdToStop] } : {}
            : automationProcesses;
        let allStoppedSuccessfully = true;
        for (const storeId in processesToStop) {
            const processToStop = automationProcesses[storeId];
            if (!processToStop)
                continue;
            console.log(`[${storeId}] 자동화 중지 처리 시작`);
            try {
                processToStop.stopped = true;
                if (processToStop.abortController) {
                    processToStop.abortController.abort();
                    console.log(`[${storeId}] AbortController 시그널 전송 완료`);
                }
                if (processToStop.browser) {
                    console.log(`[${storeId}] 브라우저 인스턴스 종료 시작`);
                    try {
                        // Playwright Browser 인스턴스에 직접 close 호출
                        await processToStop.browser.close();
                        console.log(`[${storeId}] 브라우저 인스턴스 종료 완료`);
                    }
                    catch (browserError) {
                        console.error(`[${storeId}] 브라우저 종료 중 오류:`, browserError);
                        // Playwright 브라우저의 경우 process().kill() 직접 사용 어려움. close()로 충분해야 함.
                    }
                }
                // mainWindow가 유효한지 확인 후 메시지 전송
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('automation-status', {
                        storeId,
                        status: 'stopped',
                        message: '자동화가 중지되었습니다.'
                    });
                }
                delete automationProcesses[storeId]; // 프로세스 목록에서 제거
                console.log(`[${storeId}] 자동화 중지 완료 및 프로세스 목록에서 제거됨`);
            }
            catch (error) {
                console.error(`[${storeId}] 자동화 중지 중 오류 발생:`, error);
                allStoppedSuccessfully = false;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('automation-status', {
                        storeId,
                        status: 'error',
                        message: `자동화 중지 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
                    });
                }
            }
        }
        // 전역 상태 업데이트 (모든 매장 중지 시)
        if (!storeIdToStop) {
            processState.status = allStoppedSuccessfully ? 'stopped' : 'error';
            // 전역 automation 객체 초기화 (만약 여전히 사용된다면)
            automation = initializeAutomationProcess();
            console.log('모든 매장 자동화 중지 처리 후 전역 상태 업데이트');
        }
        return { success: allStoppedSuccessfully };
    });
    electron_1.ipcMain.on('time-sync-error', (event, err) => {
        if (mainWindow) {
            mainWindow.webContents.send('time-sync-error', err);
        }
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
    // 앱 시작 메시지 추가
    console.log('===================================');
    console.log('Rolex Reservation Client 시작됨');
    console.log('개발 모드:', isDev ? '활성화' : '비활성화');
    console.log('===================================');
    // Set app name
    if (process.platform === 'darwin') {
        electron_1.app.setName('Rolex Reservation Client');
    }
    // Set app user model ID for Windows
    if (process.platform === 'win32') {
        electron_1.app.setAppUserModelId('com.rolex.reservation.client');
    }
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
    // Wait for app to initialize
    try {
        // 시간 동기화 실행 (타임아웃 설정)
        console.log('시간 동기화 시작...');
        const syncPromise = timeSync.syncTime().catch((err) => {
            console.error('Time sync error (무시):', err);
            return Promise.resolve(); // 에러가 발생해도 계속 진행
        });
        // 최대 6초 대기 (타임아웃 설정)
        await Promise.race([
            syncPromise,
            new Promise(resolve => setTimeout(() => {
                console.log('시간 동기화 타임아웃 (6초), 앱 실행 계속 진행');
                resolve();
            }, 6000))
        ]);
        console.log('시간 동기화 완료 또는 타임아웃');
    }
    catch (err) {
        console.error('앱 초기화 중 오류 발생 (무시하고 계속):', err);
    }
    // Create window after sync
    createWindow();
    setupIpcHandlers();
});
// App lifecycle management
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// Handle app quit
electron_1.app.on('will-quit', (event) => {
    // Clean up resources
    if (typeof reservationScheduler.stop === 'function') {
        reservationScheduler.stop().catch(console.error);
    }
    // 자정 예약 서비스 정리
    if (midnightReservationService) {
        midnightReservationService.stopMidnightReservation().catch(console.error);
    }
    // 남아있는 자동화 프로세스 정리
    Object.keys(automationProcesses).forEach(async (storeId) => {
        try {
            const proc = automationProcesses[storeId];
            if (proc && proc.browser) {
                await proc.browser.close();
            }
        }
        catch (err) {
            console.error(`${storeId} 자동화 프로세스 정리 중 오류:`, err);
        }
    });
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
module.exports = { app: electron_1.app };
function initializeAutomationProcess() {
    return {
        stopped: false,
        browser: null,
        context: null,
        page: null,
        abortController: new AbortController(),
        currentRetry: 0,
        lastActionTime: Date.now()
    };
}
// 환경 변수 설정
require('dotenv').config();
