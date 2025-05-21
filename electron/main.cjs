import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import electronIsDev from 'electron-is-dev';
// const { ReservationScheduler } = require('../src/services/reservationScheduler');
// const StoreModule = require('electron-store');
// const Store = StoreModule.default || StoreModule;
import { chromium } from 'playwright';
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
    console.log('start-automation called', params);
    const { stores } = params;
    if (!Array.isArray(stores)) return { success: false, error: 'Invalid stores format' };
    const results = [];
    for (const storeId of stores) {
      if (!automationProcesses[storeId]) {
        // Find the store by ID
        const store = STORES.find(s => s.name === storeId);
        if (store) {
          // Create a new process entry
          automationProcesses[storeId] = { stopped: false };
          // Start the automation in a separate async function
          (async () => {
            try {
              automationProcesses[storeId].browser = await handleStore(store);
              if (mainWindow && !automationProcesses[storeId].stopped) {
                mainWindow.webContents.send('automation-status', {
                  storeId,
                  status: 'completed',
                  message: '자동화 완료'
                });
              }
            } catch (error) {
              console.error(`Automation error for ${storeId}:`, error);
              if (mainWindow && !automationProcesses[storeId].stopped) {
                mainWindow.webContents.send('automation-status', {
                  storeId,
                  status: 'error',
                  message: `오류: ${error.message || '알 수 없는 오류'}`
                });
              }
            }
          })();
        }
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
    // 추가 위장: Chrome 관련 메소드
    if (!window.chrome) {
      window.chrome = {};
    }
    // 봇 감지 회피를 위한 추가 조치
    const originalQuery = Element.prototype.querySelector;
    Element.prototype.querySelector = function(selector) {
      if (selector === '[automation=true]') {
        return null;
      }
      return originalQuery.call(this, selector);
    };
  });
  
  try {
    console.log(`[${store.name}] 자동화 시작`);
    
    // 두 개의 탭 동시에 열기 - 이 부분이 핵심
    // 탭 1: 인증용
    const authPage = await context.newPage();
    
    // 탭 2: 예약용 (동시에 미리 생성)
    const appointmentPage = await context.newPage();
    
    // 인증 페이지 먼저 로드
    console.log(`[${store.name}] 인증 페이지 로드 중...`);
    await authPage.goto(store.url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // 예약 페이지 URL 패턴 (나중에 사용)
    const appointmentUrl = store.url.replace(/\/contact-[^/]+\/?$/, '/appointment/');
    console.log(`[${store.name}] 예약 URL 준비: ${appointmentUrl}`);
    
    // 예약 페이지도 미리 로드 (인증되지 않았으므로 접근 불가능할 수 있음)
    try {
      console.log(`[${store.name}] 예약 페이지 미리 로드 시도...`);
      await appointmentPage.goto(appointmentUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      console.log(`[${store.name}] 예약 페이지 초기 로드 완료`);
    } catch (e) {
      console.log(`[${store.name}] 예약 페이지 초기 로드 실패 (정상적인 현상): ${e.message}`);
    }
    
    // 인증 페이지에서 메시지 보내기 클릭
    try {
      console.log(`[${store.name}] 메시지 보내기 버튼 찾는 중...`);
      await authPage.waitForSelector('a.link-button[href*="message"]', { 
        timeout: 10000, 
        state: 'visible' 
      });
      
      // 디버깅용 스크린샷
      await authPage.screenshot({ path: `before-message-btn-${store.name}.png` });
      
      // 자연스러운 클릭 구현
      console.log(`[${store.name}] 메시지 보내기 버튼 클릭 준비...`);
      const linkButton = await authPage.$('a.link-button[href*="message"]');
      
      if (linkButton) {
        // 요소 중앙으로 마우스 이동
        const box = await linkButton.boundingBox();
        if (box) {
          // 자연스러운 움직임으로 마우스 이동
          await authPage.mouse.move(
            box.x + box.width / 2 + (Math.random() * 10 - 5),
            box.y + box.height / 2 + (Math.random() * 10 - 5),
            { steps: 10 }
          );
          // 잠시 대기
          await authPage.waitForTimeout(Math.random() * 500 + 300);
          // 클릭
          await authPage.mouse.down();
          await authPage.waitForTimeout(Math.random() * 100 + 50);
          await authPage.mouse.up();
        } else {
          await authPage.click('a.link-button[href*="message"]', { timeout: 10000, force: true });
        }
      } else {
        await authPage.click('a.link-button[href*="message"]', { timeout: 10000, force: true });
      }
      
      console.log(`[${store.name}] 메시지 보내기 버튼 클릭 성공`);
    } catch (e) {
      console.error(`[${store.name}] 메시지 보내기 버튼 클릭 실패:`, e);
      await authPage.screenshot({ path: `fail-message-btn-${store.name}.png` });
      return browser; // 실패 시 브라우저 인스턴스 반환
    }
    
    // 인증 페이지에서 메시지 입력 및 제출
    console.log(`[${store.name}] 메시지 입력 폼 대기 중...`);
    await authPage.waitForSelector('input[name="name"]', { timeout: 10000 });
    
    // 자연스러운 입력
    console.log(`[${store.name}] 메시지 입력 시작...`);
    await authPage.fill('input[name="name"]', config.name);
    await authPage.waitForTimeout(Math.random() * 500 + 300);
    await authPage.fill('input[name="phone"]', config.phone);
    await authPage.waitForTimeout(Math.random() * 500 + 300);
    await authPage.fill('textarea[name="message"]', config.message);
    await authPage.waitForTimeout(Math.random() * 500 + 300);
    
    // 제출 버튼 자연스럽게 클릭
    console.log(`[${store.name}] 메시지 제출 버튼 찾는 중...`);
    const submitButton = await authPage.$('button[type="submit"]');
    if (submitButton) {
      console.log(`[${store.name}] 제출 버튼 클릭 준비...`);
      const box = await submitButton.boundingBox();
      if (box) {
        await authPage.mouse.move(
          box.x + box.width / 2 + (Math.random() * 10 - 5),
          box.y + box.height / 2 + (Math.random() * 10 - 5),
          { steps: 10 }
        );
        await authPage.waitForTimeout(Math.random() * 300 + 200);
        await authPage.mouse.down();
        await authPage.waitForTimeout(Math.random() * 100 + 50);
        await authPage.mouse.up();
      } else {
        await authPage.click('button[type="submit"]', { timeout: 10000 });
      }
    } else {
      await authPage.click('button[type="submit"]', { timeout: 10000 });
    }
    console.log(`[${store.name}] 메시지 제출 완료`);
    
    // PASS 인증 대기 (최대 2분)
    console.log(`[${store.name}] PASS 인증 대기 시작 (최대 2분)`);
    let authCompleted = false;
    
    // 인증 대기 루프
    for (let i = 0; i < 120; i++) {
      // 현재 모든 페이지 URL 체크
      const pages = context.pages();
      for (const p of pages) {
        try {
          const url = p.url();
          console.log(`[${store.name}] 체크 중인 페이지 URL: ${url}`);
          
          // 인증이 완료된 경우 체크 (특정 URL 패턴이나 마이페이지 표시 등)
          if (url.includes('/mypage') || url.includes('/user') || url.includes('/profile') || 
              url.includes('message/complete') || url.includes('auth/success')) {
            console.log(`[${store.name}] 인증 완료 감지됨! URL: ${url}`);
            authCompleted = true;
            break;
          }
        } catch (urlErr) {
          // URL 가져오기 실패 시 무시하고 계속 진행
          continue;
        }
      }
      
      if (authCompleted) break;
      await authPage.waitForTimeout(1000); // 1초마다 체크
    }
    
    if (!authCompleted) {
      console.log(`[${store.name}] 2분 내 인증 완료가 감지되지 않음. 수동 인증 필요`);
      await authPage.screenshot({ path: `auth-wait-timeout-${store.name}.png` });
      return browser; // 인증 실패 시 브라우저 인스턴스 반환
    }
    
    console.log(`[${store.name}] 인증 완료! 예약 페이지로 이동 시도`);
    
    // 인증 완료 후 반드시 예약 페이지 새로고침 - 핵심!
    try {
      console.log(`[${store.name}] 예약 페이지 새로고침 시작...`);
      
      // 이미 열린 예약 페이지 새로고침
      await appointmentPage.goto(appointmentUrl, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      console.log(`[${store.name}] 예약 페이지 새로고침 완료`);
      
      // 페이지가 완전히 로드될 때까지 추가 대기
      await appointmentPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log(`[${store.name}] 추가 페이지 로딩 대기 시간 초과, 계속 진행`);
      });
      
      // 추가 대기 (사이트 특성에 따라 조정)
      await appointmentPage.waitForTimeout(2000);
      
      // 예약 버튼 클릭 (여러 셀렉터 시도)
      console.log(`[${store.name}] 예약 버튼 찾는 중...`);
      const reservationSelectors = [
        'button.reservation-button',
        'a.reservation-link',
        'a[href*="reservation"]',
        'button[data-target="reservation"]',
        '.appointment-selector button',
        '.time-selector button',
        // 크로노다임 매장 특화 셀렉터
        '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.picture-wrap > picture > img',
        '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.text-wrap > div > div.text-body-24.text-bold',
        'div.text-body-24.text-bold',
        // 일반적인 예약 관련 텍스트 포함 요소
        'a:has-text("예약")',
        'button:has-text("예약")',
        'a:has-text("appointment")',
        'button:has-text("appointment")'
      ];
      
      let reservationButtonClicked = false;
      
      for (const selector of reservationSelectors) {
        try {
          console.log(`[${store.name}] 셀렉터 시도: ${selector}`);
          
          // 버튼이 있는지 확인
          const buttonExists = await appointmentPage.waitForSelector(selector, { 
            timeout: 5000,
            state: 'visible'
          }).catch(() => null);
          
          if (buttonExists) {
            console.log(`[${store.name}] 예약 버튼 발견: ${selector}`);
            
            // 자연스러운 클릭 구현
            const box = await buttonExists.boundingBox();
            if (box) {
              await appointmentPage.mouse.move(
                box.x + box.width / 2 + (Math.random() * 10 - 5),
                box.y + box.height / 2 + (Math.random() * 10 - 5),
                { steps: 15 }
              );
              await appointmentPage.waitForTimeout(Math.random() * 500 + 300);
              await appointmentPage.mouse.down();
              await appointmentPage.waitForTimeout(Math.random() * 100 + 50);
              await appointmentPage.mouse.up();
            } else {
              await appointmentPage.click(selector);
            }
            
            console.log(`[${store.name}] 예약 버튼 클릭 성공: ${selector}`);
            reservationButtonClicked = true;
            
            // 추가: 확인 버튼이 있을 경우 클릭 (선택된 시간이나 날짜 확인)
            await appointmentPage.waitForTimeout(1000);
            
            try {
              const confirmSelector = '#fappointment > div:nth-child(25) > footer > button';
              const confirmExists = await appointmentPage.waitForSelector(confirmSelector, { 
                timeout: 5000,
                state: 'visible'
              }).catch(() => null);
              
              if (confirmExists) {
                console.log(`[${store.name}] 확인 버튼 발견, 클릭 시도...`);
                await appointmentPage.click(confirmSelector);
                console.log(`[${store.name}] 확인 버튼 클릭 성공`);
              }
            } catch (confirmErr) {
              console.log(`[${store.name}] 확인 버튼 처리 중 오류 (무시 가능): ${confirmErr.message}`);
            }
            
            break;
          }
        } catch (err) {
          console.log(`[${store.name}] '${selector}' 셀렉터 시도 실패: ${err.message}`);
          // 다음 셀렉터 시도 계속
        }
      }
      
      if (!reservationButtonClicked) {
        console.log(`[${store.name}] 예약 버튼을 찾을 수 없음. HTML 구조 캡처 중...`);
        const pageContent = await appointmentPage.content();
        const contentPreview = pageContent.substring(0, 1000) + '... (truncated)';
        console.log(`[${store.name}] 페이지 내용 일부: ${contentPreview}`);
        await appointmentPage.screenshot({ path: `reservation-button-not-found-${store.name}.png` });
      } else {
        console.log(`[${store.name}] 예약 프로세스 완료. 세션 유지 중...`);
        
        // 성공 스크린샷 캡처
        await appointmentPage.screenshot({ path: `reservation-success-${store.name}.png` });
        
        // 테스트 모드가 아니면 브라우저 유지 (세션 유지)
        if (!config.testMode) {
          console.log(`[${store.name}] 실전 모드: 세션 무한 유지 중...`);
          // 브라우저 인스턴스 반환하여 세션 유지
          return browser;
        }
      }
    } catch (e) {
      console.error(`[${store.name}] 예약 페이지 처리 중 오류:`, e);
      await appointmentPage.screenshot({ path: `reservation-error-${store.name}.png` });
    }
    
    return browser;
  } catch (e) {
    console.error(`[${store.name}] 전체 프로세스 오류:`, e);
    return browser;
  }
}

async function main() {
  await Promise.all(STORES.map(store => handleStore(store)));
}

// Commented out to prevent automatic execution on startup
// main();
// 기존 runAutomation 등은 주석 처리
// async function runAutomation(storeId) { /* ... */ }
