import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const [relative, format, platform] of [['packages/ui/vendor/cloudbase.js', 'esm', 'browser'], ['apps/windows/electron/cloudbase.cjs', 'cjs', 'node']]) {
  const result = await build({ absWorkingDir: root, entryPoints: ['cloud/client-entry.mjs'], outfile: relative, bundle: true, format, platform, minify: true, legalComments: 'eof', write: false });
  await writeFile(new URL(`../${relative}`, import.meta.url), result.outputFiles[0].text.replace(/[ \t]+$/gm, ''));
}
await writeFile(new URL('../apps/windows/electron/cloudbase-LICENSE.txt', import.meta.url), await readFile(new URL('node_modules/@cloudbase/js-sdk/LICENSE', import.meta.url)));
