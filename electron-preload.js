// Electron preload 스크립트
const { contextBridge, ipcRenderer } = require('electron');
const { timeSync } = require('./utils/timeSync.cjs');

// 렌더러 프로세스에 안전하게 노출할 API 정의
contextBridge.exposeInMainWorld('electronAPI', {
  // 자동화 시작 함수
  startAutomation: (storeConfig) => {
    return new Promise((resolve) => {
      // 응답 이벤트 핸들러
      const handler = (_, response) => {
        resolve(response);
        // 메모리 누수 방지를 위해 리스너 제거
        ipcRenderer.removeListener('automation-reply', handler);
      };
      
      // 이벤트 리스너 등록 및 메시지 전송
      ipcRenderer.once('automation-reply', handler);
      ipcRenderer.send('start-automation', storeConfig);
    });
  },
  closeWindow: () => ipcRenderer.send('close-window'),
  getTimeStatus: () => timeSync.getStatus(),
  onTimeSyncUpdate: (callback) => {
    ipcRenderer.on('time-sync-update', (_, status) => callback(status));
  },
  // 추가: 자동화 실행 시점에만 시간 동기화 시작
  startTimeSync: () => timeSync.start(),
});
