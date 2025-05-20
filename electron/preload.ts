import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      startAutomation: (params: { stores: string[] }) => Promise<{ success: boolean; error?: string }>;
      stopAutomation: (params: { stores: string[] }) => Promise<{ success: boolean; error?: string }>;
      onAutomationStatus: (callback: (status: { storeId: string; status: string; message?: string }) => void) => void;
      onTimeSyncUpdate: (callback: (status: any) => void) => void;
      onTimeSyncError: (callback: (err: any) => void) => void;
    };
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  startAutomation: (params: { stores: string[] }) => ipcRenderer.invoke('start-automation', params),
  stopAutomation: (params: { stores: string[] }) => ipcRenderer.invoke('stop-automation', params),
  onAutomationStatus: (callback: (status: { storeId: string; status: string; message?: string }) => void) => {
    ipcRenderer.on('automation-status', (_event, status) => {
      callback(status);
    });
  },
  onTimeSyncUpdate: (callback: (status: any) => void) => {
    const listener = (_event: any, status: any) => callback(status);
    ipcRenderer.on('time-sync-update', listener);
    return () => ipcRenderer.removeListener('time-sync-update', listener);
  },
  onTimeSyncError: (callback: (err: any) => void) => {
    const listener = (_event: any, err: any) => callback(err);
    ipcRenderer.on('time-sync-error', listener);
    return () => ipcRenderer.removeListener('time-sync-error', listener);
  }
});
