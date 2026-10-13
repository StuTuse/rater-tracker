import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import electron from 'electron';
const root = process.cwd(), output = path.join(root, 'output/desktop/account');
await mkdir(output, { recursive:true });
const child = spawn(process.argv[2] ?? electron, process.argv[2] ? ['--account-smoke'] : ['.', '--account-smoke'], {
  cwd: root, windowsHide: true, stdio:'inherit', env: { ...process.env,
    RATER_TEST_DATA: path.join(root,'runtime-data/account-package'),
    RATER_ACCOUNT_TEST_FILE:path.join(root,'runtime-data/cloud-test/account.json'), RATER_SMOKE_OUTPUT:output }
});
const timer=setTimeout(()=>child.kill(),45000);
const code=await new Promise(resolve=>child.on('exit',resolve)); clearTimeout(timer);
if(code!==0) process.exit(1);
console.log(await readFile(path.join(output,'account-smoke.json'),'utf8'));
