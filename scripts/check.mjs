import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { BADGES } from '../src/badges.js';
const version = (await readFile('VERSION', 'utf8')).trim(), pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(pkg.version, version, 'VERSION and package version must agree');
assert.equal(JSON.parse(await readFile('package-lock.json','utf8')).version, version, 'Lockfile version must agree');
assert.equal(BADGES.length, 48);
assert.equal(new Set(BADGES.map(b=>b.id)).size, 48);
const svgs = await Promise.all(BADGES.map(b=>readFile(`assets/badges/${b.id}.svg`,'utf8')));
assert.equal(new Set(svgs.map(svg=>svg.match(/<path d="([^"]+)" fill="(?:#dbe8ca|#ffe29a)"/)[1])).size, 48, 'Every badge has an independent subject');
for (const dir of ['src','electron','scripts']) for(const name of await readdir(dir)) if(/\.(?:m?js|cjs)$/.test(name)) {
  const result=spawnSync(process.execPath,['--check',`${dir}/${name}`],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
}
const tests=spawnSync(process.execPath,['--test','test/core.test.mjs'],{stdio:'inherit'});
if(tests.status!==0) process.exit(tests.status ?? 1);
console.log(`Version ${version}; syntax; 48 distinct SVG subjects; business tests passed.`);
