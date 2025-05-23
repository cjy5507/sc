const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// TS 파일을 JS로 컴파일하는 함수
function compileTs(filePath, outDir) {
  try {
    // outDir이 없으면 생성
    ensureDirExists(outDir);
    
    // tsc 명령어 실행하여 TS 파일을 JS로 컴파일
    console.log(`컴파일 중: ${filePath}`);
    
    // 파일명만 추출
    const fileName = path.basename(filePath);
    const fileNameWithoutExt = fileName.replace(/\.ts$/, '');
    
    // 소스 디렉토리 경로
    const sourceDir = path.dirname(filePath);
    
    // 상대 경로 계산 (electron 디렉토리 기준)
    const electronDir = path.resolve(__dirname, '../electron');
    const relativeToElectron = path.relative(electronDir, sourceDir);
    
    // 출력 디렉토리 계산
    const outputDir = path.join(outDir, relativeToElectron);
    ensureDirExists(outputDir);
    
    // 출력 파일 경로
    const outputPath = path.join(outputDir, `${fileNameWithoutExt}.js`);
    
    // 명령 실행
    const cmd = `npx tsc "${filePath}" --outDir "${outputDir}" --target ES2020 --module CommonJS --esModuleInterop --moduleResolution node`;
    execSync(cmd);
    
    // 컴파일 확인
    if (fs.existsSync(outputPath)) {
      console.log(`컴파일 완료: ${outputPath}`);
      return true;
    } else {
      console.error(`컴파일 실패: ${outputPath} 파일이 생성되지 않음`);
      return false;
    }
  } catch (error) {
    console.error(`컴파일 중 오류 발생: ${error.message}`);
    if (error.stderr) {
      console.error(`오류 상세: ${error.stderr.toString()}`);
    }
    return false;
  }
}

// 중요 파일 목록
const files = [
  {
    src: path.resolve(__dirname, '../electron/services/appointmentService.ts'),
    targetDir: path.resolve(__dirname, '../dist/electron')
  },
  {
    src: path.resolve(__dirname, '../electron/stores/index.ts'),
    targetDir: path.resolve(__dirname, '../dist/electron')
  }
];

// 모든 중요 파일 컴파일
let success = true;
for (const file of files) {
  const result = compileTs(file.src, file.targetDir);
  if (!result) {
    success = false;
  }
}

// 결과 보고
if (success) {
  console.log('모든 TS 파일이 성공적으로 컴파일되었습니다.');
} else {
  console.error('일부 TS 파일 컴파일에 실패했습니다.');
  process.exit(1);
} 