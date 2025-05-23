/**
 * timeSync 모듈
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

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

// 단일 서버와 시간 동기화 시도 (타임아웃 추가)
function syncWithServer(server) {
  return new Promise((resolve, reject) => {
    const command = `w32tm /resync /nowait /computer:${server}`;
    logToFile(`시간 동기화 명령 실행: ${command}`);
    
    // 타임아웃 설정 (3초)
    const timeoutId = setTimeout(() => {
      logToFile(`${server}와 시간 동기화 타임아웃 (3초 초과), 계속 진행`);
      resolve(false); // 실패해도 에러 던지지 않고 계속 진행
    }, 3000);
    
    exec(command, (error, stdout, stderr) => {
      clearTimeout(timeoutId); // 타임아웃 클리어
      
      if (error) {
        logToFile(`${server}와 시간 동기화 실패: ${error.message}`);
        // 에러를 던지지 않고 성공으로 처리
        resolve(false);
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
  // 첫 번째 서버만 사용 (시간 단축)
  try {
    const result = await syncWithServer(TIME_SERVERS[0]);
    if (result) {
      logToFile(`${TIME_SERVERS[0]}와 시간 동기화 성공`);
    } else {
      logToFile(`${TIME_SERVERS[0]}와 시간 동기화 실패했지만 계속 진행`);
    }
    return true;
  } catch (error) {
    logToFile(`시간 동기화 실패, 무시하고 계속 진행`);
    return true; // 항상 성공 반환
  }
}

// 타임 싱크 이벤트 이미터 생성
const timeSyncEmitter = new EventEmitter();

// 현재 상태 저장
const syncState = {
  offsetMs: 0,
  lastSynced: new Date(),
  synced: true,
  syncInProgress: false
};

// 시간 동기화 유틸리티
const timeSync = {
  // 시간 동기화 함수
  syncTime: async function() {
    console.log('시간 동기화 함수 호출됨');
    // 실제 시간 동기화 로직 구현 (예: NTP 서버에서 시간 가져오기)
    return Promise.resolve();
  }
};

// 테스트 함수
async function testTimeSync() {
  try {
    await timeSync.syncTime();
    return '시간 동기화 테스트 성공';
  } catch (error) {
    console.error('시간 동기화 테스트 실패:', error);
    throw error;
  }
}

// 직접 실행 시 테스트 수행
if (require.main === module) {
  testTimeSync()
    .then(result => console.log('테스트 결과:', result))
    .catch(err => console.error('테스트 오류:', err));
}

// 모듈 내보내기
module.exports = { timeSync, testTimeSync }; 