const parts = version => /^\d+\.\d+\.\d+$/.test(version) ? version.split('.').map(Number) : null;
export function newerVersion(candidate, current) {
  const a = parts(candidate), b = parts(current); if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
export function updateFromRelease(release, current, platform) {
  if (!release || release.draft || release.prerelease || !/^https:\/\/github\.com\/StuTuse\/rater-tracker\/releases\/tag\//.test(release.html_url ?? '')) return null;
  const name = platform === 'android' ? /^Rater-Tracker-Android-(\d+\.\d+\.\d+)-release\.apk$/ : /^Rater-Tracker-(\d+\.\d+\.\d+)-Setup\.exe$/;
  for (const asset of release.assets ?? []) {
    const match = asset.name?.match(name);
    if (match && newerVersion(match[1],current) && asset.state === 'uploaded' && /^https:\/\/github\.com\/StuTuse\/rater-tracker\/releases\/download\//.test(asset.browser_download_url)) return { version:match[1], url:asset.browser_download_url, release:release.html_url };
  }
  return null;
}
