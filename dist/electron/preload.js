// Electron preload 스크립트
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Automation
  startAutomation: (storeConfig) => ipcRenderer.invoke('start-automation', storeConfig),
  
  // Reservation
  startReservation: (config) => ipcRenderer.invoke('start-reservation', config),
  stopReservation: () => ipcRenderer.invoke('stop-reservation'),
  getReservationStatus: () => ipcRenderer.invoke('get-reservation-status'),
  onReservationUpdate: (callback) => {
    const listener = (event, status) => callback(status);
    ipcRenderer.on('reservation-update', listener);
    return () => ipcRenderer.removeListener('reservation-update', listener);
  },
  
  // Settings
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // Auth
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  getAuthStatus: () => ipcRenderer.invoke('get-auth-status'),
  
  // Event handling
  on: (channel, callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  removeListener: (channel, listener) => {
    ipcRenderer.removeListener(channel, listener);
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Time Sync
  onTimeSyncUpdate: (callback) => {
    const listener = (event, status) => callback(status);
    ipcRenderer.on('time-sync-update', listener);
    return () => ipcRenderer.removeListener('time-sync-update', listener);
  },
  onTimeSyncError: (callback) => {
    const listener = (event, err) => callback(err);
    ipcRenderer.on('time-sync-error', listener);
    return () => ipcRenderer.removeListener('time-sync-error', listener);
  }
});

// 개발 모드에서만 노출되는 개발자 도구
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('__devtron', {
    require: require,
    process: process
  });
}
