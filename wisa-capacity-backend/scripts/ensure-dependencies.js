import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const requiredPackages = ['express', 'cors', 'dotenv', 'multer', 'xlsx', 'exceljs', 'pg'];

const missingPackages = requiredPackages.filter((packageName) => {
  try {
    require.resolve(packageName);
    return false;
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') return true;
    throw error;
  }
});

if (missingPackages.length === 0) {
  process.exit(0);
}

console.warn(`Backend dependencies are missing: ${missingPackages.join(', ')}`);
console.warn('Installing backend dependencies before starting the server...');

const install = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (install.status !== 0) {
  console.error('Failed to install backend dependencies. Run `npm install` inside wisa-capacity-backend and try again.');
  process.exit(install.status || 1);
}
