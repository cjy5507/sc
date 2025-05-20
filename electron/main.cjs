const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const electronIsDev = require('electron-is-dev');
// const { ReservationScheduler } = require('../src/services/reservationScheduler');
// const StoreModule = require('electron-store');
// const Store = StoreModule.default || StoreModule;
const { chromium } = require('playwright');
// Use absolute path for timeSync.cjs
const timeSyncPath = path.join(__dirname, '../utils/timeSync.cjs');
const { timeSync } = require(timeSyncPath);
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

let mainWindow;
let reservationScheduler;
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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
  
  // Handle app activation (macOS)
  mainWindow.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
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
  ipcMain.handle('start-automation', async (event, params) => {
    const { stores } = params;
    if (!Array.isArray(stores)) return { success: false, error: 'Invalid stores format' };
    const results = [];
    for (const storeId of stores) {
      if (!automationProcesses[storeId]) {
        // 병렬 실행: runAutomation에 storeId만 넘기고, 내부에서 인스턴스 저장
        runAutomation(storeId);
      }
      results.push({ storeId, status: 'running', message: '자동화 시작' });
    }
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

  ipcMain.handle('stop-automation', async (event, { stores }) => {
    if (!Array.isArray(stores)) return { success: false, error: 'No stores provided' };
    for (const storeId of stores) {
      const proc = automationProcesses[storeId];
      if (proc && proc.browser) {
        proc.stopped = true;
        try {
          await proc.browser.close();
        } catch (e) {}
        mainWindow.webContents.send('automation-status', {
          storeId,
          status: 'stopped',
          message: '자동화 중지됨'
        });
        delete automationProcesses[storeId];
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
  timeSync.start(5000, 2000);
  timeSync.on('update', (status) => {
    if (mainWindow) {
      mainWindow.webContents.send('time-sync-update', status);
    }
  });
  timeSync.on('error', (err) => {
    if (mainWindow) {
      mainWindow.webContents.send('time-sync-error', err);
    }
  });
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
  { name: '크로노다임', url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/' },
  { name: '우노판교', url: 'https://www.unopangyo.com/rolex/contact-gyeonggi/' },
  { name: '현대', url: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/' },
  { name: '홍보', url: 'https://www.hongbowatch.co.kr/rolex/contact-busan/' },
];

const config = {
  name: process.env.USER_NAME || '홍길동',
  phone: process.env.USER_PHONE || '01012345678',
  message: process.env.USER_MESSAGE || '롤렉스 데이토나 모델에 관심이 있습니다. 매장 방문 예약을 원합니다.',
  testMode: process.env.TEST_MODE === 'true',
};

async function handleStore(store) {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    locale: 'ko-KR',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });
  // navigator.webdriver 위장
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  const page = await context.newPage();
  try {
    await page.goto(store.url, { waitUntil: 'networkidle' });
    // 1. 인트로에서 메시지 보내기 클릭 (디버깅용 스크린샷 및 강제 클릭)
    try {
      await page.waitForSelector('a.link-button[href*="message"]', { timeout: 10000, state: 'visible' });
      await page.screenshot({ path: `before-message-btn-${store.name}.png` });
      await page.click('a.link-button[href*="message"]', { timeout: 10000, force: true });
      console.log(`[${store.name}] 메시지 보내기 버튼 클릭 성공`);
    } catch (e) {
      await page.screenshot({ path: `fail-message-btn-${store.name}.png` });
      console.error(`[${store.name}] 메시지 보내기 버튼 클릭 실패:`, e);
      return;
    }
    // 2. 메시지 입력 및 제출 (폼 구조에 따라 수정 필요)
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });
    await page.fill('input[name="name"]', config.name);
    await page.fill('input[name="phone"]', config.phone);
    await page.fill('textarea[name="message"]', config.message);
    await page.click('button[type="submit"]', { timeout: 10000 });
    // 3. PASS 인증 팝업/iframe 감지 (30초간 모든 페이지/프레임 정보 출력)
    let passDetected = false;
    for (let i = 0; i < 30; i++) {
      // 팝업 감지
      const pages = context.pages();
      for (const p of pages) {
        const title = await p.title().catch(() => '');
        console.log(`[${store.name}] 열린 페이지: url=${p.url()} title=${title}`);
      }
      if (pages.length > 1) {
        passDetected = true;
        break;
      }
      // iframe 감지
      const frames = page.frames();
      for (const f of frames) {
        console.log(`[${store.name}] 프레임: url=${f.url()} name=${f.name()}`);
      }
      if (frames.some(f => f.url().includes('pass') || f.name().toLowerCase().includes('pass'))) {
        passDetected = true;
        break;
      }
      await page.waitForTimeout(1000);
    }
    if (passDetected) {
      console.log(`[${store.name}] PASS 인증 감지됨! 인증 후 예약 페이지로 이동하세요.`);
      // 실제 자동화라면 인증 완료 후 예약 페이지로 이동
      // await page.goto(store.url.replace('message', 'appointment'));
    } else {
      await page.screenshot({ path: `fail-pass-detect-${store.name}.png` });
      console.log(`[${store.name}] PASS 인증 감지 실패. 수동 확인 필요.`);
    }
    // 이후 예약 페이지 진입 및 동의/날짜/시간/확인 등 추가 플로우는 제거
  } catch (e) {
    await page.screenshot({ path: `fail-error-${store.name}.png` });
    console.error(`[${store.name}] 에러:`, e);
  } finally {
    if (!config.testMode) await browser.close();
  }
}

async function main() {
  await Promise.all(STORES.map(store => handleStore(store)));
}

main();
// 기존 runAutomation 등은 주석 처리
// async function runAutomation(storeId) { /* ... */ }
