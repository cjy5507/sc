import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs-extra';

console.log('Building Electron main process...');

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');
const distElectronDir = join(distDir, 'electron');
const srcElectronDir = join(rootDir, 'electron');

// Clean dist directory
fs.removeSync(distDir);
fs.ensureDirSync(distElectronDir);

// 리소스 디렉토리 생성
fs.ensureDirSync(join(distElectronDir, 'resources'));

// Compile TypeScript files
console.log('Compiling TypeScript files...');
try {
  // Ensure the output directory exists
  fs.ensureDirSync(distElectronDir);
  
  // Compile TypeScript with specific config
  execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });
  
  // package.json 처리 - CommonJS 모드로 설정
  const packageJson = JSON.parse(fs.readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  const electronPackageJson = {
    ...packageJson,
    main: 'main.cjs',
    type: 'commonjs'
  };
  
  fs.writeFileSync(
    join(distElectronDir, 'package.json'),
    JSON.stringify(electronPackageJson, null, 2)
  );
  
  // 이름 변경: main.js -> main.cjs 
  if (fs.existsSync(join(distElectronDir, 'main.js'))) {
    fs.renameSync(
      join(distElectronDir, 'main.js'),
      join(distElectronDir, 'main.cjs')
    );
  }
  
  console.log('Successfully compiled TypeScript files');
} catch (error) {
  console.error('Failed to compile TypeScript files:', error);
  process.exit(1);
}

// Copy static files from electron directory
console.log('Copying static files...');
try {
  // HTML 파일과 기타 리소스 복사
  fs.copyFileSync(
    join(srcElectronDir, 'index.html'),
    join(distElectronDir, 'index.html')
  );
  
  // resources 디렉토리가 있으면 복사
  const resourcesSrcDir = join(srcElectronDir, 'resources');
  const resourcesDestDir = join(distElectronDir, 'resources');
  
  if (fs.existsSync(resourcesSrcDir)) {
    fs.copySync(resourcesSrcDir, resourcesDestDir, { overwrite: true });
  }
  
  // utils 디렉토리 복사 (CommonJS 모듈 유지)
  const utilsSrcDir = join(srcElectronDir, 'utils');
  const utilsDestDir = join(distElectronDir, 'utils');
  
  if (fs.existsSync(utilsSrcDir)) {
    fs.copySync(utilsSrcDir, utilsDestDir, { overwrite: true });
  }
  
  // 기타 필요한 비-TypeScript 파일 복사
  const files = fs.readdirSync(srcElectronDir);
  files.forEach(file => {
    if (!file.endsWith('.ts') && !['node_modules', 'dist'].includes(file)) {
      const srcPath = join(srcElectronDir, file);
      const destPath = join(distElectronDir, file);
      if (fs.lstatSync(srcPath).isDirectory()) {
        fs.copySync(srcPath, destPath, { overwrite: true });
      } else if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  });
} catch (error) {
  console.error('Failed to copy static files:', error);
  process.exit(1);
}

console.log('Electron build completed successfully!');
