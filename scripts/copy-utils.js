const fs = require('fs-extra');

fs.ensureDirSync('dist/utils');
fs.copySync('utils/timeSync.cjs', 'dist/utils/timeSync.cjs'); 