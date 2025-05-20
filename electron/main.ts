import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import * as path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

// Use process.cwd() as a reliable way to get the current working directory
const __dirname = process.cwd();

// 타입 선언
interface StoreConfig {
  id: string;
  url: string;
}

let mainWindow: Electron.BrowserWindow | null = null;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Since we just created mainWindow, it's safe to use non-null assertion here
  const win = mainWindow!;
  
  // and load the index.html of the app.
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../out/index.html'));
  }
  
  // Emitted when the window is closed.
  win.on('closed', () => {
    mainWindow = null;
  });
  
  return win;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC 핸들러 설정
ipcMain.on('start-automation', function (event: IpcMainEvent, storeConfig: StoreConfig) {
  console.log('Start automation for store:', storeConfig);
  
  // 비동기 작업을 위한 Promise 반환
  (async () => {
    let browser = null;
    try {
      browser = await chromium.launch({ headless: false });
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // 스토어 URL로 이동
      await page.goto(storeConfig.url, { waitUntil: 'networkidle' });
      
      // 스토어 ID에 따른 자동화 로직
      if (storeConfig.id === 'chronodigm') {
        await page.click('.fappointment .purpose-card');
      } else if (storeConfig.id === 'unopangyo') {
        await page.click('.booking-wrapper .booking-option');
      }
      
      event.sender.send('automation-reply', { success: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Automation error:', errorMessage);
      event.sender.send('automation-reply', { 
        success: false, 
        error: errorMessage
      });
    } finally {
      if (browser) {
        await browser.close().catch(console.error);
      }
    }
  })();
});
