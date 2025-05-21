import EventEmitter from 'events';
import https from 'https';

export interface ITimeSyncStatus {
  offsetMs: number; // networkTime - localTime in milliseconds
  lastSynced: Date | null;
  synced: boolean; // true if |offsetMs| < thresholdMs
  error?: string;
}

export class TimeSync extends EventEmitter {
  private static _instance: TimeSync;
  private _status: ITimeSyncStatus = {
    offsetMs: 0,
    lastSynced: null,
    synced: true
  };
  private _timer: NodeJS.Timeout | null = null;

  static getInstance(): TimeSync {
    if (!TimeSync._instance) {
      TimeSync._instance = new TimeSync();
    }
    return TimeSync._instance;
  }

  /**
   * Starts periodic synchronization.
   * @param intervalMs Fetch interval in milliseconds (default 60s)
   * @param thresholdMs Allowed offset threshold (default 2000ms)
   */
  start(intervalMs = 60_000, thresholdMs = 2000) {
    if (this._timer) return; // already started
    const run = async () => {
      try {
        const networkTime = await this.fetchNetworkTime();
        const localTime = new Date();
        const offset = networkTime.getTime() - localTime.getTime();
        const synced = Math.abs(offset) < thresholdMs;
        this._status = {
          offsetMs: offset,
          lastSynced: new Date(),
          synced
        };
        this.emit('update', this._status);
      } catch (error: any) {
        this._status = {
          ...this._status,
          error: error.message || String(error)
        };
        this.emit('error', this._status.error);
      }
    };
    run();
    this._timer = setInterval(run, intervalMs);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  getStatus(): ITimeSyncStatus {
    return this._status;
  }

  getOffsetMs(): number {
    return this._status.offsetMs;
  }

  isSynced(): boolean {
    return this._status.synced;
  }

  private fetchNetworkTime(): Promise<Date> {
    return new Promise((resolve, reject) => {
      https
        .get('https://worldtimeapi.org/api/timezone/Asia/Seoul', (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Status code ${res.statusCode}`));
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              // json.datetime: '2025-05-20T16:46:02.366669+09:00'
              const date = new Date(json.datetime);
              resolve(date);
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', (err) => reject(err));
    });
  }
}

// Convenience default instance
export const timeSync = TimeSync.getInstance(); 