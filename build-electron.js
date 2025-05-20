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

// Compile TypeScript files
console.log('Compiling TypeScript files...');
try {
  // Ensure the output directory exists
  fs.ensureDirSync(distElectronDir);
  
  // Compile TypeScript with specific config
  execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });
  
  // Copy package.json with proper main field
  const packageJson = JSON.parse(fs.readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  const electronPackageJson = {
    ...packageJson,
    main: 'main.cjs',
    type: 'commonjs' // Force CommonJS for Electron main process
  };
  
  fs.writeFileSync(
    join(distElectronDir, 'package.json'),
    JSON.stringify(electronPackageJson, null, 2)
  );
  
  console.log('Successfully compiled TypeScript files');
} catch (error) {
  console.error('Failed to compile TypeScript files:', error);
  process.exit(1);
}

// Copy static files from electron directory
console.log('Copying static files...');
try {
  // Copy all files except .ts files
  const files = fs.readdirSync(srcElectronDir);
  files.forEach(file => {
    if (!file.endsWith('.ts')) {
      const srcPath = join(srcElectronDir, file);
      const destPath = join(distElectronDir, file);
      if (fs.lstatSync(srcPath).isDirectory()) {
        fs.copySync(srcPath, destPath, { overwrite: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  });
} catch (error) {
  console.error('Failed to copy static files:', error);
  process.exit(1);
}

console.log('Electron build completed successfully!');
