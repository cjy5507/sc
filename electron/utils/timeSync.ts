import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ITimeSyncStatus {
  status: 'success' | 'error';
  message: string;
}

class TimeSync extends EventEmitter {
  private static instance: TimeSync;
  private constructor() {
    super();
  }

  public static getInstance(): TimeSync {
    if (!TimeSync.instance) {
      TimeSync.instance = new TimeSync();
    }
    return TimeSync.instance;
  }

  async syncTime(): Promise<void> {
    try {
      if (process.platform === 'win32') {
        // Windows - 관리자 권한 필요
        await execAsync('net stop w32time && net start w32time && w32tm /resync /force');
        console.log('Windows time sync completed');
      } else if (process.platform === 'darwin') {
        // macOS
        await execAsync('sudo sntp -sS time.apple.com');
        console.log('macOS time sync completed');
      } else {
        // Linux
        await execAsync('sudo ntpdate pool.ntp.org');
        console.log('Linux time sync completed');
      }
    } catch (error: any) {
      console.error('Time sync error:', error.message);
      throw new Error(`시간 동기화 실패: ${error.message}`);
    }
  }
}

// Convenience default instance
export const timeSync = TimeSync.getInstance(); 