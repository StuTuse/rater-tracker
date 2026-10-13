import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const [relative, format, platform] of [['src/vendor/cloudbase.js', 'esm', 'browser'], ['electron/cloudbase.cjs', 'cjs', 'node']]) {
  const result = await build({ absWorkingDir: root, entryPoints: ['cloud/client-entry.mjs'], outfile: relative, bundle: true, format, platform, minify: true, legalComments: 'eof', write: false });
  await writeFile(new URL(`../${relative}`, import.meta.url), result.outputFiles[0].text.replace(/[ \t]+$/gm, ''));
}
await writeFile(new URL('../electron/cloudbase-LICENSE.txt', import.meta.url), await readFile(new URL('node_modules/@cloudbase/js-sdk/LICENSE', import.meta.url)));
