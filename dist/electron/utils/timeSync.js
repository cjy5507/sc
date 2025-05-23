const EventEmitter = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const execAsync = promisify(exec);
/**
 * 시간 동기화 상태 인터페이스
 */
class TimeSyncStatus {
    constructor(status, message) {
        this.status = status;
        this.message = message;
    }
}
/**
 * 윈도우 시간 서비스 상태 확인
 */
async function checkWindowsTimeService() {
    try {
        const { stdout } = await execAsync('sc query w32time');
        return stdout.includes('RUNNING');
    }
    catch (error) {
        console.error('Windows Time 서비스 상태 확인 실패:', error.message);
        return false;
    }
}
/**
 * 시간 서버 목록 가져오기
 */
async function getTimeServers() {
    // 한국 및 유명 시간 서버 목록
    const defaultServers = [
        'time.windows.com', // Windows 기본 시간 서버
        'time.google.com', // Google 시간 서버
        'time.cloudflare.com', // Cloudflare 시간 서버
        'time.nist.gov', // NIST 서버
        'pool.ntp.org', // NTP 풀
        'asia.pool.ntp.org', // 아시아 NTP 풀
        'kr.pool.ntp.org', // 한국 NTP 풀
        'time.bora.net', // 한국 시간 서버
        'time.kriss.re.kr', // 한국표준과학연구원 시간 서버
        'time.nuri.net' // 한국 시간 서버
    ];
    // 현재 설정된 시간 서버 확인 시도
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('w32tm /query /source');
            if (stdout && stdout.trim()) {
                // 현재 사용 중인 서버를 목록의 맨 앞으로
                const currentServer = stdout.trim();
                return [currentServer, ...defaultServers.filter(s => s !== currentServer)];
            }
        }
    }
    catch (error) {
        console.log('현재 시간 서버 확인 실패:', error.message);
    }
    return defaultServers;
}
/**
 * 로그 파일에 시간 동기화 결과 기록
 */
