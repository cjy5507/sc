// electron-main.cjs - CommonJS 형식 백업 파일
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// electron-is-dev 대신 직접 isDev 로직 구현
const isDev = process.env.NODE_ENV === 'development' ||
              process.env.NODE_ENV === undefined ||
              /electron/.test(process.execPath);

// 변수 선언
let mainWindow = null;
let reservationScheduler = {};
const automationProcesses = {}; // 스토어별 자동화 프로세스 관리 객체

// STORES 모듈 로드
let STORES = [];
try {
  const storesModule = require('./stores');
  STORES = storesModule.STORES;
  console.log('스토어 모듈 로드 성공, 스토어 수:', STORES.length);
} catch (error) {
  console.error('스토어 모듈 로드 실패:', error);
  STORES = [];
}

// timeSync 변수 선언 추가
let timeSync;

// timeSync 모듈 로드 수정
try {
  // 상대 경로로 변경
  const timeSyncModule = require('./utils/timeSync.cjs');
  timeSync = timeSyncModule.timeSync;
  console.log('timeSync 모듈이 성공적으로 로드되었습니다.');
} catch (error) {
  console.error('timeSync 모듈 로드 실패:', error);
  // 에러가 발생해도 계속 진행할 수 있도록 기본 구현 제공
  timeSync = {
    syncTime: async () => {
      console.warn('기본 timeSync.syncTime 구현이 사용됨');
      return Promise.resolve({ success: true });
    },
    start: () => {
      console.warn('기본 timeSync.start 구현이 사용됨');
      return { on: () => {} };
    }
  };
}

// 자동화 프로세스 초기화 함수 추가
function initializeAutomationProcess() {
  return {
    browser: null,
    stopped: false,
    status: 'initializing',
    message: '초기화 중'
  };
}

// AppointmentService 로드
let appointmentService;
try {
  // AppointmentService 로드
  const appointmentServiceModule = require('./services/appointmentService');
  const AppointmentService = appointmentServiceModule.AppointmentService;
  
  // appointmentService 인스턴스 생성
  appointmentService = new AppointmentService({
    mainWindow,
    automationProcesses
  });
  
  console.log('AppointmentService 로드 성공');
} catch (error) {
  console.error('AppointmentService 로드 실패:', error);
  appointmentService = {
    handleStore: async (store) => {
      console.warn('기본 appointmentService.handleStore 구현 사용:', store?.id);
      return null;
    }
  };
}

// 메인 윈도우 생성
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
      webSecurity: !isDev // Disable in dev for CORS
    },
    show: false // Don't show until ready-to-show
  });

  // Load the app - 개발 서버 URL 및 프로덕션 HTML 파일 경로 결정
  const startUrl = isDev
    ? 'http://localhost:3000/automation'
    : `file://${path.join(__dirname, '../dist/index.html/automation')}`;

  console.log('애플리케이션 로드 URL:', startUrl);
  console.log('현재 환경:', isDev ? 'development' : 'production');

  // 개발 서버 연결 시도 후 실패 시 로컬 HTML 파일로 대체
  mainWindow.loadURL(startUrl).catch((err) => {
    console.log('개발 서버 연결 실패, 로컬 파일 로드 시도', err);
    const fallbackPath = isDev
      ? path.resolve(__dirname, './index.html')
      : path.resolve(__dirname, './out/index.html');
    
    console.log('대체 HTML 경로:', fallbackPath);
    
    // 로컬 HTML 파일 로드
    if (mainWindow) {
      mainWindow.loadFile(fallbackPath).catch((err) => {
        console.error('로컬 파일 로드 실패:', err);
      });
    }
  });

  // Show window when page is ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();

      // Open DevTools in development mode
      if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
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

