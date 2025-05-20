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
      } catch (error) {
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

const timeSync = TimeSync.getInstance();

module.exports = { TimeSync, timeSync }; 