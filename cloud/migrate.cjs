const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const cli = path.join(__dirname, 'node_modules/@cloudbase/cli/bin/tcb');
const sql = fs.readFileSync(path.join(__dirname, 'migrations/001_sync.sql'), 'utf8');
execFileSync(process.execPath, [cli, 'db', 'execute', '-e', 'rater-tracker-sync-d3cx88f64aea2', '--region', 'ap-shanghai', '--sql', sql, '--json', '--yes'], { stdio: 'inherit', cwd: __dirname });
