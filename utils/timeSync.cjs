const EventEmitter = require('events');
const https = require('https');
const path = require('path');

class TimeSync extends EventEmitter {
  constructor() {
    super();
    this._status = {
      offsetMs: 0,
      lastSynced: null,
      synced: true
    };
    this._timer = null;
  }

  static getInstance() {
    if (!TimeSync._instance) {
      TimeSync._instance = new TimeSync();
    }
    return TimeSync._instance;
  }

  /**
   * Starts periodic synchronization.
   * @param {number} intervalMs Fetch interval (default 60s)
   * @param {number} thresholdMs Allowed offset threshold (default 2000ms)
   */
  start(intervalMs = 60_000, thresholdMs = 2000) {
    if (this._timer) return;
    const run = async () => {
      try {
        // 전체 타임아웃 5초 설정
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('시간 동기화 시간 초과')), 5000);
        });
        
        // fetchNetworkTime과 타임아웃 중 먼저 완료되는 것 선택
        const networkTime = await Promise.race([
          this.fetchNetworkTime(),
          timeoutPromise
        ]);
        
        const localTime = new Date();
        const offset = networkTime.getTime() - localTime.getTime();
        const synced = Math.abs(offset) < thresholdMs;
        this._status = {
          offsetMs: offset,
          lastSynced: new Date(),
          synced
        };
        this.emit('update', this._status);
      } catch (error) {
        console.warn('시간 동기화 실패:', error.message);
        this._status = {
          ...this._status,
          error: error.message || String(error),
          synced: false
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

  getStatus() {
    return this._status;
  }

  getOffsetMs() {
    return this._status.offsetMs;
  }

  isSynced() {
    return this._status.synced;
  }

  fetchNetworkTime() {
    return new Promise((resolve, reject) => {
      const request = https
        .get('https://worldtimeapi.org/api/timezone/Asia/Seoul', (res) => {
          if (res.statusCode !== 200) {
            console.error('시간 동기화 API 상태 코드 오류:', res.statusCode);
            resolve(new Date()); // 에러 시 로컬 시간 반환
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const date = new Date(json.datetime);
              resolve(date);
            } catch (e) {
              console.error('시간 동기화 파싱 오류:', e);
              resolve(new Date()); // 에러 시 로컬 시간 반환
            }
          });
        })
        .on('error', (err) => {
          console.error('시간 동기화 네트워크 오류:', err);
          resolve(new Date()); // 에러 시 로컬 시간 반환
        });
        
      // 요청에 3초 타임아웃 설정
      request.setTimeout(3000, () => {
        console.error('시간 동기화 요청 타임아웃');
        request.destroy();
        resolve(new Date()); // 타임아웃 시 로컬 시간 반환
      });
    });
  }
}

const timeSync = TimeSync.getInstance();

module.exports = { TimeSync, timeSync }; 