const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
// electron-is-dev 대신 직접 isDev 로직 구현
const isDev = process.env.NODE_ENV === 'development' ||
              process.env.NODE_ENV === undefined ||
              /electron/.test(process.execPath);

// timeSync 모듈 로드 - 여러 가능한 경로 시도
let timeSync;
try {
  // 가능한 경로 목록
  const possiblePaths = [
    './utils/timeSync.cjs',
    './timeSync.cjs',
    '../electron/utils/timeSync.cjs',
    '../electron/timeSync.cjs',
    './utils/timeSync',
    './timeSync'
  ];
  
  // 각 경로 시도
  let loaded = false;
  for (const modulePath of possiblePaths) {
    try {
      console.log(`timeSync 모듈 로드 시도: ${modulePath}`);
      const module = require(modulePath);
      timeSync = module.timeSync;
      console.log(`timeSync 모듈 로드 성공: ${modulePath}`);
      loaded = true;
      break;
    } catch (err) {
      // 이 경로 실패, 다음 경로 시도
      console.log(`${modulePath} 경로 로드 실패`);
    }
  }
  
  if (!loaded) {
    throw new Error('모든 가능한 경로에서 timeSync 모듈을 찾을 수 없음');
  }
} catch (err) {
  console.error('timeSync 모듈 로드 실패:', err);
  // 임시 대체 객체 생성
  timeSync = {
    syncTime: async () => {
      console.log('더미 timeSync.syncTime 실행됨');
      return Promise.resolve();
    }
  };
}

const { AppointmentService } = require('./services/appointmentService');
const { STORES } = require('./stores');
import { AutomationProcess, AutomationStatus, AutomationResult } from './types';

require('dotenv').config();

let mainWindow = null;
let reservationScheduler = null;
const automationProcesses = {};

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

  // Load the app - 개발 서버 URL 및 프로덕션 HTML 파일 경로 결정
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.resolve(__dirname, '../../out/index.html')}`;

  console.log('애플리케이션 로드 URL:', startUrl);
  console.log('현재 환경:', isDev ? 'development' : 'production');

  // 개발 서버 연결 시도 후 실패 시 로컬 HTML 파일로 대체
  mainWindow.loadURL(startUrl).catch((err) => {
    console.log('개발 서버 연결 실패, 로컬 파일 로드 시도', err);
    const fallbackPath = isDev
      ? path.resolve(__dirname, '../index.html')
      : path.resolve(__dirname, '../../out/index.html');
    
    console.log('대체 HTML 경로:', fallbackPath);
    
    // 로컬 HTML 파일 로드
    mainWindow?.loadFile(fallbackPath).catch((err) => {
      console.error('로컬 파일 로드 실패:', err);
    });
  });

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
  const appointmentService = new AppointmentService({
    mainWindow,
    automationProcesses
  });
  
  // Automation
  ipcMain.handle('start-automation', async (event, params) => {
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
        try { await prev.browser.close(); } catch {}
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
        } catch (error) {
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
            } catch {}
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

  ipcMain.handle('stop-automation', async (event, { stores }) => {
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
          try { await proc.browser.close(); } catch {}
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

  ipcMain.on('time-sync-error', (event, err) => {
    if (mainWindow) {
      mainWindow.webContents.send('time-sync-error', err);
    }
  });

  // 메인 윈도우 닫기 이벤트 핸들러 추가
  ipcMain.on('close-main-window', () => {
    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }
  });
}

// App event handlers
app.whenReady().then(async () => {
  // 앱 시작 메시지 추가
  console.log('===================================');
  console.log('Rolex Reservation Client 시작됨');
  console.log('개발 모드:', isDev ? '활성화' : '비활성화');
  console.log('===================================');

  // Set app name
  if (process.platform === 'darwin') {
    app.setName('Rolex Reservation Client');
  }

  // Set app user model ID for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.rolex.reservation.client');
  }

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

  // Wait for app to initialize
  try {
    // 시간 동기화 실행 (타임아웃 설정)
    console.log('시간 동기화 시작...');
    const syncPromise = timeSync.syncTime().catch(err => {
      console.error('Time sync error (무시):', err);
      return Promise.resolve(); // 에러가 발생해도 계속 진행
    });
    
    // 최대 6초 대기 (타임아웃 설정)
    await Promise.race([
      syncPromise, 
      new Promise<void>(resolve => setTimeout(() => {
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
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
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

module.exports = { app };