// IPC 핸들러 설정
function setupIpcHandlers() {
  console.log('IPC 핸들러 설정 중...');

  // startAutomation 핸들러 (invoke)
  ipcMain.handle('start-automation', async (event, params) => {
    console.log('start-automation 핸들러 호출됨:', params);
    try {
      const result = await handleStartAutomation(params);
      console.log('자동화 시작 결과:', result);
      return result;
    } catch (error) {
      console.error('자동화 시작 오류:', error);
      return { 
        success: false, 
        error: error.message || '알 수 없는 오류' 
      };
    }
  });

  // Stop automation
  ipcMain.handle('stop-automation', async (event, params) => {
    console.log('stop-automation called', params);
    const { storeId } = params;
    
    const process = automationProcesses[storeId];
    if (process && process.browser) {
      try {
        console.log(`자동화 중지 중: ${storeId}`);
        // stopped 플래그 설정
        process.stopped = true;
        
        // 브라우저 종료
        await process.browser.close();
        console.log(`브라우저 종료 성공: ${storeId}`);
        
        // 프로세스 객체 정리
        delete automationProcesses[storeId];
        
        // 중지 상태 전송
        if (mainWindow) {
          const status = {
            storeId,
            status: 'stopped',
            message: '자동화가 중지되었습니다.'
          };
          mainWindow.webContents.send('automation-status', status);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`Stop automation error: ${storeId}`, error);
        return { success: false, error: error.message };
      }
    } else {
      console.log(`자동화 프로세스를 찾을 수 없음: ${storeId}`);
      return { success: false, error: '실행 중인 자동화를 찾을 수 없습니다.' };
    }
  });

  // 스토어 목록 요청 처리
  ipcMain.handle('get-stores', () => {
    console.log('get-stores called, stores:', STORES);
    return STORES;
  });
  
  // 시간 동기화 요청 처리
  ipcMain.handle('sync-time', async () => {
    console.log('sync-time called');
    try {
      await timeSync.syncTime();
      return { success: true };
    } catch (error) {
      console.error('시간 동기화 오류:', error);
      return { success: false, error: error.message };
    }
  });

  // 창 닫기 핸들러
  ipcMain.on('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });
}

// 자동화 시작 처리 함수 분리
async function handleStartAutomation(params) {
  console.log('handleStartAutomation 실행', params);
  const { stores } = params;
  if (!Array.isArray(stores)) {
    return { success: false, error: 'Invalid stores format' };
  }
  const results = [];

  await Promise.all(stores.map(async (storeId) => {
    console.log(`처리 중인 스토어 ID: ${storeId}`);
    
    // 기존 프로세스가 있으면 강제 종료 및 삭제
    const prev = automationProcesses[storeId];
    if (prev && prev.browser) {
      try { 
        console.log(`기존 브라우저 인스턴스 종료 중: ${storeId}`);
        await prev.browser.close(); 
      } catch (e) {
        console.error(`브라우저 종료 오류: ${storeId}`, e);
      }
      delete automationProcesses[storeId];
    }

    const store = STORES.find((s) => s.id === storeId);
    if (store) {
      console.log(`스토어 찾음: ${storeId}`, store);
      
      // 프로세스 객체를 명시적으로 초기화
      automationProcesses[storeId] = initializeAutomationProcess();

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
        // 브라우저 인스턴스 저장
        console.log(`AppointmentService.handleStore 호출 시작: ${storeId}`);
        const browser = await appointmentService.handleStore(store);
        console.log(`AppointmentService.handleStore 호출 완료: ${storeId}`, browser ? '브라우저 인스턴스 생성됨' : '브라우저 인스턴스 없음');
        
        if (automationProcesses[storeId]) {
          automationProcesses[storeId].browser = browser;
          automationProcesses[storeId].stopped = false;
        }
        
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
    } else {
      console.log(`스토어를 찾을 수 없음: ${storeId}`);
      if (mainWindow) {
        const status = {
          storeId,
          status: 'error',
          message: '스토어를 찾을 수 없습니다.'
        };
        mainWindow.webContents.send('automation-status', status);
      }
    }
  }));

  return { success: true, results };
}

// 애플리케이션 초기화
app.whenReady().then(() => {
  console.log('애플리케이션 초기화 시작');
  createWindow();
  setupIpcHandlers();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 창이 닫힐 때 앱 종료 (MacOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 종료 전 정리 작업
app.on('before-quit', async () => {
  console.log('애플리케이션 종료 전 정리 작업 시작');
  
  // 모든 자동화 프로세스 종료
  for (const storeId in automationProcesses) {
    const process = automationProcesses[storeId];
    if (process && process.browser) {
      try {
        console.log(`종료 전 브라우저 인스턴스 정리 중: ${storeId}`);
        await process.browser.close();
      } catch (error) {
        console.error(`브라우저 종료 오류: ${storeId}`, error);
      }
    }
  }
  
  // 스케줄러 종료
  if (reservationScheduler.stop) {
    try {
      console.log('예약 스케줄러 종료 중');
      await reservationScheduler.stop();
    } catch (error) {
      console.error('스케줄러 종료 오류:', error);
    }
  }
});
