import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'apps/android/www');
await mkdir(dest,{recursive:true});
for(const dir of ['src','assets','packages']) { try { await cp(path.join(root,dir),path.join(dest,dir),{recursive:true}); } catch(e) { if(e.code!=='ENOENT')throw e; } }
await cp(path.join(root,'apps/android/node_modules/@capacitor/core/dist/index.js'),path.join(dest,'capacitor-core.js'));
await cp(path.join(root,'apps/android/mobile.css'),path.join(dest,'mobile.css'));
await cp(path.join(root,'apps/android/bootstrap.js'),path.join(dest,'bootstrap.js'));
const html=(await readFile(path.join(root,'index.html'),'utf8')).replace('width=device-width, initial-scale=1','width=device-width, initial-scale=1, viewport-fit=cover').replace('</head>','<link rel="stylesheet" href="mobile.css"></head>').replace('src="src/app.js"','src="bootstrap.js"');
await writeFile(path.join(dest,'index.html'),html);
const version=(await readFile(path.join(root,'apps/android/VERSION'),'utf8')).trim();
await writeFile(path.join(dest,'version.json'),JSON.stringify({version}));
console.log('Android local web assets prepared: '+version);
