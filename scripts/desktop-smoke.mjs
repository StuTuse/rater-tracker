import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd(), output = path.join(root, 'output', 'desktop');
const testData = process.env.RATER_TEST_DATA ?? path.join(root, 'runtime-data', 'desktop-smoke');
await mkdir(output, { recursive: true });
const binary = process.argv[2] ?? (await import('electron')).default;
const args = process.argv[2] ? ['--smoke'] : ['.', '--smoke'];
const processHandle = spawn(binary, args, { cwd: root, windowsHide: true, env: { ...process.env, RATER_TEST_DATA: testData, RATER_SMOKE_OUTPUT: output }, stdio: 'inherit' });
const timeout = setTimeout(() => { processHandle.kill(); console.error('Desktop smoke timed out'); }, 45000);
const exit = await new Promise((resolve, reject) => { processHandle.once('error', reject); processHandle.on('exit', (code, signal) => resolve({ code, signal })); });
clearTimeout(timeout);
if (exit.code !== 0) { console.error(`Desktop smoke process exited unexpectedly (code=${exit.code}, signal=${exit.signal}).`); process.exit(1); }
console.log(await readFile(path.join(output, 'report.json'), 'utf8'));
