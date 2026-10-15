const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
let result;

if (process.platform === 'win32') {
  result = spawnSync('wsl.exe', [
    '--cd', root,
    '--exec', 'bash', 'scripts/build-linux.sh', ...args
  ], { cwd: root, stdio: 'inherit' });
} else if (process.platform === 'linux') {
  result = spawnSync('bash', [path.join(__dirname, 'build-linux.sh'), ...args], {
    cwd: root,
    stdio: 'inherit'
  });
} else {
  console.error('Build Linux packages on Linux or through WSL on Windows.');
  process.exit(1);
}

if (result.error) {
  console.error(result.error.message);
  if (process.platform === 'win32') console.error('Install and start a WSL Linux distribution before building Linux packages.');
}

process.exit(result.status ?? 1);
