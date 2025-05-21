// 기본 Electron 모듈 가져오기
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain, Menu, contextBridge, ipcRenderer } = require('electron');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

// 메인 윈도우 객체를 전역 변수로 선언
let mainWindow;

// 윈도우 생성 함수
function createWindow() {
  // 브라우저 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    }
  });

  // 개발/프로덕션 분기
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../out/index.html'));
  }
  
  // 개발자 도구 열기
  //mainWindow.webContents.openDevTools();

  // 윈도우가 닫힐 때 이벤트 처리
  mainWindow.on('closed', () => {
    app.quit();
  });
}

// Electron이 초기화를 완료하고 준비되면 윈도우 생성
app.on('ready', () => {
  createWindow();
  Menu.setApplicationMenu(null);
  mainWindow.on('closed', () => {
    app.quit();
  });
});

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 앱 아이콘 클릭 시 윈도우 재생성
app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
  }
});
