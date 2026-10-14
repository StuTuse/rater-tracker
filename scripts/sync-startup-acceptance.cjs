// Isolated browser UI check with a fake account module and fake cloud. No credentials or real RPC.
async page => {
  const origin = 'http://127.0.0.1:4175';
  await page.route('**/packages/ui/account.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    export async function currentAccount() { return JSON.parse(localStorage.getItem('sync-test-account') || 'null'); }
    export async function cloudSync(request) {
      window.syncTestCalls ??= []; window.syncTestCalls.push(request.type);
      await new Promise(resolve => setTimeout(resolve, 60));
      const cloud = JSON.parse(localStorage.getItem('sync-test-cloud'));
      if (request.type === 'pull') return cloud;
      if (request.baseVersion !== cloud.version) return {conflict:true,version:cloud.version};
      localStorage.setItem('sync-test-cloud', JSON.stringify({state:request.state,version:cloud.version+1}));
      return {accepted:true,version:cloud.version+1};
    }
    export async function loginAccount() { throw Error('Mock only'); }
    export async function logoutAccount() {}
    export async function registerAccount() { throw Error('Mock only'); }
    export async function verifyRegistration() { throw Error('Mock only'); }
    export async function cancelRegistration() {}
  ` }));
  await page.goto(origin); await page.evaluate(() => window.raterReady);
  await page.evaluate(async () => {
    const core = await import('/src/core.js'), {openStore} = await import('/src/storage.js');
    const db = await openStore('browser-sync-only'), before = await db.read();
    const now = new Date().toISOString(), date = core.hongKong(now).date;
    const rate = stars => core.transact(core.createState(), {id:crypto.randomUUID(),type:'rate',date,dimension:'study',stars}, now);
    const local = rate(1); local.revision = before.revision + 1; await db.write(local, before.revision); db.close();
    const cloud = rate(5); cloud.modifiedAt = new Date(Date.now() + 60000).toISOString();
    localStorage.setItem('sync-test-cloud', JSON.stringify({state:cloud,version:2}));
    localStorage.setItem('sync-test-account', JSON.stringify({id:'browser-sync-only',name:'隔离同步验收'}));
  });
  await page.reload(); await page.evaluate(() => window.raterReady);
  await page.waitForFunction(() => document.querySelector('#save-status')?.textContent === '已同步');
  const cloudNewer = await page.evaluate(async () => {
    const {openStore} = await import('/src/storage.js'), db = await openStore('browser-sync-only'), s = await db.read(); db.close();
    return {stars:Object.values(s.ratings)[0].study.stars,calls:window.syncTestCalls,shown:document.querySelector('.star-button[data-dimension="study"][data-stars="5"]')?.getAttribute('aria-pressed')};
  });
  if (cloudNewer.stars !== 5 || cloudNewer.shown !== 'true' || cloudNewer.calls.join(',') !== 'pull') throw Error('Cloud-first startup did not update the real UI');
  await page.screenshot({path:'output/playwright/sync-startup-cloud-newer.png',fullPage:true});
  await page.evaluate(async () => {
    const core = await import('/src/core.js'), {openStore} = await import('/src/storage.js');
    const db = await openStore('browser-sync-only'), before = await db.read(), now = new Date().toISOString(), date = core.hongKong(now).date;
    const next = core.transact(before,{id:crypto.randomUUID(),type:'rate',date,dimension:'study',stars:2},now);
    await db.write(next,before.revision); db.close();
    const cloud = JSON.parse(localStorage.getItem('sync-test-cloud')); cloud.state.modifiedAt = new Date(Date.parse(next.modifiedAt) - 1000).toISOString();
    localStorage.setItem('sync-test-cloud',JSON.stringify(cloud));
  });
  await page.reload(); await page.evaluate(() => window.raterReady);
  await page.waitForFunction(() => document.querySelector('#save-status')?.textContent === '已同步');
  const localNewer = await page.evaluate(() => ({cloud:JSON.parse(localStorage.getItem('sync-test-cloud')),calls:window.syncTestCalls,shown:document.querySelector('.star-button[data-dimension="study"][data-stars="2"]')?.getAttribute('aria-pressed')}));
  if (Object.values(localNewer.cloud.state.ratings)[0].study.stars !== 2 || localNewer.shown !== 'true' || localNewer.calls.join(',') !== 'pull,push') throw Error('Newer local startup was not uploaded');
  await page.unroute('**/packages/ui/account.js');
  return {cloudNewerDisplayed:true,cloudReadBeforePush:true,localNewerUploaded:true,realAccountOrCloudUsed:false};
}
