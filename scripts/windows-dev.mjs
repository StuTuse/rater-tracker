import { spawn } from 'node:child_process';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const child=spawn(process.execPath,[path.join(root,'node_modules/electron/cli.js'),root],{cwd:root,stdio:'inherit',env:{...process.env,RATER_DEV_DIRECTORY:path.join(root,'runtime-data/windows-dev')}});
child.on('exit',code=>process.exit(code??1));
