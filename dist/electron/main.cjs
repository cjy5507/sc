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
  timeSync.start();
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
const STORE_CONFIGS = {
  chronodigm: {
    url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
    selector: '.fappointment .purpose-card'
  },
  unopangyo: {
    url: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
    selector: '.booking-wrapper .booking-option'
  },
  hyundai: {
    url: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/appointment/',
    selector: '.appointment-section .appointment-choice'
  },
  hongbo: {
    url: 'https://www.hongbowatch.co.kr/rolex/contact-busan/appointment/',
    selector: '.booking-container .booking-card'
  }
};

async function runAutomation(storeId) {
  const config = STORE_CONFIGS[storeId];
  if (!config) return;
  let browser = null;
  let context = null;
  let page = null;
  try {
    mainWindow.webContents.send('automation-status', { storeId, status: 'running', message: '예약 시도중' });
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
    page = await context.newPage();
    // 인스턴스와 stopped 플래그 저장
    automationProcesses[storeId] = { browser, context, page, stopped: false };
    await page.goto(config.url, { waitUntil: 'networkidle' });
    if (automationProcesses[storeId]?.stopped) throw new Error('stopped');
    try {
      await page.click('text=모두 수락', { timeout: 3000 });
    } catch (e) {}
    if (automationProcesses[storeId]?.stopped) throw new Error('stopped');
    mainWindow.webContents.send('automation-status', { storeId, status: 'waiting', message: 'PASS 인증 대기중' });
    await page.click(config.selector);
    if (automationProcesses[storeId]?.stopped) throw new Error('stopped');
    mainWindow.webContents.send('automation-status', { storeId, status: 'success', message: '예약 성공!' });
  } catch (error) {
    if (error.message === 'stopped') {
      mainWindow.webContents.send('automation-status', { storeId, status: 'stopped', message: '자동화 중지됨' });
    } else {
      mainWindow.webContents.send('automation-status', { storeId, status: 'error', message: error.message });
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    delete automationProcesses[storeId];
  }
}
