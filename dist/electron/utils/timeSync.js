"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeSync = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class TimeSync extends events_1.EventEmitter {
    constructor() {
        super();
    }
    static getInstance() {
        if (!TimeSync.instance) {
            TimeSync.instance = new TimeSync();
        }
        return TimeSync.instance;
    }
    async syncTime() {
        try {
            if (process.platform === 'win32') {
                // Windows - 관리자 권한 필요
                await execAsync('net stop w32time && net start w32time && w32tm /resync /force');
                console.log('Windows time sync completed');
            }
            else if (process.platform === 'darwin') {
                // macOS
                await execAsync('sudo sntp -sS time.apple.com');
                console.log('macOS time sync completed');
            }
            else {
                // Linux
                await execAsync('sudo ntpdate pool.ntp.org');
                console.log('Linux time sync completed');
            }
        }
        catch (error) {
            console.error('Time sync error:', error.message);
            throw new Error(`시간 동기화 실패: ${error.message}`);
        }
    }
}
// Convenience default instance
exports.timeSync = TimeSync.getInstance();
//# sourceMappingURL=timeSync.js.map