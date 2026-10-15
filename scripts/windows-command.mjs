import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const task = process.argv[2];
if (!['check', 'build', 'dist', 'dist:signed'].includes(task)) throw Error('Unknown Windows build task.');
const script = task === 'check' ? 'scripts/check.mjs' : 'node_modules/electron-builder/cli.js';
const args = task === 'build' ? ['--win', '--x64', '--dir'] : task.startsWith('dist')
  ? ['--win', 'nsis', '--x64', '--publish', 'never', ...(task === 'dist:signed' ? ['--config.forceCodeSigning=true'] : [])] : [];
const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
