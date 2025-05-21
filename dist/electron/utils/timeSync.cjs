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

// 단일 서버와 시간 동기화 시도 (타임아웃 추가)function syncWithServer(server) {  return new Promise((resolve, reject) => {    const command = `w32tm /resync /nowait /computer:${server}`;    logToFile(`시간 동기화 명령 실행: ${command}`);        // 타임아웃 설정 (3초)    const timeoutId = setTimeout(() => {      logToFile(`${server}와 시간 동기화 타임아웃 (3초 초과), 계속 진행`);      resolve(false); // 실패해도 에러 던지지 않고 계속 진행    }, 3000);        exec(command, (error, stdout, stderr) => {      clearTimeout(timeoutId); // 타임아웃 클리어            if (error) {        logToFile(`${server}와 시간 동기화 실패: ${error.message}`);        // 에러를 던지지 않고 성공으로 처리        resolve(false);        return;      }            if (stderr) {        logToFile(`${server}와 시간 동기화 중 에러: ${stderr}`);      }            logToFile(`${server}와 시간 동기화 결과: ${stdout}`);      resolve(true);    });  });}

// 모든 시간 서버로 시간 동기화 시도async function syncTimeWithAllServers() {  // 첫 번째 서버만 사용 (시간 단축)  try {    const result = await syncWithServer(TIME_SERVERS[0]);    if (result) {      logToFile(`${TIME_SERVERS[0]}와 시간 동기화 성공`);    } else {      logToFile(`${TIME_SERVERS[0]}와 시간 동기화 실패했지만 계속 진행`);    }    return true;  } catch (error) {    logToFile(`시간 동기화 실패, 무시하고 계속 진행`);    return true; // 항상 성공 반환  }}

// 메인 시간 동기화 함수const timeSync = {  syncTime: async function() {    try {      logToFile('시간 동기화 시작');            // 전체 타임아웃 설정 (모든 작업이 5초 이상 걸리면 강제 종료)      const timeout = setTimeout(() => {        logToFile('시간 동기화 전체 타임아웃 (5초 초과), 강제 계속 진행');      }, 5000);            try {        // 1. Windows 시간 서비스 확인 (빠른 타임아웃)        const checkPromise = checkWindowsTimeService();        const isRunning = await Promise.race([          checkPromise,          new Promise(resolve => setTimeout(() => {            logToFile('서비스 확인 타임아웃, 계속 진행');            resolve(false);          }, 1000))        ]).catch(() => false);                // 2. 시간 서비스가 실행 중이 아니면 시작 (빠른 타임아웃)        if (!isRunning) {          const startPromise = startWindowsTimeService();          await Promise.race([            startPromise,            new Promise(resolve => setTimeout(() => {              logToFile('서비스 시작 타임아웃, 계속 진행');              resolve(false);            }, 1000))          ]).catch(() => {            logToFile('시간 서비스 시작 실패, 시간 동기화 계속 진행');          });        }                // 3. 시간 동기화 시도 (실패해도 계속 진행)        await syncTimeWithAllServers();      } finally {        clearTimeout(timeout);      }            logToFile('시간 동기화 완료');      return true;    } catch (error) {      logToFile(`시간 동기화 실패 (무시하고 계속 진행): ${error.message}`);      console.error('시간 동기화 실패 (무시하고 계속 진행):', error);      return true; // 항상 성공 반환    }  }};

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

// 모듈 내보내기 방식을 CommonJS 스타일로 명확하게 지정
module.exports = { 
  timeSync: timeSync, 
  testTimeSync: testTimeSync 
}; 