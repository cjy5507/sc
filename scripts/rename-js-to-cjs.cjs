const fs = require('fs');
const path = require('path');

// 전자 상거래 파일의 위치
const electronMainJs = path.resolve(__dirname, '../dist/electron/main.js');
const electronMainCjs = path.resolve(__dirname, '../dist/electron/main.cjs');

console.log(`JS에서 CJS로 변환: ${electronMainJs} -> ${electronMainCjs}`);

// ES 모듈 import 문을 CommonJS require 문으로 변환하는 함수
function convertESModuleToCJS(content) {
  // import 문을 require로 변환
  let convertedContent = content.replace(
    /import\s+(\{[\s\w,]+\})\s+from\s+['"]([^'"]+)['"]/g,
    'const $1 = require(\'$2\')'
  );
  
  // 기본 import 변환 (import foo from 'bar')
  convertedContent = convertedContent.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    'const $1 = require(\'$2\')'
  );
  
  // 타입 전용 import 제거 (import type { Foo } from 'bar')
  convertedContent = convertedContent.replace(
    /import\s+type\s+(\{[\s\w,]+\})\s+from\s+['"][^'"]+['"];?/g,
    '// $& - Type import removed'
  );
  
  // export 문 처리
  convertedContent = convertedContent.replace(
    /export\s+(\{[\s\w,]+\})/g,
    'module.exports = $1'
  );
  
  // export default 처리
  convertedContent = convertedContent.replace(
    /export\s+default\s+(\w+)/g,
    'module.exports = $1'
  );
  
  return convertedContent;
}

// 파일이 존재하는지 확인
if (fs.existsSync(electronMainJs)) {
  try {
    // 파일 내용 읽기
    const content = fs.readFileSync(electronMainJs, 'utf8');
    
    // ES 모듈을 CommonJS로 변환
    const convertedContent = convertESModuleToCJS(content);
    
    // 이미 .cjs 파일이 있으면 먼저 삭제
    if (fs.existsSync(electronMainCjs)) {
      fs.unlinkSync(electronMainCjs);
      console.log(`기존 파일 삭제됨: ${electronMainCjs}`);
    }
    
    // 변환된 내용을 .cjs 파일로 저장
    fs.writeFileSync(electronMainCjs, convertedContent, 'utf8');
    console.log(`파일 변환 성공: ${electronMainJs} -> ${electronMainCjs} (ES 모듈 -> CommonJS)`);
  } catch (error) {
    console.error(`파일 변환 중 오류 발생:`, error);
    process.exit(1);
  }
} else {
  if (fs.existsSync(electronMainCjs)) {
    console.log(`main.js가 없지만 main.cjs가 이미 존재합니다. 변환 필요 없음.`);
  } else {
    console.log(`원본 파일을 찾을 수 없음: ${electronMainJs}, main.cjs 파일을 확인합니다.`);
    
    // electron 디렉토리에서 main.cjs 찾기
    const electronDirMainCjs = path.resolve(__dirname, '../electron/main.cjs');
    if (fs.existsSync(electronDirMainCjs)) {
      console.log(`electron 디렉토리에서 main.cjs 파일을 발견했습니다: ${electronDirMainCjs}`);
      
      // dist/electron 디렉토리가 존재하는지 확인하고 없으면 생성
      const distElectronDir = path.resolve(__dirname, '../dist/electron');
      if (!fs.existsSync(distElectronDir)) {
        fs.mkdirSync(distElectronDir, { recursive: true });
        console.log(`dist/electron 디렉토리 생성됨: ${distElectronDir}`);
      }
      
      // 파일 복사
      fs.copyFileSync(electronDirMainCjs, electronMainCjs);
      console.log(`파일 복사 성공: ${electronDirMainCjs} -> ${electronMainCjs}`);
    } else {
      // electron 디렉토리에서 main.ts 찾기
      const electronDirMainTs = path.resolve(__dirname, '../electron/main.ts');
      if (fs.existsSync(electronDirMainTs)) {
        console.log(`electron 디렉토리에서 main.ts 파일을 발견했습니다. 수동으로 CommonJS로 변환해야 합니다.`);
        console.log(`tsc로 컴파일한 후 import 문을 require 문으로 변환하세요.`);
      }
      
      console.log(`electron 디렉토리에서도 main.cjs 파일을 찾을 수 없습니다. 빌드 과정은 계속 진행됩니다.`);
    }
  }
}

console.log('JS에서 CJS로 변환 과정 완료'); 