"use strict";
const { spawn } = require('child_process');
const path = require('path');
// Start Next.js dev server
const next = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
});
// Wait for the Next.js dev server to be ready
const waitOn = require('wait-on');
waitOn({
    resources: ['http://localhost:3000'],
    timeout: 30000
}).then(() => {
    console.log('Next.js dev server is ready. Starting Electron...');
    // Start Electron
    const electron = spawn('electron', ['.', '--no-sandbox'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            NODE_ENV: 'development'
        }
    });
    // Handle Electron process exit
    electron.on('close', (code) => {
        console.log(`Electron process exited with code ${code}`);
        process.exit(code);
    });
    // Handle process termination
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Shutting down...');
        electron.kill();
        next.kill();
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log('Received SIGINT. Shutting down...');
        electron.kill();
        next.kill();
        process.exit(0);
    });
}).catch((err) => {
    console.error('Failed to start Next.js dev server:', err);
    process.exit(1);
});
// Handle Next.js process exit
next.on('close', (code) => {
    console.log(`Next.js process exited with code ${code}`);
    process.exit(code);
});
