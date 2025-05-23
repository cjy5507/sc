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
// 앱 종료 여부 플래그
let isAppQuitting = false;

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
      // 기존 프로세스 확인
      if (automationProcesses[storeId]) {
        // 이미 실행 중이면 메시지만 보내고 계속 진행
        results.push({ storeId, status: 'running', message: '이미 자동화가 실행 중입니다' });
        continue;
      }
      
      // 매장 정보 조회
      const store = STORES.find(s => s.name === storeId);
      if (!store) {
        results.push({ storeId, status: 'error', message: '알 수 없는 매장입니다' });
        continue;
      }
      
      // 새 프로세스 항목 생성
      automationProcesses[storeId] = { stopped: false };
      
      // 자동화 프로세스 시작 (비동기)
      (async () => {
        try {
          // 매장 정보에 설정 정보 추가
          const storeWithConfig = {
            ...store,
            config: {
              name: config.name,
              phone: config.phone,
              message: config.message,
              testMode: config.testMode
            }
          };
          
          console.log(`[${storeId}] 자동화 프로세스 시작 중...`);
          if (mainWindow) {
            mainWindow.webContents.send('automation-status', {
              storeId,
              status: 'starting',
              message: '자동화 시작 중...'
            });
          }
          
          automationProcesses[storeId].browser = await startAutomationProcess(storeWithConfig);
          
          if (mainWindow && !automationProcesses[storeId]?.stopped) {
            mainWindow.webContents.send('automation-status', {
              storeId,
              status: 'completed',
              message: '자동화 완료'
            });
          }
        } catch (error) {
          console.error(`[${storeId}] 자동화 오류:`, error);
          if (mainWindow && !automationProcesses[storeId]?.stopped) {
            mainWindow.webContents.send('automation-status', {
              storeId,
              status: 'error',
              message: `오류: ${error.message || '알 수 없는 오류'}`
            });
          }
        }
      })();
      
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

  ipcMain.handle('stop-automation', async (event, { stores, closeBrowser = false }) => {
    console.log(`Stop automation called with stores: ${stores.join(', ')}, closeBrowser: ${closeBrowser}`);
    if (!Array.isArray(stores)) return { success: false, error: 'No stores provided' };
    
    const results = [];
    
    for (const storeId of stores) {
      console.log(`Processing stop request for store: ${storeId}`);
      // 이미 automationProcesses[storeId]가 없을 수 있으므로 초기화
      if (!automationProcesses[storeId]) {
        automationProcesses[storeId] = { stopped: true };
        console.log(`No process object found for store: ${storeId}, creating one`);
        results.push({ storeId, success: true, message: 'No process found, marked as stopped' });
        continue;
      }
      
      const proc = automationProcesses[storeId];
      proc.stopped = true;
      
      // 브라우저가 없는 경우 처리
      if (!proc.browser) {
        console.log(`No active browser found for store: ${storeId}`);
        results.push({ storeId, success: true, message: 'No active browser found' });
        continue;
      }
      
      try {
        // closeBrowser 옵션이 true인 경우 브라우저 종료
        if (closeBrowser) {
          console.log(`Closing browser for store: ${storeId}`);
          try {
            // 브라우저 객체 종료
            await proc.browser.close();
            console.log(`Browser closed successfully for store: ${storeId}`);
            
            // 자원 해제
            delete automationProcesses[storeId].browser;
            delete automationProcesses[storeId].pausedBrowser;
          } catch (closeErr) {
            console.error(`Browser close error for ${storeId}:`, closeErr);
            results.push({ storeId, success: false, error: closeErr.message });
            continue;
          }
        } else {
          console.log(`Pausing browser for store: ${storeId} (not closing)`);
          // 브라우저 종료하지 않고 중지 상태로 표시
          try {
            const context = proc.browser.contexts()[0];
            if (context) {
              // 모든 페이지에 중지 알림 표시
              for (const page of context.pages()) {
                try {
                  await page.evaluate(() => {
                    // 페이지에 오버레이 추가하여 중지 상태 표시
                    const overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100%';
                    overlay.style.height = '100%';
                    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    overlay.style.color = 'white';
                    overlay.style.display = 'flex';
                    overlay.style.alignItems = 'center';
                    overlay.style.justifyContent = 'center';
                    overlay.style.zIndex = '9999999';
                    overlay.style.fontSize = '24px';
                    overlay.style.fontWeight = 'bold';
                    overlay.innerHTML = '<div>자동화가 중지되었습니다</div>';
                    document.body.appendChild(overlay);
                  }).catch(err => {
                    console.log(`오버레이 추가 실패: ${err.message}`);
                  });
                } catch (e) {
                  // 페이지 접근 오류 무시
                }
              }
            }
            
            // 브라우저 닫지 않고 저장
            automationProcesses[storeId].pausedBrowser = proc.browser;
          } catch (e) {
            console.error(`자동화 중지 중 오류: ${e.message}`);
          }
        }
        
        // 상태 업데이트 메시지 전송
        if (mainWindow) {
          mainWindow.webContents.send('automation-status', {
            storeId,
            status: 'idle',
            message: closeBrowser ? '자동화 종료됨' : '자동화 일시중지됨'
          });
        }
        
        results.push({ storeId, success: true });
      } catch (e) {
        console.error(`자동화 중지 중 오류: ${e.message}`);
        // 오류 발생 시 브라우저 닫기 시도
        try {
          await proc.browser.close();
        } catch (closeErr) {
          console.error(`브라우저 닫기 오류: ${closeErr.message}`);
        }
        results.push({ storeId, success: false, error: e.message });
        if (mainWindow) {
          mainWindow.webContents.send('automation-status', {
            storeId,
            status: 'stopped',
            message: '자동화 중지됨'
          });
        }
        delete automationProcesses[storeId];
      }
    }
    return { success: true, results };
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
  { 
    name: '크로노다임', 
    url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/',
    selector: '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.text-wrap > div > div.text-body-24.text-bold'
  },
  { 
    name: '우노판교', 
    url: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
    selector: 'div.text-body-24.text-bold'
  },
  { 
    name: '현대', 
    url: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/',
    selector: 'a div.text-wrap div div.text-body-24.text-bold'
  },
  { 
    name: '홍보', 
    url: 'https://www.hongbowatch.co.kr/rolex/contact-busan/',
    selector: 'div.text-body-24.text-bold'
  },
];

const config = {
  name: process.env.USER_NAME || '홍길동',
  phone: process.env.USER_PHONE || '01012345678',
  message: process.env.USER_MESSAGE || '롤렉스 데이토나 모델에 관심이 있습니다. 매장 방문 예약을 원합니다.',
  testMode: process.env.TEST_MODE === 'true',
};

// 향상된 브라우저 창 생성 함수
function createBrowserWindow(url, options = {}) {
  // 기본 옵션과 병합
  const windowOptions = {
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // 봇 감지 우회를 위한 설정
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    ...options
  };

  const win = new BrowserWindow(windowOptions);
  
  // 웹드라이버 관련 속성 숨기기 (봇 감지 우회)
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      // WebDriver 속성 숨기기
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });
      
      // 자연스러운 마우스 움직임 시뮬레이션을 위한 함수
      window._simulateHumanBehavior = function() {
        // 랜덤 딜레이로 스크롤
        const randomScroll = () => {
          const scrollAmount = Math.floor(Math.random() * 100);
          window.scrollBy(0, scrollAmount);
        };
        
        // 간헐적으로 랜덤 스크롤 실행
        setInterval(() => {
          if(Math.random() > 0.7) randomScroll();
        }, 2000 + Math.random() * 3000);
      };
      
      // 크롬 속성 에뮬레이션
      const originalChrome = window.chrome || {};
      window.chrome = {
        ...originalChrome,
        runtime: {},
        app: {},
        loadTimes: function() {},
        csi: function() {},
        webstore: {}
      };
      
      // 시작 시 인간 행동 시뮬레이션 실행
      setTimeout(() => {
        if(window._simulateHumanBehavior) window._simulateHumanBehavior();
      }, 1000);
    `);
  });

  // 창 닫힘 방지 및 오류 복구 로직
  setupWindowErrorHandling(win);

  return win;
}

// 창 닫힘 방지 및 오류 복구 로직
function setupWindowErrorHandling(window) {
  // 창 닫힘 이벤트 가로채기
  window.on('close', (e) => {
    if (!isAppQuitting) {
      e.preventDefault(); // 창 닫기 방지
      window.hide();      // 대신 숨기기만 함
    }
  });
  
  // 페이지 로드 실패 처리
  window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('페이지 로드 실패:', errorDescription);
    // 일정 시간 후 다시 시도
    setTimeout(() => {
      window.reload();
    }, 3000);
  });
  
  // 렌더러 프로세스 충돌 처리
  window.webContents.on('crashed', () => {
    console.error('렌더러 프로세스 충돌');
    // 창 재로드
    window.reload();
  });
}

// 개선된 자동화 시작 프로세스
async function startAutomationProcess(store) {
  let browser;
  let authPage;
  let reservationPage;
  
  try {
    // 이미 실행 중인 브라우저 확인
    if (automationProcesses[store.name]?.browser) {
      console.log(`Store ${store.name} already has a running browser. Stopping it first.`);
      try {
        // 기존 브라우저 종료
        await automationProcesses[store.name].browser.close();
        console.log(`Closed existing browser for ${store.name}`);
      } catch (error) {
        console.error(`Error closing existing browser for ${store.name}:`, error);
      }
    }
    
    // 새 브라우저 시작
    console.log(`[${store.name}] 자동화 시작 - 브라우저 초기화 중...`);
    
    // 브라우저 옵션 최소화
    browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized']
    });
    
    console.log(`[${store.name}] 브라우저 실행됨, 컨텍스트 생성 중...`);
    
    // 기본 컨텍스트 생성
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // 최소한의 봇 감지 방지
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    // 상태 업데이트
    if (mainWindow) {
      mainWindow.webContents.send('automation-status', {
        storeId: store.name,
        status: 'running',
        message: '브라우저 시작됨'
      });
    }
    
    // 브라우저 저장 - 매장별 관리
    automationProcesses[store.name].browser = browser;
    
    // 1. 두 페이지 연속해서 바로 생성
    console.log(`[${store.name}] 페이지 생성 중...`);
    
    // 인증 페이지와 예약 페이지 URL 준비
    const authUrl = store.url;
    const appointmentUrl = store.url.includes('/appointment/') 
      ? store.url 
      : store.url.replace(/\/contact-[^/]+\/?$/, '/contact-seoul/appointment/');
    
    // 두 페이지 모두 생성
    authPage = await context.newPage();
    console.log(`[${store.name}] 인증 페이지 생성됨`);
    
    reservationPage = await context.newPage();
    console.log(`[${store.name}] 예약 페이지 생성됨`);
    
    // 2. 페이지 로드 단계
    console.log(`[${store.name}] 페이지 로드 시작...`);
    
    // 인증 페이지 로드
    if (mainWindow) {
      mainWindow.webContents.send('automation-status', {
        storeId: store.name,
        status: 'cookie',
        message: '인증 페이지 로드 중...'
      });
    }
    
    // 병렬로 페이지 로드 - 인증 페이지 먼저 시작
    const authLoadPromise = authPage.goto(authUrl, { 
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    }).catch(err => {
      console.error(`[${store.name}] 인증 페이지 로드 오류: ${err.message}`);
    });
    
    // 인증 페이지 로드가 시작되면 예약 페이지도 로드 시작
    await authPage.waitForTimeout(1000);
    
    if (mainWindow) {
      mainWindow.webContents.send('automation-status', {
        storeId: store.name,
        status: 'waiting',
        message: '예약 페이지 로드 중...'
      });
    }
    
    const reservationLoadPromise = reservationPage.goto(appointmentUrl, { 
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    }).catch(err => {
      console.error(`[${store.name}] 예약 페이지 로드 오류: ${err.message}`);
    });
    
    // 두 페이지가 모두 로드될 때까지 대기
    await Promise.all([authLoadPromise, reservationLoadPromise]);
    console.log(`[${store.name}] 모든 페이지 로드 완료`);
    
    // 인증 페이지 활성화
    await authPage.bringToFront();
    console.log(`[${store.name}] 인증 페이지 활성화됨`);
    
    // 쿠키 및 광고 처리
    await handleCookiesAndAds(authPage, store);
    
    // 인증 상태 모니터링 설정
    setupAuthStatusMonitoring(context, store.name, reservationPage);
    
    // 자정 예약 자동화 설정
    setupMidnightReservation(store, reservationPage);
    
    // 인증 페이지에서 자동화 계속 진행
    await handleAuthPage(authPage, store);
    
    return browser;
  } catch (error) {
    console.error(`[${store.name}] 자동화 프로세스 오류:`, error);
    
    // 스크린샷 캡처 시도
    try {
      if (authPage) {
        await authPage.screenshot({ path: `${store.name}_auth_error.png` });
        console.log(`[${store.name}] 인증 페이지 오류 스크린샷 저장됨`);
      }
      if (reservationPage) {
        await reservationPage.screenshot({ path: `${store.name}_reservation_error.png` });
        console.log(`[${store.name}] 예약 페이지 오류 스크린샷 저장됨`);
      }
    } catch (screenshotErr) {
      console.log(`[${store.name}] 스크린샷 저장 실패: ${screenshotErr.message}`);
    }
    
    if (mainWindow) {
      mainWindow.webContents.send('automation-status', {
        storeId: store.name,
        status: 'error',
        message: `자동화 오류: ${error.message}`
      });
    }
    
    // 브라우저 정리
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error(`[${store.name}] 브라우저 종료 오류: ${closeErr.message}`);
      }
    }
    
    throw error;
  }
}

// 인증 상태 모니터링 함수
function setupAuthStatusMonitoring(context, storeName, reservationPage) {
  // 인증 완료 감지를 위한 인터벌 설정
  const checkInterval = setInterval(() => {
    if (automationProcesses[storeName]?.stopped) {
      clearInterval(checkInterval);
      return;
    }
    
    // 모든 페이지 확인
    context.pages().forEach(async (page) => {
      try {
        const url = page.url();
        
        // 인증 완료 URL 패턴 체크
        if (url.includes('/mypage') || 
            url.includes('/user') || 
            url.includes('/profile') || 
            url.includes('message/complete') || 
            url.includes('auth/success')) {
          console.log(`[${storeName}] 인증 완료 감지됨! URL: ${url}`);
          
          // 예약 페이지로 포커스 전환 전에 페이지 상태 확인
          const isReservationPageActive = await reservationPage.evaluate(() => {
            return document.visibilityState === 'visible' && !document.hidden;
          }).catch(() => false);
          
          if (!isReservationPageActive) {
            try {
              // 예약 페이지 활성화 시도
              await reservationPage.bringToFront();
              
              // 인증 완료 이벤트 발송
              if (mainWindow) {
                mainWindow.webContents.send('automation-status', {
                  storeId: storeName,
                  status: 'auth-completed',
                  message: 'PASS 인증 완료, 예약 페이지로 전환됨'
                });
              }
              
              // 예약 페이지 스크롤 및 새로고침
              await reservationPage.evaluate(() => {
                window.scrollTo(0, 0);
              });
              
              // 필요 시 예약 페이지 새로고침
              const appointmentUrl = page.url().includes('/appointment/') 
                ? page.url() 
                : page.url().replace(/\/contact-[^/]+\/?$/, '/contact-seoul/appointment/');
              
              try {
                await reservationPage.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
                console.log(`[${storeName}] 인증 완료 후 예약 페이지 새로고침 성공`);
              } catch (reloadErr) {
                console.error(`[${storeName}] 예약 페이지 새로고침 실패: ${reloadErr.message}`);
              }
            } catch (focusErr) {
              console.error(`[${storeName}] 예약 페이지 포커스 전환 실패: ${focusErr.message}`);
            }
          }
          
          // 인증 완료 후 모니터링 중지
          clearInterval(checkInterval);
        }
      } catch (err) {
        // URL 가져오기 오류 무시
      }
    });
  }, 1000); // 1초마다 체크
}

// 자정 예약 자동화 설정
function setupMidnightReservation(store, reservationPage) {
  // 현재 시간 기준으로 자정까지 남은 시간 계산
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 900); // 자정 직전으로 설정
  
  // 오늘이 말일이고 자정 근처라면
  if (now.getDate() === endOfMonth.getDate() && 
      now.getHours() >= 23 && now.getMinutes() >= 50) {
    
    console.log(`[${store.name}] 자정 예약 준비 중...`);
    
    // 자정까지 남은 밀리초 계산
    const millisToMidnight = endOfMonth.getTime() - now.getTime() + 100; // 0.1초 추가
    
    // 자정에 맞춰 예약 버튼 클릭 실행
    setTimeout(() => {
      if (!automationProcesses[store.name]?.stopped) {
        console.log(`[${store.name}] 자정 정각: 예약 시도 실행`);
        
        // 예약 페이지 활성화 확인
        reservationPage.bringToFront()
          .then(() => {
            console.log(`[${store.name}] 예약 페이지 활성화 성공`);
            
            // 필요 시 예약 페이지 새로고침
            return reservationPage.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
              .catch(err => {
                console.log(`[${store.name}] 예약 페이지 새로고침 불필요: ${err.message}`);
              });
          })
          .then(() => {
            return executeReservationForStore(reservationPage, store);
          })
          .then(() => {
            if (mainWindow) {
              mainWindow.webContents.send('automation-status', {
                storeId: store.name,
                status: 'reservation-attempt',
                message: '자정 정각: 예약 시도 중...'
              });
            }
          })
          .catch(err => {
            console.error(`[${store.name}] 자정 예약 시도 중 오류: ${err.message}`);
          });
      }
    }, millisToMidnight);
    
    // 로그 및 상태 업데이트
    if (mainWindow) {
      mainWindow.webContents.send('automation-status', {
        storeId: store.name,
        status: 'midnight-waiting',
        message: `자정 예약 대기 중: ${Math.floor(millisToMidnight/1000)}초 남음`
      });
    }
    console.log(`[${store.name}] 자정까지 대기 중: ${millisToMidnight}ms`);
    
    // 카운트다운 업데이트
    const countdownInterval = setInterval(() => {
      if (automationProcesses[store.name]?.stopped) {
        clearInterval(countdownInterval);
        return;
      }
      
      const remaining = endOfMonth.getTime() - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        return;
      }
      
      if (mainWindow && remaining % 10000 < 1000) { // 10초마다 업데이트
        mainWindow.webContents.send('automation-status', {
          storeId: store.name,
          status: 'midnight-waiting',
          message: `자정 예약 대기 중: ${Math.ceil(remaining/1000)}초 남음`
        });
      }
    }, 1000);
  }
}

// 인증 페이지 처리 함수
async function handleAuthPage(page, store) {
  try {
    // 쿠키 및 광고 처리
    await handleCookiesAndAds(page, store);
    
    // 인증 페이지에서 메시지 보내기 클릭
    try {
      if (mainWindow) {
        mainWindow.webContents.send('automation-status', {
          storeId: store.name,
          status: 'contact',
          message: '메시지 보내기 준비 중...'
        });
      }
      
      console.log(`[${store.name}] 메시지 보내기 버튼 찾는 중...`);
      
      // 이미지 요소 찾기 시도
      console.log(`[${store.name}] 이미지 요소 및 롤렉스 콜렉션 살펴보기 찾기 시도...`);
      
      // 먼저 JavaScript 함수 호출 시도 (select_type 함수)
      try {
        console.log(`[${store.name}] select_type 함수 호출 시도...`);
        
        const collectionResult = await page.evaluate(() => {
          try {
            // select_type 함수 호출 시도
            if (typeof select_type === 'function') {
              console.log('select_type("collection") 함수 호출');
              select_type('collection');
              return { success: true, message: 'select_type 함수 호출 성공' };
            }
            
            // 롤렉스 콜렉션 관련 요소 찾기
            const collectionLinks = document.querySelectorAll('a[onclick*="select_type"], a[onclick*="collection"], a[data-type="collection"]');
            if (collectionLinks.length > 0) {
              console.log('콜렉션 링크 발견, 클릭 시도');
              collectionLinks[0].click();
              return { success: true, message: '콜렉션 링크 클릭 성공' };
            }
            
            // 롤렉스 콜렉션 텍스트 포함한 링크 찾기
            const allLinks = document.querySelectorAll('a');
            for (const link of allLinks) {
              const text = link.textContent?.toLowerCase() || '';
              if (text.includes('롤렉스 콜렉션') || text.includes('rolex collection')) {
                console.log('롤렉스 콜렉션 텍스트 링크 발견, 클릭 시도');
                link.click();
                return { success: true, message: '롤렉스 콜렉션 텍스트 링크 클릭 성공' };
              }
            }
            
            return { success: false, message: 'select_type 함수 또는 콜렉션 링크 발견 실패' };
          } catch (e) {
            return { success: false, message: e.message };
          }
        }).catch(e => ({ success: false, message: e.message }));
        
        console.log(`[${store.name}] 콜렉션 JavaScript 처리 결과:`, collectionResult);
        
        if (collectionResult.success) {
          console.log(`[${store.name}] 콜렉션 JavaScript 처리 성공`);
          await page.waitForTimeout(2000); // 페이지 변화 대기
          return; // 성공적으로 처리되었으므로 다음 방법 시도하지 않음
        }
      } catch (jsError) {
        console.log(`[${store.name}] 콜렉션 JavaScript 처리 시도 중 오류:`, jsError);
      }
      
      // 셀렉터를 통한 방법 시도 (백업)
      console.log(`[${store.name}] 셀렉터를 통한 콜렉션 찾기 시도...`);
      
      // 우노판교 셀렉터 및 기타 셀렉터 정의
      const imageSelectors = [
        // 우노판교 지정 셀렉터
        '#fappointment > div:nth-child(24) > div > div > a:nth-child(1)',
        '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.picture-wrap > picture > img',
        '#fappointment > div:nth-child(24) > div > div > a:nth-child(1) > div.text-wrap',
        // 롤렉스 콜렉션 관련 셀렉터
        'a[onclick*="select_type"]',
        'a[data-type="collection"]',
        'a.purpose',
        // 크로노다임 이미지
        'img[src*="official-rolex-retailer-watches.webp"]',
        'img[alt*="크로노다임"]',
        'img[alt*="문의하기"]',
        '#fappointment > div > div > div > a > div.picture-wrap > picture > img',
        // 롤렉스 콜렉션 살펴보기 텍스트
        'a:has-text("롤렉스 콜렉션 살펴보기")',
        'div:has-text("롤렉스 콜렉션 살펴보기")',
        'span:has-text("롤렉스 콜렉션 살펴보기")',
        // 일반적인 셀렉터
        'img[alt*="롯데"]',
        'img[alt*="현대"]',
        'img[alt*="우노"]',
        'img[alt*="홍보"]',
        'img[alt*="롤렉스"]',
        'img[alt*="문의"]',
        'img[alt*="예약"]',
        'img[src*="rolex"]',
        '.picture-wrap img',
        '.contact-image img',
        '.store-image img',
        // 추가 셀렉터
        'a[href*="collection"]',
        'a[href*="watches"]',
        'a[href*="appointment"]'
      ];
      
      let imageFound = false;
      
      for (const selector of imageSelectors) {
        try {
          // 요소가 존재하는지 확인
          const elementExists = await page.$(selector).then(Boolean).catch(() => false);
          if (!elementExists) continue;
          
          console.log(`[${store.name}] 요소 발견: ${selector}`);
          
          // onclick 속성 확인
          const hasOnClick = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            return element && (element.getAttribute('onclick') || element.onclick);
          }, selector).catch(() => false);
          
          if (hasOnClick) {
            console.log(`[${store.name}] onclick 속성 발견, 클릭 시도`);
            await page.click(selector, { force: true }).catch(e => {
              console.log(`[${store.name}] 클릭 실패: ${e.message}`);
            });
            
            // JavaScript 함수 직접 호출 시도
            await page.evaluate((sel) => {
              const element = document.querySelector(sel);
              if (element) {
                const onclickAttr = element.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes('select_type')) {
                  try {
                    select_type('collection');
                    return true;
                  } catch (e) {
                    console.error('select_type 호출 오류:', e);
                  }
                }
                // 일반 클릭 시도
                element.click();
              }
              return false;
            }, selector).catch(() => false);
            
            await page.waitForTimeout(2000);
            imageFound = true;
            break;
          } else {
            // 일반 요소 클릭
            console.log(`[${store.name}] 일반 요소 클릭 시도`);
            await page.click(selector, { force: true }).catch(e => {
              console.log(`[${store.name}] 클릭 실패: ${e.message}`);
            });
            await page.waitForTimeout(2000);
            imageFound = true;
            break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
          console.log(`[${store.name}] 셀렉터 '${selector}' 시도 실패: ${e.message}`);
        }
      }
      
      if (imageFound) {
        console.log(`[${store.name}] 이미지 요소를 통해 예약 페이지로 이동 성공`);
        return; // 이미지를 통해 이동했으므로 함수 종료
      }
      
      // 이미지를 찾지 못한 경우 기존 방식으로 버튼 찾기 시도
      console.log(`[${store.name}] 이미지 요소를 찾지 못해 버튼 찾기로 전환`);
      
      // 여러 선택자 시도
      const messageButtonSelectors = [
        'a.link-button[href*="message"]',
        'a[href*="message"]',
        'a.btn-contact',
        'a:has-text("메시지 보내기")',
        'a:has-text("문의하기")',
        'a:has-text("연락하기")',
        'a:has-text("예약하기")'
      ];
      
      let messageButtonFound = false;
      
      for (const selector of messageButtonSelectors) {
        const isVisible = await page.isVisible(selector).catch(() => false);
        
        if (isVisible) {
          console.log(`[${store.name}] 메시지 버튼 발견: ${selector}`);
          
          // 스크롤하여 버튼 보이게 하기
          await page.evaluate(sel => {
            const elem = document.querySelector(sel);
            if (elem) {
              elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, selector);
          
          // 잠시 대기
          await page.waitForTimeout(Math.random() * 1000 + 500);
          
          // 자연스러운 마우스 움직임과 클릭
          const button = await page.$(selector);
          if (button) {
            const box = await button.boundingBox();
            if (box) {
              await page.mouse.move(
                box.x + box.width / 2 + (Math.random() * 10 - 5),
                box.y + box.height / 2 + (Math.random() * 10 - 5),
                { steps: 15 }
              );
              await page.waitForTimeout(Math.random() * 300 + 200);
              await page.mouse.down();
              await page.waitForTimeout(Math.random() * 100 + 50);
              await page.mouse.up();
              messageButtonFound = true;
              break;
            }
          }
          
          // 위 방법이 실패하면 직접 클릭
          if (!messageButtonFound) {
            await page.click(selector);
            messageButtonFound = true;
            break;
          }
        }
      }
      
      if (!messageButtonFound) {
        console.log(`[${store.name}] 메시지 버튼을 찾지 못함, 계속 진행`);
      }
    } catch (error) {
      console.error(`[${store.name}] 메시지 버튼 클릭 오류 (계속 진행):`, error);
    }
    
    return true;
  } catch (error) {
    console.error(`[${store.name}] 인증 페이지 처리 중 오류:`, error);
    return false;
  }
}

// 쿠키 및 광고 처리 함수
async function handleCookiesAndAds(page, store) {
  try {
    console.log(`[${store.name}] 쿠키/광고 처리 시도...`);
    
    // 디버깅용 스크린샷
    await page.screenshot({ path: `cookie-before-${store.name}.png` }).catch(e => {
      console.log(`[${store.name}] 스크린샷 실패:`, e.message);
    });
    
    // 1. 직접 JavaScript로 쿠키 함수 호출 시도 (가장 우선)
    try {
      console.log(`[${store.name}] 쿠키 함수 호출 시도...`);
      
      const cookieResult = await page.evaluate(() => {
        try {
          // check_cookie 함수 시도
          if (typeof check_cookie === 'function') {
            console.log('check_cookie 함수 호출');
            check_cookie(true, 'all');
            return { success: true, message: 'check_cookie 함수 호출 성공' };
          }
          
          // acceptCookies 함수 시도
          if (typeof acceptCookies === 'function') {
            console.log('acceptCookies 함수 호출');
            acceptCookies();
            return { success: true, message: 'acceptCookies 함수 호출 성공' };
          }
          
          // acceptAllCookies 함수 시도
          if (typeof acceptAllCookies === 'function') {
            console.log('acceptAllCookies 함수 호출');
            acceptAllCookies();
            return { success: true, message: 'acceptAllCookies 함수 호출 성공' };
          }
          
          // agreeToAll 함수 시도
          if (typeof agreeToAll === 'function') {
            console.log('agreeToAll 함수 호출');
            agreeToAll();
            return { success: true, message: 'agreeToAll 함수 호출 성공' };
          }
          
          // acceptAll 함수 시도
          if (typeof acceptAll === 'function') {
            console.log('acceptAll 함수 호출');
            acceptAll();
            return { success: true, message: 'acceptAll 함수 호출 성공' };
          }
          
          return { success: false, message: '쿠키 함수 발견 실패' };
        } catch (e) {
          return { success: false, message: e.message };
        }
      }).catch(e => ({ success: false, message: e.message }));
      
      console.log(`[${store.name}] 쿠키 함수 호출 결과:`, cookieResult);
      
      if (cookieResult.success) {
        console.log(`[${store.name}] 쿠키 함수 호출 성공, 다음 단계로 진행`);
        await page.waitForTimeout(2000);
        return true; // 성공적으로 처리됨
      }
    } catch (funcError) {
      console.log(`[${store.name}] 쿠키 함수 호출 중 오류:`, funcError.message);
    }
    
    // 2. 보이는 쿠키 버튼 클릭 시도
    try {
      console.log(`[${store.name}] 보이는 쿠키 버튼 클릭 시도...`);
      
      // 먼저 JavaScript로 클릭 시도
      const jsClickResult = await page.evaluate(() => {
        try {
          // 동의 관련 텍스트가 포함된 버튼 찾기
          const agreeButtons = Array.from(document.querySelectorAll('button, .button, [role="button"]'))
            .filter(btn => {
              const text = (btn.textContent || '').toLowerCase();
              const rect = btn.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0 && 
                              window.getComputedStyle(btn).visibility !== 'hidden' && 
                              window.getComputedStyle(btn).display !== 'none';
              
              return isVisible && (text.includes('동의') || text.includes('accept') || 
                                text.includes('agree') || text.includes('cookie'));
            });
          
          if (agreeButtons.length > 0) {
            console.log('동의 버튼 발견, 클릭 시도');
            agreeButtons[0].click();
            return { success: true, message: '동의 버튼 클릭 성공' };
          }
          
          return { success: false, message: '동의 버튼 발견 실패' };
        } catch (e) {
          return { success: false, message: e.message };
        }
      }).catch(e => ({ success: false, message: e.message }));
      
      console.log(`[${store.name}] JavaScript 클릭 결과:`, jsClickResult);
      
      if (jsClickResult.success) {
        console.log(`[${store.name}] JavaScript 클릭 성공, 다음 단계로 진행`);
        await page.waitForTimeout(2000);
        return true; // 성공적으로 처리됨
      }
    } catch (jsError) {
      console.log(`[${store.name}] JavaScript 클릭 시도 중 오류:`, jsError.message);
    }
    
    // 3. Playwright API로 클릭 시도 (타임아웃 짧게 설정)
    try {
      console.log(`[${store.name}] Playwright 셀렉터로 쿠키 버튼 클릭 시도...`);
      
      // 중요: 타임아웃을 짧게 설정하여 안 보이는 요소에 대한 시도를 줄임
      for (const selector of [
        'button:has-text("동의합니다")',
        'button:has-text("동의")',
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button.cookie-accept',
        '.cookie-consent-accept',
        '#cookie-accept',
        'button[class*="cookie"]',
        '[aria-label*="cookie"]',
        '[id*="cookie"]',
        'button.cookie-notice__agree-button',
        '.consent-banner__cta',
        '.cookie-accept-button',
        '#onetrust-accept-btn-handler',
        'button.cookie-consent__accept',
        'button.cookie-banner__accept',
        '.cookie-banner .btn-primary',
        '.cookie-notice .accept',
        '.cookie-banner .accept-button',
        '#btn-cookie-accept',
        '.cookie-consent button',
        '.cookie-popup button',
        '.cookie-policy-banner button',
        '.cookie-consent-banner .accept-button',
        'button.accept-cookies',
        'a.accept-cookies',
        '.cookie-modal .btn-primary',
        '.gdpr-banner .accept',
        '.cookie-dialog .accept',
        '[aria-label="쿠키 동의"]',
        '[data-action="accept-cookies"]',
        '.cookie-banner-actions .primary',
        '.cookie-consent-actions .accept',
        'img[alt*="쿠키"]',
        'img[alt*="동의"]',
        'img[alt*="accept"]',
        'img[alt*="cookie"]'
      ]) {
        console.log(`[${store.name}] 셀렉터 시도: ${selector}`);
        
        try {
          // 요소가 존재하는지 확인 (짧은 타임아웃)
          const element = await page.$(selector);
          if (element) {
            // 요소가 보이는지 확인
            const isVisible = await element.isVisible().catch(() => false);
            console.log(`[${store.name}] 셀렉터 ${selector} 발견, 보이는 상태: ${isVisible}`);
            
            if (isVisible) {
              // 보이는 요소만 클릭 시도 (짧은 타임아웃)
              await element.click({ timeout: 5000 }).catch(e => {
                console.log(`[${store.name}] 클릭 실패: ${e.message}`);
              });
              console.log(`[${store.name}] 쿠키 버튼 클릭 성공`);
              await page.waitForTimeout(2000);
              return true; // 성공적으로 처리됨
            } else {
              // 요소가 존재하지만 보이지 않는 경우 JavaScript로 강제 클릭 시도
              console.log(`[${store.name}] 요소가 보이지 않음, JavaScript로 강제 클릭 시도`);
              
              const forceResult = await page.evaluate((sel) => {
                try {
                  const element = document.querySelector(sel);
                  if (element) {
                    console.log('강제 클릭 시도');
                    element.click();
                    return { success: true, message: '강제 클릭 성공' };
                  }
                  return { success: false, message: '요소를 찾을 수 없음' };
                } catch (e) {
                  return { success: false, message: e.message };
                }
              }, selector).catch(e => ({ success: false, message: e.message }));
              
              if (forceResult.success) {
                console.log(`[${store.name}] 강제 클릭 성공`);
                await page.waitForTimeout(2000);
                return true; // 성공적으로 처리됨
              }
            }
          }
        } catch (selectorError) {
          console.log(`[${store.name}] 셀렉터 ${selector} 처리 중 오류:`, selectorError.message);
          // 다음 셀렉터 시도
          continue;
        }
      }
    } catch (selectorError) {
      console.log(`[${store.name}] 셀렉터 처리 중 오류:`, selectorError.message);
    }
    
    // 4. 보이지 않는 쿠키 버튼에 대한 추가 처리
    try {
      console.log(`[${store.name}] 보이지 않는 쿠키 버튼 강제 클릭 시도...`);
      
      const forceClickResult = await page.evaluate(() => {
        try {
          // 모든 쿠키 관련 버튼 (보이지 않는 것 포함)
          const allCookieButtons = document.querySelectorAll('button[onclick*="cookie"], button[class*="cookie"], button[id*="cookie"], button[data-action*="cookie"]');
          
          for (const btn of allCookieButtons) {
            try {
              // onclick 속성이 있으면 직접 실행
              const onclickAttr = btn.getAttribute('onclick');
              if (onclickAttr) {
                console.log(`onclick 속성 실행: ${onclickAttr}`);
                // 안전하게 eval 대신 Function 생성자 사용
                new Function(onclickAttr)();
                return { success: true, message: 'onclick 속성 실행 성공' };
              }
              
              // 강제 클릭
              console.log('강제 클릭 시도');
              btn.click();
              return { success: true, message: '강제 클릭 성공' };
            } catch (e) {
              console.log(`버튼 처리 실패: ${e.message}`);
            }
          }
          
          return { success: false, message: '모든 버튼 처리 실패' };
        } catch (e) {
          return { success: false, message: e.message };
        }
      }).catch(e => ({ success: false, message: e.message }));
      
      console.log(`[${store.name}] 강제 클릭 결과:`, forceClickResult);
      
      if (forceClickResult.success) {
        console.log(`[${store.name}] 강제 클릭 성공, 다음 단계로 진행`);
        await page.waitForTimeout(2000);
        return true; // 성공적으로 처리됨
      }
    } catch (forceError) {
      console.log(`[${store.name}] 강제 클릭 시도 중 오류:`, forceError.message);
    }
    
    // 5. 마지막 시도: 페이지의 모든 버튼 찾기
    try {
      console.log(`[${store.name}] 마지막 시도: 모든 버튼 찾기...`);
      
      // 페이지의 모든 버튼 요소 찾기
      const allButtonsResult = await page.evaluate(() => {
        try {
          const buttons = document.querySelectorAll('button, .button, [role="button"], [type="button"]');
          console.log(`발견된 버튼 수: ${buttons.length}`);
          
          // 일반적인 동의 버튼 텍스트 패턴
          const agreePatterns = ['동의', 'agree', 'accept', 'confirm', 'ok', 'yes', 'continue'];
          
          for (const btn of buttons) {
            const text = (btn.textContent || '').toLowerCase().trim();
            const isAgreeButton = agreePatterns.some(pattern => text.includes(pattern));
            
            if (isAgreeButton) {
              console.log(`동의 버튼 발견: ${text}`);
              btn.click();
              return { success: true, message: `동의 버튼 클릭 성공: ${text}` };
            }
          }
          
          // 동의 버튼이 없으면 처음 버튼 클릭 시도
          if (buttons.length > 0) {
            console.log('첫 번째 버튼 클릭 시도');
            buttons[0].click();
            return { success: true, message: '첫 번째 버튼 클릭 성공' };
          }
          
          return { success: false, message: '적합한 버튼 발견 실패' };
        } catch (e) {
          return { success: false, message: e.message };
        }
      }).catch(e => ({ success: false, message: e.message }));
      
      console.log(`[${store.name}] 모든 버튼 찾기 결과:`, allButtonsResult);
      
      if (allButtonsResult.success) {
        console.log(`[${store.name}] 버튼 클릭 성공, 다음 단계로 진행`);
        await page.waitForTimeout(2000);
        return true;
      }
    } catch (finalError) {
      console.log(`[${store.name}] 마지막 시도 중 오류:`, finalError.message);
    }
    
    // 6. 모든 시도 실패
    console.log(`[${store.name}] 쿠키 처리 필요 없음 또는 모든 시도 실패, 다음 단계로 진행`);
    
    // 스크린샷 찍기 (디버깅용)
    await page.screenshot({ path: `cookie-after-${store.name}.png` }).catch(e => {
      console.log(`[${store.name}] 스크린샷 실패:`, e.message);
    });
    
    return false; // 처리 실패 또는 필요 없음
  } catch (e) {
    console.log(`[${store.name}] 쿠키 처리 중 오류 발생:`, e.message);
    return false;
  }
}

// 매장별 예약 실행 함수
async function executeReservationForStore(page, store) {
  // 매장별 커스텀 셀렉터 설정
  const storeConfigs = {
    '크로노다임': {
      selectors: {
        reserveButton: '.reserve-now, #fappointment .text-body-24, a:has-text("예약")',
        dateSelector: '.calendar-day[data-date], .day-available, [data-day]:not(.disabled)',
        timeSelector: '.time-slot:not(.disabled), .time-option:not(.unavailable)',
        agreeButton: '.agree-checkbox, #agree-terms, input[type="checkbox"][name*="agree"], .consent-checkbox, label:has-text("동의합니다"), button:has-text("동의합니다")'
      }
    },
    '우노판교': {
      selectors: {
        reserveButton: '#btn-reserve, .reserve-button, a:has-text("예약하기")',
        dateSelector: '.calendar td[data-available="true"], .day.available',
        timeSelector: '.time-selection .available, .timeslot:not(.disabled)',
        agreeButton: '.agree-checkbox, #agree-terms, input[type="checkbox"][name*="agree"], .consent-checkbox, label:has-text("동의합니다"), button:has-text("동의합니다"), .checkbox-label'
      }
    },
    '현대': {
      selectors: {
        reserveButton: '.reservation-btn, a:has-text("예약"), .booking-button',
        dateSelector: '.calendar-cell.available, .date-cell:not(.disabled)',
        timeSelector: '.time-block:not(.disabled), .time-option:not(.unavailable)',
        agreeButton: '.agree-checkbox, #agree-terms, input[type="checkbox"][name*="agree"], .consent-checkbox, label:has-text("동의합니다"), button:has-text("동의합니다")'
      }
    },
    '홍보': {
      selectors: {
        reserveButton: '#reservationBtn, .btn-reservation, a:has-text("예약")',
        dateSelector: '.date-picker .active, .calendar .available-day',
        timeSelector: '.time-selector .time-option, .timeslot:not(.disabled)',
        agreeButton: '.agree-checkbox, #agree-terms, input[type="checkbox"][name*="agree"], .consent-checkbox, label:has-text("동의합니다"), button:has-text("동의합니다")'
      }
    }
  };

  const config = storeConfigs[store.name] || {
    selectors: {
      reserveButton: 'a:has-text("예약"), button:has-text("예약")',
      dateSelector: '.calendar .available, [data-available="true"]',
      timeSelector: '.time:not(.disabled), .timeslot:not(.unavailable)',
      agreeButton: '.agree-checkbox, #agree-terms, input[type="checkbox"][name*="agree"], .consent-checkbox, label:has-text("동의합니다"), button:has-text("동의합니다")'
    }
  };

  try {
    // 0. 페이지 스크린샷 저장 (디버깅용)
    try {
      await page.screenshot({ path: `${store.name}_before_reservation.png` });
      console.log(`[${store.name}] 예약 전 스크린샷 저장 완료`);
    } catch (screenshotErr) {
      console.log(`[${store.name}] 스크린샷 저장 실패: ${screenshotErr.message}`);
    }
    
    // 1. 페이지 가져오기 전에 초기화
    await page.bringToFront();
    
    // 2. 예약 버튼 찾기 및 클릭
    console.log(`[${store.name}] 예약 버튼 찾는 중...`);
    
    let reserveButtonFound = false;
    
    for (const selector of [config.selectors.reserveButton, 'a:has-text("예약")', 'button:has-text("예약하기")', '[data-action="reserve"]', store.selector]) {
      if (!selector) continue;
      
      try {
        const reserveButton = await page.waitForSelector(selector, { timeout: 5000 }).catch(() => null);
        if (reserveButton) {
          console.log(`[${store.name}] 예약 버튼 발견: ${selector}`);
          
          // 버튼이 화면에 보이게 스크롤
          await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, selector);
          
          await page.waitForTimeout(300);
          
          // 자연스러운 움직임으로 클릭
          const box = await reserveButton.boundingBox();
          if (box) {
            await page.mouse.move(
              box.x + box.width / 2 + (Math.random() * 10 - 5),
              box.y + box.height / 2 + (Math.random() * 10 - 5),
              { steps: 15 }
            );
            await page.waitForTimeout(Math.random() * 300 + 200);
            await page.mouse.down();
            await page.waitForTimeout(Math.random() * 100 + 50);
            await page.mouse.up();
            
            // 날짜 선택 화면이 나타날 때까지 대기
            await page.waitForTimeout(1000);
            reserveButtonFound = true;
            break;
          } else {
            await reserveButton.click();
            await page.waitForTimeout(1000);
            reserveButtonFound = true;
            break;
          }
        }
      } catch (e) {
        // 계속 다음 셀렉터 시도
        console.log(`[${store.name}] 셀렉터 '${selector}' 시도 실패: ${e.message}`);
      }
    }
    
    if (!reserveButtonFound) {
      console.log(`[${store.name}] 예약 버튼을 찾을 수 없음, 매장 셀렉터 사용 시도`);
      // 매장 특정 셀렉터가 있으면 마지막 시도
      if (store.selector) {
        try {
          await page.click(store.selector);
          reserveButtonFound = true;
          console.log(`[${store.name}] 매장 특정 셀렉터로 클릭 성공`);
        } catch (e) {
          console.error(`[${store.name}] 매장 셀렉터 클릭 실패: ${e.message}`);
        }
      }
    }
    
    // 예약 버튼을 찾지 못했을 경우 스크린샷 저장
    if (!reserveButtonFound) {
      try {
        await page.screenshot({ path: `${store.name}_button_not_found.png` });
        console.log(`[${store.name}] 예약 버튼 못찾음 스크린샷 저장`);
      } catch (screenshotErr) {
        console.log(`[${store.name}] 스크린샷 저장 실패: ${screenshotErr.message}`);
      }
    }
    
    // 3. 날짜 선택 (가장 빠른 가능한 날짜)
    console.log(`[${store.name}] 날짜 선택 시도...`);
    let dateSelected = false;
    
    for (const selector of [config.selectors.dateSelector, '.calendar .available', '[data-available="true"]', '.day:not(.disabled)']) {
      try {
        const availableDates = await page.$$(selector);
        if (availableDates.length > 0) {
          console.log(`[${store.name}] 날짜 옵션 발견: ${availableDates.length}개`);
          // 첫 번째 가능한 날짜 클릭
          await availableDates[0].click();
          await page.waitForTimeout(1000);
          dateSelected = true;
          break;
        }
      } catch (e) {
        // 계속 다음 셀렉터 시도
      }
    }
    
    // 4. 시간 선택 (가장 빠른 가능한 시간)
    if (dateSelected) {
      console.log(`[${store.name}] 시간 선택 시도...`);
      let timeSelected = false;
      
      for (const selector of [config.selectors.timeSelector, '.time:not(.disabled)', '.timeslot:not(.unavailable)']) {
        try {
          const availableTimes = await page.$$(selector);
          if (availableTimes.length > 0) {
            console.log(`[${store.name}] 시간 옵션 발견: ${availableTimes.length}개`);
            // 첫 번째 가능한 시간 클릭
            await availableTimes[0].click();
            await page.waitForTimeout(1000);
            timeSelected = true;
            break;
          }
        } catch (e) {
          // 계속 다음 셀렉터 시도
        }
      }
      
      // 4.5 동의 버튼 처리 (있는 경우)
      if (timeSelected) {
        console.log(`[${store.name}] 동의 버튼 처리 시도...`);
        
        // 동의 버튼 처리
        const agreeSelectors = [
          config.selectors.agreeButton, 
          '.agree-checkbox', 
          '#agree-terms', 
          'input[type="checkbox"][name*="agree"]',
          '.consent-checkbox',
          'label:has-text("동의합니다")',
          'button:has-text("동의합니다")',
          '.checkbox-label',
          '.agreement-checkbox',
          '.terms-checkbox',
          // 추가 셀렉터
          'input[type="checkbox"]',
          '.checkbox',
          '.check-item',
          '.terms-agree',
          '.agree-box',
          '.consent-box',
          '.agreement-item',
          'label.checkbox',
          '.form-check',
          '.form-check-input',
          '.form-checkbox',
          '[type="checkbox"]',
          // 텍스트 기반 선택자
          'label:has-text("동의")',
          'span:has-text("동의")',
          'div:has-text("동의")',
          'p:has-text("동의")',
          // 영문 셀렉터
          'label:has-text("agree")',
          'label:has-text("Accept")',
          'label:has-text("I agree")',
          'button:has-text("agree")',
          'button:has-text("Accept")',
          'button:has-text("I agree")'
        ];
        
        let agreeButtonFound = false;
        
        for (const selector of agreeSelectors) {
          if (!selector) continue;
          
          try {
            // 체크박스 선택자 시도
            const checkboxes = await page.$$(selector);
            
            if (checkboxes.length > 0) {
              console.log(`[${store.name}] 동의 버튼/체크박스 발견: ${selector}, ${checkboxes.length}개`);
              
              // 모든 체크박스 클릭
              for (const checkbox of checkboxes) {
                try {
                  // 스크롤하여 체크박스 보이게 하기
                  await checkbox.scrollIntoViewIfNeeded();
                  await page.waitForTimeout(300);
                  
                  // 체크박스 상태 확인
                  const isChecked = await page.evaluate(el => {
                    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
                      return el.checked;
                    }
                    return false;
                  }, checkbox).catch(() => false);
                  
                  // 체크가 되어 있지 않은 경우에만 클릭
                  if (!isChecked) {
                    // 체크박스 클릭
                    await checkbox.click();
                    await page.waitForTimeout(500);
                    
                    console.log(`[${store.name}] 체크박스 클릭 성공`);
                  } else {
                    console.log(`[${store.name}] 체크박스가 이미 체크되어 있음`);
                  }
                  agreeButtonFound = true;
                } catch (clickErr) {
                  console.error(`[${store.name}] 체크박스 클릭 실패: ${clickErr.message}`);
                }
              }
              
              if (agreeButtonFound) break;
            }
          } catch (e) {
            // 다음 셀렉터 시도
            console.log(`[${store.name}] 셀렉터 '${selector}' 시도 실패: ${e.message}`);
          }
        }
        
        // 동의 버튼을 찾지 못했을 경우 스크린샷 저장
        if (!agreeButtonFound) {
          try {
            await page.screenshot({ path: `${store.name}_agree_button_not_found.png` });
            console.log(`[${store.name}] 동의 버튼 못찾음 스크린샷 저장`);
          } catch (screenshotErr) {
            console.log(`[${store.name}] 스크린샷 저장 실패: ${screenshotErr.message}`);
          }
        }
        
        // 5. 예약 확정 버튼 (있는 경우)
        console.log(`[${store.name}] 예약 확정 시도...`);
        for (const selector of ['.confirm-btn', '.btn-confirm', '[data-action="confirm"]', 'button:has-text("확인")', 'button:has-text("예약")', 'button[type="submit"]']) {
          try {
            const confirmButton = await page.waitForSelector(selector, { timeout: 2000 }).catch(() => null);
            if (confirmButton) {
              console.log(`[${store.name}] 확정 버튼 발견: ${selector}`);
              await confirmButton.click();
              await page.waitForTimeout(1000);
              break;
            }
          } catch (e) {
            // 계속 다음 셀렉터 시도
          }
        }
      }
    }
    
    // 최종 스크린샷 저장
    try {
      await page.screenshot({ path: `${store.name}_after_reservation.png` });
      console.log(`[${store.name}] 예약 후 스크린샷 저장 완료`);
    } catch (screenshotErr) {
      console.log(`[${store.name}] 스크린샷 저장 실패: ${screenshotErr.message}`);
    }
    
    console.log(`[${store.name}] 예약 프로세스 완료`);
    if (mainWindow) {
      mainWindow.webContents.send('automation-status', {
        storeId: store.name,
        status: 'reservation-completed',
        message: '예약 프로세스 완료!'
      });
    }
    
    return true;
  } catch (error) {
    console.error(`[${store.name}] 예약 실행 중 오류:`, error);
    
    // 오류 발생 시 스크린샷 저장
    try {
      await page.screenshot({ path: `${store.name}_error.png` });
      console.log(`[${store.name}] 오류 상태 스크린샷 저장 완료`);
    } catch (screenshotErr) {
      console.log(`[${store.name}] 스크린샷 저장 실패: ${screenshotErr.message}`);
    }
    
    if (mainWindow) {
      mainWindow.webContents.send('automation-status', {
        storeId: store.name,
        status: 'error',
        message: `예약 오류: ${error.message}`
      });
    }
    return false;
  }
}

// 앱 종료 시 플래그 설정
app.on('before-quit', () => {
  isAppQuitting = true;
});
