// Current packaged acceptance; accepts either an unpacked directory or its EXE.
import path from 'node:path';
if(process.argv[2]?.toLowerCase().endsWith('.exe'))process.argv[2]=path.dirname(path.resolve(process.argv[2]));
await import('./desktop-rebuild-smoke.mjs');
