import { spawn } from 'node:child_process';
import path from 'node:path';
const child=spawn(process.execPath,['node_modules/electron/cli.js','.'],{stdio:'inherit',env:{...process.env,RATER_DEV_DIRECTORY:path.resolve('runtime-data/windows-dev')}});
child.on('exit',code=>process.exit(code??1));
