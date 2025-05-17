const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

// Helper to wait for backend readiness
function waitForBackend(url, retries = 20, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http.get(url, res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    };
    const retry = () => {
      if (++attempts >= retries) {
        reject(new Error('Backend did not become ready in time.'));
      } else {
        setTimeout(check, delay);
      }
    };
    check();
  });
}

// Start backend
console.log('Starting backend server...');
const backend = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'start:server'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  shell: true
});

// Wait for backend to be ready, then start frontend
waitForBackend('http://localhost:5001/api/health')
  .then(() => {
    console.log('Backend is ready. Starting frontend...');
    const frontend = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'start:client'], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      shell: true
    });
    frontend.on('close', code => {
      console.log(`Frontend process exited with code ${code}`);
      process.exit(code);
    });
  })
  .catch(err => {
    console.error('Failed to start frontend:', err.message);
    process.exit(1);
  });

// Handle backend exit
backend.on('close', code => {
  console.log(`Backend process exited with code ${code}`);
  process.exit(code);
}); 