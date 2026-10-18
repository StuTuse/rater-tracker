const { app, BrowserWindow, protocol, net, ipcMain, dialog, shell, Menu, safeStorage } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../..');
const accountSmoke = process.argv.includes('--account-smoke');
const smoke = process.argv.includes('--smoke') || accountSmoke;
const isolatedAcceptance = process.argv.includes('--acceptance-hold');
const smokeDirectory = path.join(root, 'runtime-data', 'desktop-smoke');
if (smoke || isolatedAcceptance) app.setPath('userData', process.env.RATER_TEST_DATA ? path.resolve(process.env.RATER_TEST_DATA) : path.join(app.getPath('temp'), `rater-smoke-${Date.now()}`));
else if (process.env.RATER_DEV_DIRECTORY) app.setPath('userData', path.resolve(process.env.RATER_DEV_DIRECTORY));
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
      const allowed = url.hostname === 'rater' && (file === path.join(root, 'index.html') || ['src', 'assets', 'packages'].some(dir => file.startsWith(path.join(root, dir) + path.sep)));
      return allowed ? net.fetch(pathToFileURL(file).href) : new Response('Forbidden', { status: 403 });
    });
    const secure = handler => async (event, ...args) => {
      if (event.senderFrame !== event.sender.mainFrame || !event.senderFrame.url.startsWith('app://rater/')) throw new Error('Unsupported sender');
      return handler(...args);
    };
    const accounts = require('./account.cjs')(app.getPath('userData'), safeStorage);
    ipcMain.handle('account:current', secure(() => accounts.current()));
    ipcMain.handle('account:login', secure((name, password) => accounts.login(name, password)));
    ipcMain.handle('account:register', secure(values => accounts.register(values)));
    ipcMain.handle('account:verify-registration', secure((id, code) => accounts.verifyRegistration(id, code)));
    ipcMain.handle('account:logout', secure(() => accounts.logout()));
    ipcMain.handle('account:sync', secure(data => accounts.sync(data)));
    ipcMain.handle('desktop:info', secure(() => ({ version: app.getVersion(), dataDirectory: app.getPath('userData'), packaged: app.isPackaged })));
    ipcMain.handle('desktop:open-data', secure(() => shell.openPath(app.getPath('userData'))));
    ipcMain.handle('desktop:export', secure(async (contents, suggestedName) => {
      if (typeof contents !== 'string' || Buffer.byteLength(contents) > 64 * 1024 * 1024) throw new Error('备份大小无效');
      if (accountSmoke && process.env.RATER_ACCOUNT_CLEAR_SMOKE === '1') {
        await fs.writeFile(path.join(app.getPath('userData'), 'clear-account-backup.json'), contents, 'utf8'); return true;
      }
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
    const firstPaint = smoke ? new Promise(resolve => window.once('ready-to-show', resolve)) : null;
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('app://rater/')) event.preventDefault(); });
    window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    if (smoke) {
      // The inactive test window may be occluded; keep its renderer painting for capture.
      window.webContents.setBackgroundThrottling(false);
      window.showInactive();
    }
    await window.loadURL('app://rater/index.html');
    if (accountSmoke) {
      try {
        const credentials = JSON.parse(await fs.readFile(process.env.RATER_ACCOUNT_TEST_FILE || path.join(root, 'runtime-data/cloud-test/account.json'), 'utf8'));
        const report = await window.webContents.executeJavaScript(`(async () => {
          await window.raterReady;
          document.querySelector('[data-page="settings"]').click();
          document.querySelector('[data-action="account-open"]').click();
          const form = document.querySelector('#account-login');
          if (form) {
            form.username.value = ${JSON.stringify(credentials.username)};
            form.password.value = ${JSON.stringify(credentials.password)};
            form.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
          }
          const start=Date.now();
          while (!document.querySelector('[data-action="account-logout"]') || !document.querySelector('#sync-status')?.textContent.includes('已同步')) {
            if (Date.now()-start>35000) throw new Error(document.querySelector('#sync-status')?.textContent || '登录超时');
            await new Promise(resolve=>setTimeout(resolve,100));
          }
          const before=await window.desktop.accountCurrent();
          const cloud=await window.desktop.accountSync({type:'pull'});
          const storage=await import('./src/storage.js');const core=await import('./src/core.js');
          const store=await storage.openStore(before.id);const state=await store.read();store.close();
          await new Promise(resolve=>setTimeout(resolve,320));
          const rect=document.querySelector('#modal').getBoundingClientRect();
          return { login:true, synchronized:true, xp:core.totalUnits(state)/core.SCALE, cloudVersion:cloud.version, accountIsolated:before.id.length>0, passwordFormRemoved:!document.querySelector('#account-login'), sidebarAccount:document.querySelector('.account-entry-text strong').textContent===before.name, passwordMasked:document.querySelector('.account-entry-text>span').textContent.includes('••••'), accountDialog:document.querySelector('#modal').open && document.querySelector('#modal').dataset.kind==='account', accountDialogCentered:Math.abs(rect.x+rect.width/2-innerWidth/2)<2 && Math.abs(rect.y+rect.height/2-innerHeight/2)<2 };
        })()`);
        report.encryptedSession = safeStorage.isEncryptionAvailable() && (await fs.stat(path.join(app.getPath('userData'), 'account-session.bin'))).size > 0;
        if (!report.accountDialogCentered) throw new Error('账号弹窗未居中');
        if (process.env.RATER_ACCOUNT_CLEAR_SMOKE === '1') {
          Object.assign(report, await window.webContents.executeJavaScript(`(async () => {
            const account=await window.desktop.accountCurrent();
            const storage=await import('./src/storage.js');
            const store=await storage.openStore(account.id), before=JSON.stringify(await store.read());store.close();
            const cloudBefore=JSON.stringify(await window.desktop.accountSync({type:'pull'}));
            document.querySelector('[data-action="account-clear-data"]').click();
            document.querySelector('#confirm-action').click();
            const start=Date.now();
            while (!document.querySelector('#account-login')) {
              if (Date.now()-start>15000) throw new Error('清空本机账号数据超时');
              await new Promise(resolve=>setTimeout(resolve,100));
            }
            const retained=await storage.openStore(account.id), after=JSON.stringify(await retained.read());retained.close();
            const cleared=JSON.parse(after);
            const result={ clearLogin:await window.desktop.accountCurrent()===null, rememberedAccountRemoved:localStorage.getItem('rater-active-account')===null, localAccountCleared:cleared.ledger.length===0 && cleared.revision===0, settingsAccountRemoved:!document.querySelector('#content [data-action="account-open"]') };
            const restored=await window.desktop.accountLogin(${JSON.stringify(credentials.username)},${JSON.stringify(credentials.password)});
            result.cloudRecordsRetained=cloudBefore===JSON.stringify(await window.desktop.accountSync({type:'pull'}));
            await window.desktop.accountLogout();
            if (Object.values(result).some(value=>value!==true)) throw new Error('清空本机账号数据检查失败');
            return result;
          })()`));
          report.sessionFileRemoved = await fs.stat(path.join(app.getPath('userData'), 'account-session.bin')).then(() => false, error => { if (error.code === 'ENOENT') return true; throw error; });
          if (!report.sessionFileRemoved) throw new Error('登录会话文件仍存在');
          const backup = JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'clear-account-backup.json'), 'utf8'));
          report.backupSaved = backup.application === 'rater-tracker' && backup.state.ledger.length > 0;
          if (!report.backupSaved) throw new Error('清空前备份检查失败');
        }
        await new Promise(resolve => setTimeout(resolve, 1200));
        const directory = process.env.RATER_SMOKE_OUTPUT || path.join(root, 'output/desktop'); await fs.mkdir(directory, { recursive:true });
        await fs.writeFile(path.join(directory, 'account-smoke.json'), JSON.stringify(report,null,2));
        await fs.writeFile(path.join(directory, 'account-smoke.png'), (await window.webContents.capturePage()).toPNG());
        console.log(JSON.stringify(report)); app.exit(0);
      } catch(error) { console.error(error.message); app.exit(1); }
      return;
    }
    if (smoke) {
      try {
        await firstPaint;
        // capturePage needs a submitted compositor frame, beyond DOM readiness.
        await new Promise(resolve => setTimeout(resolve, 150));
        const directory = process.env.RATER_SMOKE_OUTPUT ? path.resolve(process.env.RATER_SMOKE_OUTPUT) : smokeDirectory;
        await fs.mkdir(directory, { recursive: true });
        const startup = await window.webContents.executeJavaScript(`(async () => {
          const splash=document.querySelector('#startup'),image=splash?.querySelector('img');
          if(!splash||!image)return {startupBackgroundMatches:false,startupIdentity:false,startupCreator:false,startupBlocksInput:false};
          await image.decode();
          const rect=splash.getBoundingClientRect(),icon=image.getBoundingClientRect(),title=splash.querySelector('h1').getBoundingClientRect(),brand=splash.querySelector('strong'),word=brand.getBoundingClientRect();
          const centered=r=>Math.abs(r.x+r.width/2-innerWidth/2)<2;
          return {startupBackgroundMatches:getComputedStyle(splash).backgroundColor==='rgb(250, 248, 239)'&&getComputedStyle(splash).backgroundColor===getComputedStyle(document.documentElement).backgroundColor&&rect.width===innerWidth&&rect.height===innerHeight,
            startupIdentity:image.naturalWidth>0&&centered(icon)&&centered(title)&&title.top>icon.bottom&&splash.querySelector('h1').textContent==='Rater & Tracker',
            startupCreator:brand.textContent==='TuseCreation'&&Number(getComputedStyle(brand).fontWeight)>=800&&centered(word)&&word.top>innerHeight*.8,
            startupBlocksInput:document.querySelector('#app').inert&&getComputedStyle(document.querySelector('#app')).visibility==='hidden'};
        })()`);
        await fs.writeFile(path.join(directory, 'startup.png'), (await window.webContents.capturePage()).toPNG());
        const report = await window.webContents.executeJavaScript(`(async () => {
          await window.raterReady;
          const startupDismissed=!document.querySelector('#startup')&&!document.querySelector('#app').inert&&!document.body.classList.contains('is-starting');
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
          document.querySelector('[data-action="account-open"]').click();await pause(350);
          const login=document.querySelector('#account-login');login.username.value='motion_draft';login.password.value='Transient_test123';
          const loginHeight=modal.getBoundingClientRect().height;
          document.querySelector('[data-action="account-register-tab"]').click();await pause(100);
          const accountFrameMorph=getComputedStyle(modal).opacity==='1'&&modal.getBoundingClientRect().height>loginHeight&&modal.getBoundingClientRect().height<parseFloat(modal.style.height);
          await pause(400);const registration=document.querySelector('#account-register');registration.email.value='motion@example.com';
          document.querySelector('[data-action="account-login-tab"]').click();await pause(480);
          const accountDraftsPreserved=login===document.querySelector('#account-login')&&login.username.value==='motion_draft'&&login.password.value==='Transient_test123'&&document.querySelector('#account-register').email.value==='motion@example.com';
          const exitWidth=modal.offsetWidth,exitHeight=modal.offsetHeight;
          modal.querySelector('[data-action="close-modal"]').click();await pause(40);
          const accountExitStable=modal.dataset.kind==='account'&&modal.offsetWidth===exitWidth&&modal.offsetHeight===exitHeight&&login.password.value==='Transient_test123';
          await pause(340);const accountSecretsCleared=login.password.value===''&&getComputedStyle(modal).display==='none';
          const entries=[];let pageEntryLiftAndFade=true,pageEntry48Badges=false,pageEntryFourSettings=false;
          for(const id of ['tasks','history','rewards','settings','today']){
            document.querySelector('[data-page="'+id+'"]').click();
            const animations=document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a.id==='page-enter');entries.push(animations.length>0);
            animations.forEach(a=>{a.pause();a.currentTime=a.effect.getTiming().delay+120;});
            pageEntryLiftAndFade&&=animations.every(a=>{const style=getComputedStyle(a.effect.target);return Number(style.opacity)>0&&Number(style.opacity)<1&&style.translate!=='none';});
            if(id==='rewards')pageEntry48Badges=animations.filter(a=>a.effect.target.matches('.badge-card')).length===48;
            if(id==='settings')pageEntryFourSettings=animations.filter(a=>a.effect.target.matches('.panel')).length===4;
            animations.forEach(a=>a.play());
          }
          await pause(550);const pageEntryAllFive=entries.length===5&&entries.every(Boolean);
          const phases=await import('./src/growth-stages.js'),growth=document.querySelector('#growth');
          const currentStageMatches=Number(growth.dataset.stage)===phases.growthStage(core.levelAt(core.totalUnits(reloaded)).level).id;
          const probe=growth.cloneNode(true);probe.setAttribute('aria-hidden','true');probe.style.position='fixed';probe.style.top='-9000px';probe.style.visibility='hidden';document.body.append(probe);
          const layouts=[],patterns=[];
          for(const phase of phases.GROWTH_STAGES){phases.paintStage(probe,phase.from);const box=probe.querySelector('.level-emblem').getBBox();layouts.push(box.width>20&&box.height>20);patterns.push(getComputedStyle(probe.querySelector('.xp-fluid i')).animationName);}
          probe.remove();const tenStageEmblemsRender=layouts.length===10&&layouts.every(Boolean),tenStageFlowPatterns=new Set(patterns).size===10;
          return { startupDismissed, title:document.title, origin:location.origin, nodeIsolated:typeof require==='undefined', persisted:core.totalUnits(reloaded), backupRestored:valid, conflictRejected:conflict, assetLoaded:assets.every(Boolean) && generatedAssets.every(Boolean) && badgeAssets.every(Boolean), generatedAssetCount:generatedAssets.filter(Boolean).length, badgeAssetCount:badgeAssets.filter(Boolean).length, liquidLightMoving, xpTextReadable, customMenuInModal, customSelectCommitted, modalExitAnimated, segmentedAnimated, customCalendarVisible, scrollbarHidden, accountFrameMorph, accountDraftsPreserved, accountExitStable, accountSecretsCleared, pageEntryAllFive, pageEntryLiftAndFade, pageEntry48Badges, pageEntryFourSettings, currentStageMatches, tenStageEmblemsRender, tenStageFlowPatterns, motionMode:document.documentElement.dataset.motion, view:document.querySelector('main')?.innerText.slice(0,150), revision: reloaded.revision };
        })()`);
        Object.assign(report,startup);
        try {
          Object.assign(report, await window.webContents.executeJavaScript(`(async()=>{
            const c=await import('./src/core.js'),storage=await import('./src/storage.js'),notices=await import('./src/notices.js');
            const db=await storage.openStore(),original=await db.read(),stamp=new Date().toISOString(),date=c.hongKong(stamp).date;
            window.raterSmokeRestore=async()=>{const latest=await db.read();await db.write(original,latest.revision);db.close();await window.raterReload();};
            let fixture=c.createState();
            for(let i=19;i>=1;i--)fixture=c.transact(fixture,{id:'notice-fixture-'+i,type:'rate',date:c.addDays(date,-i),dimension:'study',stars:5},stamp);
            fixture=c.transact(fixture,{id:'notice-today',type:'rate',date,dimension:'study',stars:4},stamp);fixture.revision=original.revision+1;
            await db.write(fixture,original.revision);await window.raterReload();
            document.querySelector('[data-dimension=study][data-stars="5"]').click();
            for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,40));if(document.querySelector('#modal').open&&document.querySelector('#modal').dataset.kind==='award')break;}
            const modal=document.querySelector('#modal'),image=modal.querySelector('.award-image');if(!image)throw new Error('No saved badge notice');await image.decode();
            await new Promise(r=>setTimeout(r,300));
            const actual=await db.read(),expected=c.transact(fixture,{id:'notice-expected',type:'rate',date,dimension:'study',stars:5},stamp);
            const badgeAwardSaved=modal.open&&modal.dataset.kind==='award'&&modal.querySelector('#award-count').textContent==='1 / 2'&&image.naturalWidth>0;
            const badgeConfettiFinite=modal.querySelectorAll('.award-confetti i').length===36&&modal.querySelector('.award-confetti').getAnimations({subtree:true}).every(a=>a.effect.getComputedTiming().iterations===1);
            const badgeNoExtraXP=c.totalUnits(actual)===c.totalUnits(expected);
            const title=document.querySelector('.top-kicker').getBoundingClientRect(),line=document.querySelector('#launch-line'),rect=line.getBoundingClientRect();
            const launchLineOnTop=notices.LAUNCH_LINES.includes(line.textContent)&&rect.left>title.right&&!line.closest('.sidebar');
            return {badgeAwardSaved,badgeConfettiFinite,badgeNoExtraXP,launchLineOnTop};
          })()`));
          await fs.writeFile(path.join(directory, 'badge-award.png'), (await window.webContents.capturePage()).toPNG());
        } finally {
          await window.webContents.executeJavaScript(`(async()=>{if(window.raterSmokeRestore){await window.raterSmokeRestore();delete window.raterSmokeRestore;}})()`);
          await new Promise(resolve=>setTimeout(resolve,350));
        }
        await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify({ ...report, version: app.getVersion(), packaged: app.isPackaged, userData: app.getPath('userData') }, null, 2));
        await new Promise(resolve => setTimeout(resolve, 1200));
        await fs.writeFile(path.join(directory, 'desktop.png'), (await window.webContents.capturePage()).toPNG());
        await window.webContents.executeJavaScript(`document.querySelector('[data-control-for="id:rating-date"]').click()`);
        await new Promise(resolve => setTimeout(resolve, 300));
        await fs.writeFile(path.join(directory, 'controls-calendar.png'), (await window.webContents.capturePage()).toPNG());
        await window.webContents.executeJavaScript(`(async () => { const {closeControlLayer}=await import('./src/controls.js');closeControlLayer({immediate:true});document.querySelector('[data-action="account-open"]').click();document.querySelector('[data-action="account-register-tab"]').click(); })()`);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fs.writeFile(path.join(directory, 'account-motion.png'), (await window.webContents.capturePage()).toPNG());
        app.exit(report.startupBackgroundMatches && report.startupIdentity && report.startupCreator && report.startupBlocksInput && report.startupDismissed && report.backupRestored && report.conflictRejected && report.nodeIsolated && report.assetLoaded && report.liquidLightMoving && report.xpTextReadable && report.customMenuInModal && report.customSelectCommitted && report.modalExitAnimated && report.segmentedAnimated && report.customCalendarVisible && report.scrollbarHidden && report.accountFrameMorph && report.accountDraftsPreserved && report.accountExitStable && report.accountSecretsCleared && report.pageEntryAllFive && report.pageEntryLiftAndFade && report.pageEntry48Badges && report.pageEntryFourSettings && report.currentStageMatches && report.tenStageEmblemsRender && report.tenStageFlowPatterns && report.badgeAwardSaved && report.badgeConfettiFinite && report.badgeNoExtraXP && report.launchLineOnTop ? 0 : 1);
      } catch (error) { console.error(error); app.exit(1); }
    }
  }).catch(error => { console.error(error); app.exit(1); });
}
app.on('window-all-closed', () => app.quit());
