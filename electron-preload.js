// Electron preload 스크립트
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
// 절대 경로를 사용하여 timeSync 모듈 로드
const timeSyncPath = path.join(__dirname, 'utils/timeSync.cjs');
const { timeSync } = require(timeSyncPath);

// 렌더러 프로세스에 안전하게 노출할 API 정의
contextBridge.exposeInMainWorld('electronAPI', {
  console: {
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
  },
  // 자동화 시작 함수 - invoke 사용으로 변경
  startAutomation: (params) => {
    console.log('preload: startAutomation called with params:', params);
    return ipcRenderer.invoke('start-automation', params);
  },
  // 자동화 중지 함수
  stopAutomation: (params) => {
    console.log('preload: stopAutomation called with params:', params);
    return ipcRenderer.invoke('stop-automation', params);
  },
  // 스토어 목록 가져오기
  getStores: () => {
    return ipcRenderer.invoke('get-stores');
  },
  // 시간 동기화
  syncTime: () => {
    return ipcRenderer.invoke('sync-time');
  },
  closeWindow: () => ipcRenderer.send('close-window'),
  getTimeStatus: () => timeSync.getStatus(),
  onTimeSyncUpdate: (callback) => {
    ipcRenderer.on('time-sync-update', (_, status) => callback(status));
  },
  // 자동화 상태 이벤트 처리
  onAutomationStatus: (callback) => {
    ipcRenderer.on('automation-status', (_, status) => {
      console.log('preload: automation-status received:', status);
      callback(status);
    });
  },
  // 추가: 자동화 실행 시점에만 시간 동기화 시작
  startTimeSync: () => timeSync.start(),
});
