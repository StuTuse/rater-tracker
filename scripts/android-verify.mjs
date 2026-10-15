import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function androidTools(root = projectRoot) {
  const localTools = path.join(root, 'runtime-data/toolchains');
  const javaHome = process.env.RATER_JAVA_HOME ?? path.join(localTools,
    (existsSync(localTools) ? readdirSync(localTools) : []).find(name => name.startsWith('jdk-')) ?? 'jdk21');
  const java = path.join(javaHome, 'bin/java.exe');
  if (!existsSync(java)) throw Error('需要 JDK21；请设置 RATER_JAVA_HOME。');
  const candidates = [process.env.ANDROID_SDK_ROOT, process.env.ANDROID_HOME,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android/Sdk')].filter(Boolean);
  const sdk = candidates.find(dir => existsSync(path.join(dir, 'build-tools')));
  if (!sdk) throw Error('需要 Android SDK；请设置 ANDROID_SDK_ROOT。');
  const versions = readdirSync(path.join(sdk, 'build-tools')).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const buildTools = versions.map(version => path.join(sdk, 'build-tools', version))
    .find(dir => existsSync(path.join(dir, 'lib/apksigner.jar')) && existsSync(path.join(dir, 'aapt.exe')));
  if (!buildTools) throw Error('Android SDK Build Tools 缺少 apksigner 或 aapt。');
  return { javaHome, java, sdk, buildTools };
}

function checked(exe, args) {
  const result = spawnSync(exe, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw Error(`APK 验证失败：${result.error?.message || result.stderr || result.stdout || `exit ${result.status}`}`);
  return result.stdout;
}

export function verifyAndroidRelease(apk, root = projectRoot) {
  const tools = androidTools(root);
  const identity = JSON.parse(readFileSync(path.join(root, 'apps/android/signing-identity.json'), 'utf8'));
  const version = readFileSync(path.join(root, 'apps/android/VERSION'), 'utf8').trim();
  const versionCode = Number(readFileSync(path.join(root, 'apps/android/VERSION_CODE'), 'utf8').trim());
  const output = checked(tools.java, ['-jar', path.join(tools.buildTools, 'lib/apksigner.jar'),
    'verify', '--verbose', '--print-certs', apk]);
  // With minSdk 24, apksigner can skip v1 even when its JAR signature exists.
  // Probe API 23 separately to verify that additional compatibility signature.
  const legacy = checked(tools.java, ['-jar', path.join(tools.buildTools, 'lib/apksigner.jar'),
    'verify', '--verbose', '--print-certs', '--min-sdk-version', '23', '--max-sdk-version', '23', apk]);
  for (const [scheme, verification] of [[1, legacy], [2, output], [3, output]]) {
    if (!new RegExp(`Verified using v${scheme} scheme[^\\r\\n]*: true`).test(verification)) {
      throw Error(`APK 缺少有效的 v${scheme} 签名；不能作为本项目正式包发布。`);
    }
  }
  const signers = [...output.matchAll(/Signer #\d+ certificate SHA-256 digest: ([0-9a-f]+)/gi)].map(match => match[1].toLowerCase());
  if (signers.length !== 1 || signers[0] !== identity.certificateSha256.toLowerCase()) {
    throw Error('APK 签名身份与已发布版本不一致；保留原密钥，禁止自动换证。');
  }
  const legacySigners = [...legacy.matchAll(/Signer #\d+ certificate SHA-256 digest: ([0-9a-f]+)/gi)].map(match => match[1].toLowerCase());
  if (legacySigners.length !== 1 || legacySigners[0] !== signers[0]) throw Error('APK的v1与现代签名身份不一致。');
  const badging = checked(path.join(tools.buildTools, 'aapt.exe'), ['dump', 'badging', apk]);
  const metadata = badging.match(/package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/);
  if (!metadata || metadata[1] !== identity.packageName || Number(metadata[2]) !== versionCode || metadata[3] !== version) {
    throw Error('APK 包名或版本与当前正式发布入口不一致。');
  }
  return { publisher: identity.publisher, packageName: metadata[1], version, versionCode,
    signatureSchemes: { v1: true, v2: true, v3: true }, certificateSha256: signers[0],
    bytes: statSync(apk).size, sha256: createHash('sha256').update(readFileSync(apk)).digest('hex') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = readFileSync(path.join(projectRoot, 'apps/android/VERSION'), 'utf8').trim();
  const apk = process.argv[2] ?? path.join(projectRoot, 'release/android', `Rater-Tracker-Android-${version}-release.apk`);
  console.log(JSON.stringify(verifyAndroidRelease(path.resolve(apk)), null, 2));
}
