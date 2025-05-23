const fs = require('fs');
const path = require('path');

// 디렉토리 생성 함수
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`디렉토리 생성됨: ${dirPath}`);
  }
}

// 파일 복사 함수
function copyFile(source, target) {
  try {
    fs.copyFileSync(source, target);
    console.log(`파일 복사 성공: ${source} -> ${target}`);
  } catch (error) {
    console.error(`파일 복사 실패: ${source} -> ${target}`, error);
  }
}

// 소스 및 타겟 디렉토리 설정
const rootDir = path.resolve(__dirname, '..');
const electronSrcDir = path.join(rootDir, 'electron');
const electronDistDir = path.join(rootDir, 'dist/electron');

// 서비스 디렉토리 복사
const servicesDir = path.join(electronSrcDir, 'services');
const servicesDistDir = path.join(electronDistDir, 'services');
ensureDirExists(servicesDistDir);

// JS 파일 복사
const servicesFile = path.join(servicesDir, 'appointmentService.js');
const servicesDistFile = path.join(servicesDistDir, 'appointmentService.js');
copyFile(servicesFile, servicesDistFile);

// 스토어 디렉토리 복사
const storesDir = path.join(electronSrcDir, 'stores');
const storesDistDir = path.join(electronDistDir, 'stores');
ensureDirExists(storesDistDir);

// JS 파일 복사
const storesFile = path.join(storesDir, 'index.js');
const storesDistFile = path.join(storesDistDir, 'index.js');
copyFile(storesFile, storesDistFile);

// utils 디렉토리 복사
const utilsDir = path.join(electronSrcDir, 'utils');
const utilsDistDir = path.join(electronDistDir, 'utils');
ensureDirExists(utilsDistDir);

// JS 파일 복사
const timeSyncFile = path.join(utilsDir, 'timeSync.cjs');
const timeSyncDistFile = path.join(utilsDistDir, 'timeSync.cjs');
copyFile(timeSyncFile, timeSyncDistFile);

console.log('모든 파일 복사 완료!'); 