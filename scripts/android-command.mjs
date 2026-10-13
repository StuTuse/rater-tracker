import { spawn } from 'node:child_process';
const p=spawn(process.execPath,['node_modules/@capacitor/cli/bin/capacitor',...process.argv.slice(2)],{cwd:'apps/android',stdio:'inherit'});p.on('exit',c=>process.exit(c??1));
