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

// 디렉토리 복사 함수 (재귀적)
function copyDirectory(sourceDir, targetDir) {
  // 타겟 디렉토리 확인 및 생성
  ensureDirExists(targetDir);
  
  // 소스 디렉토리가 존재하는지 확인
  if (!fs.existsSync(sourceDir)) {
    console.log(`소스 디렉토리가 존재하지 않습니다: ${sourceDir}`);
    return;
  }
  
  // 소스 디렉토리 내 파일/폴더 목록 가져오기
  const items = fs.readdirSync(sourceDir);
  
  // 각 파일/폴더를 복사
  for (const item of items) {
    const sourcePath = path.join(sourceDir, item);
    const targetPath = path.join(targetDir, item);
    
    // 디렉토리인 경우 재귀적으로 복사
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      // 파일인 경우 복사
      copyFile(sourcePath, targetPath);
    }
  }
}

// 경로 설정
const rootDir = path.resolve(__dirname, '..');
const sourceUtilsDir = path.join(rootDir, 'electron/utils');
const targetUtilsDir = path.join(rootDir, 'dist/electron/utils');
const sourceServicesDir = path.join(rootDir, 'electron/services');
const targetServicesDir = path.join(rootDir, 'dist/electron/services');
const sourceStoresDir = path.join(rootDir, 'electron/stores');
const targetStoresDir = path.join(rootDir, 'dist/electron/stores');

// 디렉토리 복사 실행
console.log('유틸리티 파일 복사 시작...');
copyDirectory(sourceUtilsDir, targetUtilsDir);

console.log('서비스 파일 복사 시작...');
copyDirectory(sourceServicesDir, targetServicesDir);

console.log('스토어 파일 복사 시작...');
copyDirectory(sourceStoresDir, targetStoresDir);

console.log('모든 파일 복사 완료!');

// 명시적으로 중요 파일 존재 확인
const criticalFiles = [
  { path: path.join(targetUtilsDir, 'timeSync.cjs'), name: 'timeSync.cjs' },
  { path: path.join(targetServicesDir, 'appointmentService.js'), name: 'appointmentService.js' },
  { path: path.join(targetStoresDir, 'index.js'), name: 'stores/index.js' }
];

for (const file of criticalFiles) {
  if (fs.existsSync(file.path)) {
    console.log(`✓ ${file.name} 파일이 올바르게 복사됨`);
  } else {
    console.error(`❌ ${file.name} 파일이 복사되지 않음`);
  }
} 