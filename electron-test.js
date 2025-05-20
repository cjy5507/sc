// 간단한 Electron 테스트 파일
const { app, BrowserWindow } = require('electron');

// 메인 윈도우 객체 선언
let mainWindow;

function createWindow() {
  // 브라우저 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // 간단한 HTML 로드
  mainWindow.loadURL(`data:text/html,
    <html>
      <head>
        <title>Electron 테스트</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Electron 테스트 성공!</h1>
        <p>Electron이 정상적으로 실행되었습니다.</p>
      </body>
    </html>
  `);

  // 개발자 도구 열기
  mainWindow.webContents.openDevTools();

  // 윈도우가 닫힐 때 이벤트 처리
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron이 초기화를 완료하면 윈도우 생성
app.whenReady().then(createWindow);

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 앱 아이콘 클릭 시 윈도우 재생성
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
