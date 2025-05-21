/**
 * timeSync 모듈
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 시간 서버 목록 (여러 서버 시도)
const TIME_SERVERS = [
  'time.windows.com',
  'pool.ntp.org',
  'time.nist.gov',
  'time.google.com'
];

// 로그 파일 경로
const LOG_FILE = path.join(__dirname, '../../logs/timeSync.log');

// 로그 디렉토리 확인 및 생성
try {
  const logsDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (err) {
  console.error('로그 디렉토리 생성 실패:', err);
}

// 로그 기록 함수
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  
  fs.appendFile(LOG_FILE, logMessage, (err) => {
    if (err) console.error('로그 파일 기록 실패:', err);
  });
  
  console.log(message);
}

// Windows 시간 서비스 상태 확인
function checkWindowsTimeService() {
  return new Promise((resolve, reject) => {
    exec('sc query w32time', (error, stdout) => {
      if (error) {
        logToFile(`시간 서비스 상태 확인 실패: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stdout.includes('RUNNING')) {
        logToFile('Windows 시간 서비스 실행 중');
        resolve(true);
      } else {
        logToFile('Windows 시간 서비스가 실행 중이 아님, 시작 시도...');
        resolve(false);
      }
    });
  });
}

// Windows 시간 서비스 시작
function startWindowsTimeService() {
  return new Promise((resolve, reject) => {
    exec('sc start w32time', (error, stdout) => {
      if (error) {
        logToFile(`시간 서비스 시작 실패: ${error.message}`);
        reject(error);
        return;
      }
      
      logToFile('Windows 시간 서비스 시작됨');
      resolve(true);
    });
  });
}

// 단일 서버와 시간 동기화 시도
function syncWithServer(server) {
  return new Promise((resolve, reject) => {
    const command = `w32tm /resync /nowait /computer:${server}`;
    logToFile(`시간 동기화 명령 실행: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logToFile(`${server}와 시간 동기화 실패: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        logToFile(`${server}와 시간 동기화 중 에러: ${stderr}`);
      }
      
      logToFile(`${server}와 시간 동기화 결과: ${stdout}`);
      resolve(true);
    });
  });
}

// 모든 시간 서버로 시간 동기화 시도
async function syncTimeWithAllServers() {
  for (const server of TIME_SERVERS) {
    try {
      await syncWithServer(server);
      logToFile(`${server}와 시간 동기화 성공`);
      return true;
    } catch (error) {
      logToFile(`${server}와 시간 동기화 실패, 다음 서버 시도...`);
      // 실패하면 다음 서버로 계속 진행
    }
  }
  
  throw new Error('모든 시간 서버와 동기화 실패');
}

// 메인 시간 동기화 함수
const timeSync = {
  syncTime: async function() {
    try {
      logToFile('시간 동기화 시작');
      
      // 1. Windows 시간 서비스 확인
      const isRunning = await checkWindowsTimeService().catch(() => false);
      
      // 2. 시간 서비스가 실행 중이 아니면 시작
      if (!isRunning) {
        await startWindowsTimeService().catch(() => {
          logToFile('시간 서비스 시작 실패, 시간 동기화 계속 진행');
        });
      }
      
      // 3. 시간 동기화 시도
      await syncTimeWithAllServers();
      
      logToFile('시간 동기화 완료');
      return true;
    } catch (error) {
      logToFile(`시간 동기화 실패: ${error.message}`);
      console.error('시간 동기화 실패:', error);
      return false;
    }
  }
};

async function testTimeSync() {
  try {
    await timeSync.syncTime();
    console.log('시간 동기화가 성공적으로 완료되었습니다.');
    return { success: true };
  } catch (error) {
    console.error('시간 동기화 테스트 실패:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testTimeSync()
    .then(result => console.log('테스트 결과:', result))
    .catch(err => console.error('테스트 오류:', err));
}

module.exports = { timeSync, testTimeSync }; 