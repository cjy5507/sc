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
const STORE_CONFIGS = [
  {
    name: '현대백화점 판교',
    storeUrl: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
  },
  {
    name: '현대백화점 무역센터',
    storeUrl: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
  },
  {
    name: '현대백화점 본점',
    storeUrl: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
  },
  {
    name: '현대백화점 대구',
    storeUrl: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
  },
];

async function main() {
  const TEST_MODE = process.env.TEST_MODE === 'true';
  const config = {
    name: process.env.USER_NAME || '홍길동',
    phone: process.env.USER_PHONE || '01012345678',
    message: process.env.USER_MESSAGE || '롤렉스 데이토나 모델에 관심이 있습니다. 매장 방문 및 가격 문의드립니다.',
    targetDate: process.env.TARGET_DATE || '23',
    targetTime: process.env.TARGET_TIME || '17:30',
    reservationTime: { hours: 0, minutes: 0, seconds: 0 },
  };
  if (TEST_MODE) {
    const testTime = new Date();
    testTime.setSeconds(testTime.getSeconds() + 10); // 10초 후
    config.reservationTime.hours = testTime.getHours();
    config.reservationTime.minutes = testTime.getMinutes();
    config.reservationTime.seconds = testTime.getSeconds();
    console.log(`테스트 모드: 예약 시간이 ${config.reservationTime.hours}:${config.reservationTime.minutes}:${config.reservationTime.seconds}로 설정됨`);
  }

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    locale: 'ko-KR',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  });

  const pages = [];
  for (let i = 0; i < STORE_CONFIGS.length; i++) {
    const page = await context.newPage();
    pages.push(page);
  }

  await Promise.all(pages.map((page, idx) =>
    fullReservationFlow(page, STORE_CONFIGS[idx], `매장${idx+1}`, config)
  ));

  console.log('전체 예약 자동화 플로우 완료. 브라우저를 닫습니다.');
  await browser.close();
}

async function fullReservationFlow(page, storeConfig, pageId, config) {
  try {
    // 1. 인트로에서 메시지 보내기 버튼 클릭
    await page.goto(storeConfig.storeUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await safeClick(page, '#intro > div > div > div.body-text-wrap > a', `${pageId}: 메시지 보내기 버튼`);

    // 2. 메시지 입력 및 제출
    await safeFill(page, 'input[name="name"]', config.name, `${pageId}: 이름 입력`);
    await safeFill(page, 'input[name="phone"]', config.phone, `${pageId}: 전화번호 입력`);
    await safeFill(page, 'textarea[name="message"]', config.message, `${pageId}: 메시지 입력`);
    await safeClick(page, 'button[type="submit"]', `${pageId}: 메시지 제출`);

    // 3. PASS 인증 팝업/iframe 감지 및 대기
    await waitForPassAuth(page, pageId);

    // 4. 예약 페이지로 복귀
    await page.goto(storeConfig.storeUrl, { waitUntil: 'networkidle', timeout: 30000 });
    // 예약 이미지 클릭
    await safeClick(page, '#contact_us > div > div.grid-layout.section-contents > div:nth-child(1) > div.picture-wrap > a > picture > img', `${pageId}: 예약 진입 이미지 클릭`);
    await safeClick(page, '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.picture-wrap > picture > img', `${pageId}: 예약 카드 이미지 클릭`);

    // 5. "동의합니다" 페이지에서 대기
    await waitUntilExactTime(config.reservationTime);
    await safeClick(page, 'button:has-text("동의합니다")', `${pageId}: 동의합니다 버튼 클릭`);

    // 6. 이후 예약 플로우(날짜/시간/확인 등)
    await safeClick(page, `li:has-text("${config.targetDate}")`, `${pageId}: 날짜 선택`);
    await safeClick(page, 'button:has-text("확인")', `${pageId}: 날짜 확인`);
    await safeClick(page, `text=${config.targetTime}`, `${pageId}: 시간 선택`);
    await safeClick(page, 'button:has-text("다음")', `${pageId}: 다음 버튼`);
    // 이후 추가 입력/확인 등 필요시 추가 구현
    console.log(`${pageId}: 예약 플로우 완료`);
  } catch (error) {
    console.error(`${pageId}: 예약 플로우 중 오류:`, error);
  }
}

async function safeClick(page, selector, log) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector);
    console.log(`${log} 성공`);
  } catch (e) {
    console.log(`${log} 실패:`, e.message);
  }
}

async function safeFill(page, selector, value, log) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.fill(selector, value);
    console.log(`${log} 성공`);
  } catch (e) {
    console.log(`${log} 실패:`, e.message);
  }
}

async function waitForPassAuth(page, pageId) {
  console.log(`${pageId}: PASS 인증 팝업/iframe 감지 대기...`);
  const popupPromise = page.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
  const iframePromise = (async () => {
    for (let i = 0; i < 15; i++) {
      const frames = page.frames();
      const passFrame = frames.find(f => f.url().includes('pass') || f.name().toLowerCase().includes('pass'));
      if (passFrame) return passFrame;
      await new Promise(r => setTimeout(r, 1000));
    }
    return null;
  })();
  const result = await Promise.race([popupPromise, iframePromise]);
  if (result) {
    console.log(`${pageId}: PASS 인증 감지됨! (팝업/iframe)`);
    if (result.close) {
      await new Promise(resolve => result.on('close', resolve));
    } else {
      await new Promise(resolve => setTimeout(resolve, 30000)); // 임시 30초 대기
    }
    console.log(`${pageId}: PASS 인증 완료!`);
  } else {
    console.log(`${pageId}: PASS 인증 감지 안됨. 이미 인증되었거나 생략됨.`);
  }
}

async function waitUntilExactTime({ hours, minutes, seconds }) {
  const targetTime = new Date();
  targetTime.setHours(hours, minutes, seconds, 0);
  const now = new Date();
  let timeToWait = targetTime.getTime() - now.getTime();
  if (timeToWait <= 0) {
    targetTime.setDate(targetTime.getDate() + 1);
    timeToWait = targetTime.getTime() - now.getTime();
  }
  if (timeToWait > 0) {
    console.log(`예약 시간까지 ${Math.floor(timeToWait / 1000)}초 대기 중...`);
    await new Promise(resolve => setTimeout(resolve, timeToWait));
  }
}

main().catch(console.error);
// 기존 runAutomation 등은 주석 처리
