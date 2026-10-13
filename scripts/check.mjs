import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { BADGES } from '../src/badges.js';
import { ART_ASSETS } from '../src/art.js';
import { createHash } from 'node:crypto';
const version = (await readFile('VERSION', 'utf8')).trim(), pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(pkg.version, version, 'VERSION and package version must agree');
assert.equal(JSON.parse(await readFile('package-lock.json','utf8')).version, version, 'Lockfile version must agree');
assert.equal(BADGES.length, 48);
assert.equal(new Set(BADGES.map(b=>b.id)).size, 48);
const svgs = await Promise.all(BADGES.map(b=>readFile(`assets/badges/${b.id}.svg`,'utf8')));
assert.equal(new Set(svgs.map(svg=>svg.match(/<path d="([^"]+)" fill="(?:#dbe8ca|#ffe29a)"/)[1])).size, 48, 'Every badge has an independent subject');
const manifest = JSON.parse(await readFile('assets/generated/manifest.json', 'utf8'));
assert.equal(manifest.status, 'complete', 'Generated art manifest must be complete');
assert.equal(manifest.assets.length, 51);
const hashes = [];
for (const file of ART_ASSETS) {
  const data = await readFile(file);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
  assert.ok(data.readUInt32BE(16) >= 512 && data.readUInt32BE(20) >= 512, file);
  if (!file.endsWith('journal-pattern.png')) assert.equal(data[25], 6, `Transparent RGBA: ${file}`);
  hashes.push(createHash('sha256').update(data).digest('hex'));
}
assert.equal(new Set(hashes).size, 51, 'All generated assets must be independent files');
for (const dir of ['src','electron','scripts']) for(const name of await readdir(dir)) if(/\.(?:m?js|cjs)$/.test(name)) {
  const result=spawnSync(process.execPath,['--check',`${dir}/${name}`],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
}
const tests=spawnSync(process.execPath,['--test','test/core.test.mjs','test/sync.test.mjs','test/registration.test.mjs','test/growth-stages.test.mjs'],{stdio:'inherit'});
if(tests.status!==0) process.exit(tests.status ?? 1);
console.log(`Version ${version}; syntax; 48 SVG reference subjects; 51 distinct generated PNG assets; business tests passed.`);
