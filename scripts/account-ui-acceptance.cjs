async page => {
  const assert = { equal: (actual, expected) => { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); }, ok: value => { if (!value) throw new Error('Account UI check failed'); } };
  page.setDefaultTimeout(7000);
  await page.addInitScript(() => {
    // UI-only fake transport; real Electron login is checked separately.
    window.desktop = {
      exportBackup: async contents => { if (window.uiAllowBackup === false) return false; window.uiBackup = contents; return true; },
      info: async () => ({ version: '0.1.0-alpha.8', dataDirectory: 'UI 验收隔离浏览器', packaged: false }),
      accountCurrent: async () => null,
      accountLogin: async () => ({ id: 'ui-account', name: 'rater_ui_test' }),
      accountRegister: async ({ email }) => ({ id: 'ui-challenge', email }),
      accountVerifyRegistration: async (id, code) => { if (code !== '123456') throw new Error('验证码不正确'); return { id: 'ui-account', name: 'rater_ui_test' }; },
      accountSync: async () => ({ version: 0, state: null }),
      accountLogout: async () => {}
    };
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.reload(); await page.evaluate(() => window.raterReady);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  assert.equal(await page.locator('#content .account-panel, #content [data-action=account-open]').count(), 0);
  await page.getByRole('button', { name: '登录或注册账号' }).click();
  assert.equal(await page.locator('#modal').getAttribute('data-kind'), 'account');
  await page.locator('#account-login input[name=password]').fill('Secret_test123');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#account-login input[name=password]').inputValue(), '');
  assert.equal(await page.locator('.account-entry').evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: '登录或注册账号' }).click();
  await page.locator('#account-login [name=username]').fill('rater_ui_test');
  await page.locator('#account-login [name=password]').fill('Secret_test123');
  await page.getByRole('button', { name: '清空输入', exact: true }).click();
  assert.equal(await page.locator('#account-login [name=username]').inputValue(), '');
  assert.equal(await page.locator('#account-login [name=password]').inputValue(), '');
  await page.getByRole('button', { name: '注册账号', exact: true }).click();
  const form = page.locator('#account-register');
  await form.locator('[name=username]').fill('rater_ui_test');
  await form.locator('[name=email]').fill('ui@example.com');
  await form.locator('[name=password]').fill('Secret_test123');
  await form.locator('[name=confirmation]').fill('Different_test123');
  await form.getByRole('button', { name: '发送验证码' }).click();
  assert.equal(await form.locator('[role=alert]').textContent(), '两次输入的密码不一致');
  await form.locator('[name=confirmation]').fill('Secret_test123');
  await page.screenshot({ path: 'output/playwright/account-register.png' });
  await form.getByRole('button', { name: '发送验证码' }).click();
  const verify = page.locator('#account-verify');
  await verify.locator('input').fill('000000'); await verify.getByRole('button', { name: '验证并登录' }).click();
  assert.equal(await verify.locator('[role=alert]').textContent(), '验证码不正确');
  await verify.locator('input').fill('123456'); await verify.getByRole('button', { name: '验证并登录' }).click();
  await page.locator('[data-action=account-logout]').waitFor();
  assert.equal(await page.locator('.account-entry-text strong').textContent(), 'rater_ui_test');
  assert.ok((await page.locator('.account-entry-text>span').textContent()).includes('••••'));
  assert.equal((await page.locator('body').innerText()).includes('Secret_test123'), false);
  const retained = await page.evaluate(async () => {
    const {openStore}=await import('./src/storage.js'), {transact,hongKong}=await import('./src/core.js');
    const store=await openStore('ui-account'), before=await store.read();
    const next=transact(before,{type:'rate',id:crypto.randomUUID(),date:hongKong().date,dimension:'life',stars:5});
    await store.write(next,before.revision);store.close();return JSON.stringify(next);
  });
  await page.getByRole('button', { name: '清空本机账号数据', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await page.locator('.account-entry-text strong').textContent(), 'rater_ui_test');
  await page.getByRole('button', { name: '打开账号中心', exact: true }).click();
  await page.evaluate(() => { window.uiAllowBackup = false; });
  await page.getByRole('button', { name: '清空本机账号数据', exact: true }).click();
  await page.getByRole('button', { name: '备份并清空', exact: true }).click();
  await page.locator('[data-action=account-clear-data]').waitFor();
  assert.equal(await page.locator('.account-entry-text strong').textContent(), 'rater_ui_test');
  assert.equal(await page.evaluate(async () => { const {openStore}=await import('./src/storage.js'); const store=await openStore('ui-account');const state=await store.read();store.close();return JSON.stringify(state); }), retained);
  await page.evaluate(() => { window.uiAllowBackup = true; });
  await page.getByRole('button', { name: '清空本机账号数据', exact: true }).click();
  await page.getByRole('button', { name: '备份并清空', exact: true }).click();
  await page.locator('#account-login').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('rater-active-account')), null);
  assert.equal(await page.evaluate(() => JSON.stringify(JSON.parse(window.uiBackup).state)), retained);
  assert.equal(await page.evaluate(async () => { const {openStore}=await import('./src/storage.js'); const store=await openStore('ui-account'); const state=await store.read();store.close();return state.ledger.length; }), 0);
  await page.locator('#account-login [name=username]').fill('rater_ui_test');
  await page.locator('#account-login [name=password]').fill('Secret_test123');
  await page.locator('#account-login button[type=submit]').click();
  await page.locator('[data-action=account-logout]').waitFor();
  await page.getByRole('button', { name: '退出账号', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#account-login').waitFor();
  assert.equal(await page.locator('.account-entry').isVisible(), true);
  const bounds = await page.locator('#modal').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y >= 0 && bounds.y + bounds.height <= 844);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: 'output/playwright/account-login-mobile.png' });
  await page.keyboard.press('Escape');
  const report = { settingsAccountRemoved: true, clearInput: true, clearLocalData: true, clearCancelled: true, backupCancellationPreservesData: true, latestBackupSaved: true, accountDialog: true, registrationTabs: true, passwordClearedOnClose: true, focusRestored: true, mismatchRejected: true, codeRetry: true, sidebarMasked: true, logout: true, narrowViewport: true, transport: 'mock for UI only' };
  console.log(JSON.stringify(report)); return report;
}
