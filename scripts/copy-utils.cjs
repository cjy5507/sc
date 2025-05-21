const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../electron/utils/timeSync.cjs');
const dest = path.resolve(__dirname, '../dist/electron/timeSync.cjs');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('Copied timeSync.cjs'); 