async function logSyncAttempt(server, success, message) {
    try {
        const logDir = path.join(os.tmpdir(), 'rolex-sync-logs');
        await fs.mkdir(logDir, { recursive: true });
        const logFile = path.join(logDir, 'time-sync.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] Server: ${server}, Success: ${success}, Message: ${message}\n`;
        await fs.appendFile(logFile, logEntry);
    }
    catch (error) {
        console.error('로그 기록 실패:', error);
    }
}
/**
 * 시간 동기화 클래스
 */
class TimeSync extends EventEmitter {
    constructor() {
        super();
    }
    static getInstance() {
        if (!TimeSync.instance) {
            TimeSync.instance = new TimeSync();
        }
        return TimeSync.instance;
    }
    /**
     * 시간 동기화 실행
     */
    async syncTime() {
        try {
            if (process.platform === 'win32') {
                // Windows용 개선된 시간 동기화
                const timeServers = await getTimeServers();
                // 여러 시간 서버를 시도하여 성공할 때까지 반복
                for (const server of timeServers) {
                    try {
                        console.log(`Windows 시간 서버 [${server}]로 동기화 시도 중...`);
                        // 방법 1: w32tm /resync 직접 실행
                        try {
                            const { stdout, stderr } = await execAsync('w32tm /resync /force');
                            console.log('시간 동기화 결과:', stdout);
                            if (stderr)
                                console.error('시간 동기화 오류:', stderr);
                            // 로그 기록
                            await logSyncAttempt(server, true, 'w32tm /resync /force 성공');
                            this.emit('sync-complete', new TimeSyncStatus('success', `Windows 시간 동기화 완료 (서버: ${server})`));
                            return;
                        }
                        catch (error1) {
                            console.log(`서버 [${server}] 방법 1 실패:`, error1.message);
                            // 방법 2: 시간 서버 변경 후 동기화
                            try {
                                // 시간 서버 변경
                                await execAsync(`w32tm /config /syncfromflags:manual /manualpeerlist:"${server}" /update`);
                                console.log(`시간 서버를 ${server}로 변경 성공`);
                                // 동기화 시도
                                await execAsync('w32tm /resync /force');
                                // 로그 기록
                                await logSyncAttempt(server, true, '시간 서버 변경 후 동기화 성공');
                                this.emit('sync-complete', new TimeSyncStatus('success', `Windows 시간 동기화 완료 (서버: ${server})`));
                                return;
                            }
                            catch (error2) {
                                console.log(`서버 [${server}] 방법 2 실패:`, error2.message);
                                // 마지막 서버인 경우만 다음 방법 시도
                                if (server === timeServers[timeServers.length - 1]) {
                                    // 방법 3: 서비스 재시작
                                    try {
                                        // 시간 서비스 상태 확인
                                        const isTimeServiceRunning = await checkWindowsTimeService();
                                        if (isTimeServiceRunning) {
                                            console.log('Windows Time 서비스 실행 중, 재시작 시도...');
                                            try {
                                                await execAsync('net stop w32time && net start w32time && w32tm /resync /force');
                                                // 로그 기록
                                                await logSyncAttempt('system', true, '서비스 재시작 후 동기화 성공');
                                                this.emit('sync-complete', new TimeSyncStatus('success', 'Windows 시간 서비스 재시작 후 동기화 완료'));
                                                return;
                                            }
                                            catch (restartError) {
                                                console.error('서비스 재시작 실패:', restartError.message);
                                                // 로그 기록
                                                await logSyncAttempt('system', false, '서비스 재시작 실패: ' + restartError.message);
                                                if (restartError.message.includes('관리자 권한이 필요')) {
                                                    throw new Error('시간 동기화에 관리자 권한이 필요합니다');
                                                }
                                            }
                                        }
                                        else {
                                            console.log('Windows Time 서비스가 실행 중이 아닙니다.');
                                            // 로그 기록
                                            await logSyncAttempt('system', false, 'Windows Time 서비스 미실행');
                                        }
                                    }
                                    catch (serviceCheckError) {
                                        console.error('서비스 상태 확인 실패:', serviceCheckError.message);
                                        // 로그 기록
                                        await logSyncAttempt('system', false, '서비스 상태 확인 실패: ' + serviceCheckError.message);
                                    }
                                }
                            }
                        }
                    }
                    catch (serverError) {
                        console.log(`서버 [${server}] 시도 중 오류:`, serverError.message);
                        // 로그 기록
                        await logSyncAttempt(server, false, '서버 시도 중 오류: ' + serverError.message);
                        // 다음 서버 시도
                        continue;
                    }
                }
                // 모든 서버 실패 시
                this.emit('sync-error', new TimeSyncStatus('error', '모든 시간 서버와의 동기화 실패'));
                throw new Error('시간 동기화 실패: 모든 시간 서버와의 동기화 시도가 실패했습니다.');
            }
            else {
                // macOS, Linux 등의 경우
                try {
                    console.log('macOS/Linux 시간 동기화 시도 중...');
                    const command = process.platform === 'darwin' ?
                        'sudo sntp -sS time.apple.com' :
                        'sudo ntpdate pool.ntp.org';
                    await execAsync(command);
                    this.emit('sync-complete', new TimeSyncStatus('success', '시간 동기화 완료'));
                }
                catch (unixError) {
                    console.error('시간 동기화 실패:', unixError.message);
                    this.emit('sync-error', new TimeSyncStatus('error', `시간 동기화 실패: ${unixError.message}`));
                    throw new Error(`시간 동기화 실패: ${unixError.message}`);
                }
            }
        }
        catch (e) {
            this.emit('sync-error', new TimeSyncStatus('error', e.message));
            throw e;
        }
    }
}
// 싱글톤 인스턴스 생성
const timeSync = TimeSync.getInstance();
// 노드 모듈로 내보내기
module.exports = {
    timeSync,
    TimeSyncStatus
};
