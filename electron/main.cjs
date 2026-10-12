const { app, BrowserWindow, protocol, net, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const smoke = process.argv.includes('--smoke');
const isolatedAcceptance = process.argv.includes('--acceptance-hold');
const smokeDirectory = path.join(root, 'runtime-data', 'desktop-smoke');
if (smoke || isolatedAcceptance) app.setPath('userData', process.env.RATER_TEST_DATA ? path.resolve(process.env.RATER_TEST_DATA) : path.join(app.getPath('temp'), `rater-smoke-${Date.now()}`));
else app.setPath('userData', path.join(app.getPath('appData'), 'RaterTracker'));
app.setAppUserModelId('local.ratertracker.desktop');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const singleton = app.requestSingleInstanceLock();
let window;
if (!singleton) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    protocol.handle('app', request => {
      const url = new URL(request.url), file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      const allowed = url.hostname === 'rater' && (file === path.join(root, 'index.html') || ['src', 'assets'].some(dir => file.startsWith(path.join(root, dir) + path.sep)));
      return allowed ? net.fetch(pathToFileURL(file).href) : new Response('Forbidden', { status: 403 });
    });
    const secure = handler => async (event, ...args) => {
      if (event.senderFrame !== event.sender.mainFrame || !event.senderFrame.url.startsWith('app://rater/')) throw new Error('Unsupported sender');
      return handler(...args);
    };
    ipcMain.handle('desktop:info', secure(() => ({ version: app.getVersion(), dataDirectory: app.getPath('userData'), packaged: app.isPackaged })));
    ipcMain.handle('desktop:open-data', secure(() => shell.openPath(app.getPath('userData'))));
    ipcMain.handle('desktop:export', secure(async (contents, suggestedName) => {
      if (typeof contents !== 'string' || Buffer.byteLength(contents) > 64 * 1024 * 1024) throw new Error('备份大小无效');
      const result = await dialog.showSaveDialog(window, { title: '保存完整 JSON 备份', defaultPath: path.join(app.getPath('documents'), path.basename(String(suggestedName))), filters: [{ name: '完整 JSON 备份', extensions: ['json'] }] });
      if (result.canceled || !result.filePath) return false;
      // Atomic replacement in the user-selected directory.
      const temp = `${result.filePath}.${Date.now()}.tmp`;
      try { await fs.writeFile(temp, contents, 'utf8'); await fs.rename(temp, result.filePath); }
      catch (error) { await fs.rm(temp, { force: true }); throw error; }
      return true;
    }));
    ipcMain.handle('desktop:import', secure(async () => {
      const result = await dialog.showOpenDialog(window, { title: '选择完整 JSON 备份', properties: ['openFile'], filters: [{ name: '完整 JSON 备份', extensions: ['json'] }] });
      if (result.canceled) return null;
      const file = result.filePaths[0], stat = await fs.stat(file);
      if (stat.size > 64 * 1024 * 1024) throw new Error('备份超过 64 MB，本版本无法恢复');
      return fs.readFile(file, 'utf8');
    }));
    Menu.setApplicationMenu(null);
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 760, minHeight: 620, show: !smoke, backgroundColor: '#faf8ef', title: 'Rater & Tracker', icon: path.join(root, 'assets/app.png'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('app://rater/')) event.preventDefault(); });
    window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    if (smoke) {
      // The inactive test window may be occluded; keep its renderer painting for capture.
      window.webContents.setBackgroundThrottling(false);
      window.showInactive();
    }
    await window.loadURL('app://rater/index.html');
    if (smoke) {
      try {
        const report = await window.webContents.executeJavaScript(`(async () => {
          await window.raterReady;
          const core = await import('./src/core.js');
          const storage = await import('./src/storage.js');
          const store = await storage.openStore();
          const first = await store.read();
          let state = first;
          const stamp = new Date().toISOString();
          const date = core.hongKong(stamp).date;
          state = core.transact(state, {id:'desktop-smoke-rate', type:'rate', date, dimension:'study', stars:3}, stamp);
          await store.write(state, first.revision);
          const reloaded = await store.read();
          const restored = storage.parseBackup(storage.backupText(reloaded));
          const valid = core.totalUnits(restored) === core.totalUnits(reloaded);
          let conflict = false;
          try { await store.write(state, first.revision - 1); } catch(e) { conflict = e instanceof storage.ConflictError; }
          store.close();
          await window.raterReload();
          const assets = await Promise.all(Array.from(document.images).map(async i => { try { await i.decode(); return i.naturalWidth > 0; } catch { return false; } }));
          const { BADGES } = await import('./src/badges.js');
          const { ART_ASSETS, badgeArt } = await import('./src/art.js');
          const generatedAssets = await Promise.all(ART_ASSETS.map(async file => { const image = new Image(); image.src = file; try { await image.decode(); return image.naturalWidth > 0; } catch { return false; } }));
          const badgeAssets = await Promise.all(BADGES.map(async b => { const response = await fetch(badgeArt(b.id)); return response.ok; }));
          const light = document.querySelector('.xp-fluid i'), lightBefore = getComputedStyle(light).transform;
          await new Promise(resolve => { let frames = 0; const tick = () => ++frames === 12 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); });
          const liquidLightMoving = document.documentElement.dataset.motion === 'full' ? lightBefore !== getComputedStyle(light).transform : true;
          const xpTextReadable = parseFloat(getComputedStyle(document.querySelector('#xp-progress')).fontSize) >= 12;
          const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
          document.querySelector('[data-action="new-task"]').click();await pause(320);
          const modal=document.querySelector('#modal'), dimension=modal.querySelector('[name="dimension"]');
          modal.querySelector('[data-control-for="task-form:dimension"]').click();await pause(250);
          const menu=document.querySelector('.select-popover'), customMenuInModal=menu.closest('dialog')===modal&&menu.matches(':popover-open');
          menu.querySelector('[data-control-option="1"]').click();await pause(250);
          const customSelectCommitted=dimension.value==='study'&&new FormData(document.querySelector('#task-form')).get('dimension')==='study';
          modal.querySelector('[data-action="close-modal"]').click();await pause(35);
          const modalExitAnimated=!modal.open&&getComputedStyle(modal).display==='block';await pause(320);
          document.querySelector('[data-page="tasks"]').click();await pause(320);
          const indicator=document.querySelector('.segment-indicator');document.querySelector('[data-filter="completed"]').click();await pause(40);
          const segmentedAnimated=indicator===document.querySelector('.segment-indicator')&&indicator.getAnimations().some(a=>a.transitionProperty==='transform');await pause(320);
          document.querySelector('[data-page="today"]').click();
          document.querySelector('[data-control-for="id:rating-date"]').click();await pause(250);
          const customCalendarVisible=document.querySelector('.date-popover')?.matches(':popover-open')&&document.querySelector('.calendar-day.is-selected')?.dataset.calendarDate===date;
          const scrollbarHidden=getComputedStyle(document.documentElement).scrollbarWidth==='none';
          const {closeControlLayer}=await import('./src/controls.js');closeControlLayer({immediate:true});
          return { title:document.title, origin:location.origin, nodeIsolated:typeof require==='undefined', persisted:core.totalUnits(reloaded), backupRestored:valid, conflictRejected:conflict, assetLoaded:assets.every(Boolean) && generatedAssets.every(Boolean) && badgeAssets.every(Boolean), generatedAssetCount:generatedAssets.filter(Boolean).length, badgeAssetCount:badgeAssets.filter(Boolean).length, liquidLightMoving, xpTextReadable, customMenuInModal, customSelectCommitted, modalExitAnimated, segmentedAnimated, customCalendarVisible, scrollbarHidden, motionMode:document.documentElement.dataset.motion, view:document.querySelector('main')?.innerText.slice(0,150), revision: reloaded.revision };
        })()`);
        const directory = process.env.RATER_SMOKE_OUTPUT ? path.resolve(process.env.RATER_SMOKE_OUTPUT) : smokeDirectory;
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify({ ...report, version: app.getVersion(), packaged: app.isPackaged, userData: app.getPath('userData') }, null, 2));
        await new Promise(resolve => setTimeout(resolve, 1200));
        await fs.writeFile(path.join(directory, 'desktop.png'), (await window.webContents.capturePage()).toPNG());
        await window.webContents.executeJavaScript(`document.querySelector('[data-control-for="id:rating-date"]').click()`);
        await new Promise(resolve => setTimeout(resolve, 300));
        await fs.writeFile(path.join(directory, 'controls-calendar.png'), (await window.webContents.capturePage()).toPNG());
        app.exit(report.backupRestored && report.conflictRejected && report.nodeIsolated && report.assetLoaded && report.liquidLightMoving && report.xpTextReadable && report.customMenuInModal && report.customSelectCommitted && report.modalExitAnimated && report.segmentedAnimated && report.customCalendarVisible && report.scrollbarHidden ? 0 : 1);
      } catch (error) { console.error(error); app.exit(1); }
    }
  }).catch(error => { console.error(error); app.exit(1); });
}
app.on('window-all-closed', () => app.quit());
