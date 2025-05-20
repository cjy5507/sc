"use client"

import { useEffect, useState } from 'react';

export interface ITimeSyncStatus {
  offsetMs: number; // networkTime - localTime in milliseconds
  lastSynced: Date | null;
  synced: boolean; // true if |offsetMs| < thresholdMs
  error?: string;
}

/**
 * React hook to access time synchronization status.
 * Subscribes to main process time sync events and provides
 * the current sync state to React components.
 */
export function useTimeSync() {
  const [status, setStatus] = useState<ITimeSyncStatus>({
    offsetMs: 0,
    lastSynced: null,
    synced: true,
  });
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get window.electronAPI from the preload script
    const api = (window as any).electronAPI;
    if (!api) {
      console.error('Electron API not available');
      return;
    }

    // Subscribe to time sync updates
    const removeUpdateListener = api.onTimeSyncUpdate((newStatus: ITimeSyncStatus) => {
      // Parse Date strings if needed (IPC serialization converts Date to string)
      if (typeof newStatus.lastSynced === 'string') {
        newStatus.lastSynced = new Date(newStatus.lastSynced);
      }
      setStatus(newStatus);
      // Clear any previous errors when we get a successful update
      setError(null);
    });

    // Subscribe to time sync errors
    const removeErrorListener = api.onTimeSyncError((err: string) => {
      setError(err);
    });

    // Clean up subscriptions on unmount
    return () => {
      removeUpdateListener();
      removeErrorListener();
    };
  }, []);

  // Helper functions based on current sync status
  const formattedOffset = () => {
    if (status.offsetMs === 0) return '0ms';
    
    // Format based on magnitude
    const absOffset = Math.abs(status.offsetMs);
    if (absOffset >= 1000) {
      return `${(status.offsetMs / 1000).toFixed(1)}s`;
    }
    return `${status.offsetMs}ms`;
  };

  const getOffset = () => status.offsetMs;
  
  const isSynced = () => status.synced;
  
  const getLastSyncedTime = () => status.lastSynced;
  
  const getFormattedLastSyncedTime = () => {
    if (!status.lastSynced) return 'Never';
    return status.lastSynced.toLocaleTimeString();
  };

  // Return status, error state, and helper functions
  return {
    status,
    error,
    formattedOffset,
    getOffset,
    isSynced,
    getLastSyncedTime,
    getFormattedLastSyncedTime,
  };
} 