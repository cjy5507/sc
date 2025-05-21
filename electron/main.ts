import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import electronIsDev from 'electron-is-dev';
// const { ReservationScheduler } = require('../src/services/reservationScheduler');
// const StoreModule = require('electron-store');
// const Store = StoreModule.default || StoreModule;
import { chromium } from 'playwright';
// Use absolute path for timeSync.js
const timeSyncPath = path.join(__dirname, 'timeSync.cjs');
const { syncTime } = require(timeSyncPath);
require('dotenv').config();

const isDev = electronIsDev;

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

let mainWindow: BrowserWindow | null = null;
let reservationScheduler: any = null;
const automationProcesses: Record<string, any> = {};

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
  mainWindow = new BrowserWindow({
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
  mainWindow!.once('ready-to-show', () => {
    mainWindow!.show();

    // Open DevTools in development mode
    if (isDev) {
      mainWindow!.webContents.openDevTools({ mode: 'detach' });
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
  ipcMain.handle('start-automation', async (event: any, params: any) => {
    console.log('start-automation called', params);
    const { stores } = params;
    if (!Array.isArray(stores)) return { success: false, error: 'Invalid stores format' };
    const results: Array<{ storeId: string, status: string, message: string }> = [];

    await Promise.all(stores.map(async (storeId) => {
      // 기존 프로세스가 있으면 강제 종료 및 삭제
      const prev = automationProcesses[storeId];
      if (prev && prev.browser) {
        try { await prev.browser.close(); } catch {}
        delete automationProcesses[storeId];
      }

      const store = STORES.find((s: any) => s.id === storeId);
      if (store) {
        automationProcesses[storeId] = { stopped: false };
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
          if (mainWindow && !automationProcesses[storeId].stopped) {
            mainWindow.webContents.send('automation-status', {
              storeId,
              status: 'completed',
              message: '자동화 완료'
            });
          }
        } catch (error: any) {
          console.error(`Automation error for ${storeId}:`, error);
          if (mainWindow && !automationProcesses[storeId].stopped) {
            mainWindow.webContents.send('automation-status', {
              storeId,
              status: 'error',
              message: `오류: ${(error as any).message || '알 수 없는 오류'}`
            });
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

  ipcMain.handle('stop-automation', async (event: any, { stores }: any) => {
    if (!Array.isArray(stores)) return { success: false, error: 'No stores provided' };
    for (const storeId of stores) {
      const proc = automationProcesses[storeId];
      if (proc) {
        proc.stopped = true;
        if (proc.abortController) {
          proc.abortController.abort(); // 논리적 중단 신호
        }
        if (proc.browser) {
          try { await proc.browser.close(); } catch {}
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
}

// App event handlers
app.whenReady().then(() => {
  // Set app name
  if (process.platform === 'darwin') {
    app.setName('Rolex Reservation Client');
  }

  // Set app user model ID for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.rolex.reservation.client');
  }

  // Disable hardware acceleration for better compatibility
  // app.disableHardwareAcceleration();

  // Set up session
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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

  // Initialize scheduler
  // initializeScheduler();

  // Start time synchronization
  syncTime();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Recreate window when activated (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('will-quit', (event) => {
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
  testMode: process.env.TEST_MODE === 'true',
};

async function handleStore(store: any) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // AbortController 추가 (실제 Playwright 명령에는 signal 전달 불가)
  const abortController = new AbortController();
  automationProcesses[store.id] = automationProcesses[store.id] || {};
  automationProcesses[store.id].abortController = abortController;

  function checkStopped() {
    if (!automationProcesses[store.id] || automationProcesses[store.id].stopped) {
      if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'stopped', message: '중지됨' });
      throw new Error('중지됨');
    }
  }

  try {
    // 0. 대기중
    checkStopped();
    if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'waiting', message: '대기중' });
    await page.goto(store.url, { waitUntil: 'networkidle', timeout: 20000 });

    // 1. 쿠키/광고 팝업 닫기중
    checkStopped();
    if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'cookie', message: '쿠키/광고 닫기중' });
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

    // 2. 문의 버튼 클릭중
    checkStopped();
    if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'contact', message: '문의 버튼 클릭중' });
    try {
      await page.waitForSelector('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a', { timeout: 10000 });
      checkStopped();
      await page.click('#contact_us > div > div.grid-layout.section-contents > div:nth-child(2) > div.text-wrap > a');
      console.log(`[${store.name}] 문의 버튼 클릭 성공`);
    } catch (e) {
      if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: '문의 버튼 클릭 실패' });
      console.error(`[${store.name}] 문의 버튼 클릭 실패:`, e);
      throw e;
    }

    // 3. 메시지 입력중
    checkStopped();
    if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'typing', message: '메시지 입력중' });
    try {
      await page.waitForSelector('#fmessage > div:nth-child(24) > div > textarea', { timeout: 10000 });
      checkStopped();
      await page.fill('#fmessage > div:nth-child(24) > div > textarea', '일단 문의');
      console.log(`[${store.name}] 메시지 입력 성공`);
    } catch (e) {
      if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: '메시지 입력 실패' });
      console.error(`[${store.name}] 메시지 입력 실패:`, e);
      throw e;
    }

    // 4. 메시지 보내기중 (제출 버튼 클릭 및 PASS 인증 팝업 대기)
    checkStopped();
    if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'submitting', message: '메시지 보내기중' });
    let popup: any = null;
    try {
      [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
        (async () => { checkStopped(); await page.click('#fmessage > div:nth-child(24) > footer > button'); })()
      ]);
      console.log(`[${store.name}] 문의 제출 버튼 클릭 성공`);
    } catch (e) {
      if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: '메시지 보내기 실패' });
      console.error(`[${store.name}] 문의 제출 버튼 클릭 실패:`, e);
      throw e;
    }

    // 5. PASS 인증중
    checkStopped();
    if (popup) {
      if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'pass', message: 'PASS 인증중' });
      console.log(`[${store.name}] PASS 인증 팝업 감지됨, 사용자가 인증할 때까지 대기`);
      try {
        await popup.waitForEvent('close', { timeout: 180000 }); // 3분(180,000ms) 대기
        checkStopped();
        if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'pass-done', message: 'PASS 인증 완료' });
        console.log(`[${store.name}] PASS 인증 팝업 닫힘, 다음 단계로 진행 가능`);
      } catch (e) {
        if (!automationProcesses[store.id] || automationProcesses[store.id].stopped) {
          if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'stopped', message: '중지됨' });
          return;
        }
        if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: 'PASS 인증 대기 3분 초과, 자동화 실패' });
        console.error(`[${store.name}] PASS 인증 대기 3분 초과, 자동화 실패`);
        throw e;
      }
    } else {
      if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'pass-missing', message: 'PASS 인증 팝업 감지 실패' });
      console.log(`[${store.name}] PASS 인증 팝업 감지 실패(팝업이 안 떴거나 이미 닫힘)`);
    }

    // 6. 자동화 완료
    if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'done', message: '자동화 완료' });
  } catch (e) {
    // automationProcesses[store.id]가 undefined여도 안전하게 처리
    const errMsg = (e && (e as any).message) ? (e as any).message : '';
    if (!automationProcesses[store.id] || automationProcesses[store.id].stopped || (errMsg && errMsg.includes('Browser has been closed'))) {
      if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'stopped', message: '중지됨' });
      return;
    }
    if (mainWindow) mainWindow.webContents.send('automation-status', { storeId: store.id, status: 'error', message: `자동화 실패: ${errMsg || '알 수 없는 오류'}` });
    console.error(`[${store.name}] 전체 자동화 실패:`, e);
  } finally {
    if (browser && browser.isConnected()) {
      await browser.close();
    }
    // finally에서만 delete 수행
    delete automationProcesses[store.id];
  }
}