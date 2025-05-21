"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const electron_is_dev_1 = require("electron-is-dev");
// 디버깅을 위해 import 시도
let timeSync;
try {
    const timeSyncModule = require('./utils/timeSync');
    timeSync = timeSyncModule.timeSync;
    console.log('timeSync 모듈 로드 성공:', timeSync);
}
catch (err) {
    console.error('timeSync 모듈 로드 실패:', err);
    // 임시 대체 객체 생성
    timeSync = {
        syncTime: async () => {
            console.log('더미 timeSync.syncTime 실행됨');
            return Promise.resolve();
        }
    };
}
const appointmentService_1 = require("./services/appointmentService");
const stores_1 = require("./stores");
require('dotenv').config();
const isDev = electron_is_dev_1.default;
let mainWindow = null;
let reservationScheduler = null;
const automationProcesses = {};
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
    const appointmentService = new appointmentService_1.AppointmentService({
        mainWindow,
        automationProcesses
    });
    // Automation
    electron_1.ipcMain.handle('start-automation', async (event, params) => {
        console.log('start-automation called', params);
        const { stores } = params;
        if (!Array.isArray(stores)) {
            return { success: false, error: 'Invalid stores format' };
        }
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
            const store = stores_1.STORES.find((s) => s.id === storeId);
            if (store) {
                // 프로세스 객체를 명시적으로 초기화
                automationProcesses[storeId] = {
                    stopped: false,
                    browser: null,
                    abortController: new AbortController()
                };
                // 상태 즉시 전송 (동기)
                if (mainWindow) {
                    const status = {
                        storeId,
                        status: 'running',
                        message: '자동화 시작'
                    };
                    mainWindow.webContents.send('automation-status', status);
                }
                try {
                    automationProcesses[storeId].browser = await appointmentService.handleStore(store);
                    // stopped 속성 안전하게 접근
                    if (mainWindow && automationProcesses[storeId] && !automationProcesses[storeId].stopped) {
                        const status = {
                            storeId,
                            status: 'completed',
                            message: '자동화 완료'
                        };
                        mainWindow.webContents.send('automation-status', status);
                    }
                }
                catch (error) {
                    console.error(`Automation error for ${storeId}:`, error);
                    // stopped 속성 안전하게 접근
                    if (mainWindow && automationProcesses[storeId] && !automationProcesses[storeId].stopped) {
                        const status = {
                            storeId,
                            status: 'error',
                            message: `오류: ${error.message || '알 수 없는 오류'}`
                        };
                        mainWindow.webContents.send('automation-status', status);
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
            results.push({
                storeId,
                status: 'running',
                message: '자동화 시작'
            });
        }));
        return { success: true, data: results };
    });
    electron_1.ipcMain.handle('stop-automation', async (event, { stores }) => {
        if (!Array.isArray(stores)) {
            return { success: false, error: 'No stores provided' };
        }
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
                    const status = {
                        storeId,
                        status: 'stopped',
                        message: '자동화 중지됨'
                    };
                    mainWindow.webContents.send('automation-status', status);
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
        await Promise.all([
            timeSync.syncTime().catch((err) => console.error('Time sync error:', err)),
            electron_1.app.whenReady()
        ]);
        console.log('시간 동기화 완료');
    }
    catch (err) {
        console.error('시간 동기화 중 오류 발생:', err);
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
