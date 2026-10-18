import { updateFromRelease } from '../core/updates.js';
export function createUpdateCheck({ platform, version, notify }) {
  let busy = false, lastCheck = 0;
  return async function check(force = false) {
    if (busy || !force && Date.now() - lastCheck < 4 * 3600000) return;
    busy = true; lastCheck = Date.now();
    try {
      for(let page=1;page<=3;page++){
        const response = await fetch(`https://api.github.com/repos/StuTuse/rater-tracker/releases?per_page=30&page=${page}`, { signal:AbortSignal.timeout(8000), headers:{Accept:'application/vnd.github+json'}, credentials:'omit', cache:'no-cache' });
        if (!response.ok) return;
        const releases=await response.json();if(!Array.isArray(releases))return;
        for(const release of releases){const candidate=updateFromRelease(release,version,platform);if(candidate){notify(candidate);return;}}
        if(releases.length<30)return;
      }
    } catch { /* Background update availability never blocks local records. */ }
    finally { busy = false; }
  };
}
