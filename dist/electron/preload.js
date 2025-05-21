"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    startAutomation: (params) => electron_1.ipcRenderer.invoke('start-automation', params),
    stopAutomation: (params) => electron_1.ipcRenderer.invoke('stop-automation', params),
    onAutomationStatus: (callback) => {
        electron_1.ipcRenderer.on('automation-status', (_event, status) => {
            callback(status);
        });
    },
    onTimeSyncUpdate: (callback) => {
        const listener = (_event, status) => callback(status);
        electron_1.ipcRenderer.on('time-sync-update', listener);
        return () => electron_1.ipcRenderer.removeListener('time-sync-update', listener);
    },
    onTimeSyncError: (callback) => {
        const listener = (_event, err) => callback(err);
        electron_1.ipcRenderer.on('time-sync-error', listener);
        return () => electron_1.ipcRenderer.removeListener('time-sync-error', listener);
    },
    closeMainWindow: () => electron_1.ipcRenderer.send('close-main-window')
});
