// Real-browser check for smooth, non-blinking star changes and rapid corrections.
async page => {
  const report = {};
  await page.reload(); await page.evaluate(() => window.raterReady);
  const original = await page.evaluate(async () => {
    const { openStore } = await import('./src/storage.js'), db = await openStore(), state = await db.read(); db.close(); return state;
  });
  try {
    await page.evaluate(async () => {
      const core = await import('./src/core.js'), { openStore } = await import('./src/storage.js');
      const db = await openStore(), old = await db.read(), date = core.hongKong().date;
      const state = core.transact(core.createState(), { id: 'star-motion-probe', type: 'rate', dimension: 'study', date, stars: 2 }, new Date().toISOString());
      state.revision = old.revision + 1; await db.write(state, old.revision); db.close(); await window.raterReload();
      window.__starMotionProbe = { originalAnimate: Element.prototype.animate, frames: [] };
      Element.prototype.animate = function (frames, options) {
        if (this.closest?.('.star-button')) window.__starMotionProbe.frames.push({
          stars: this.closest('.star-button').dataset.stars,
          frames: frames.map(frame => ({ ...frame })), options: { ...options }, visibleBefore: getComputedStyle(this).transform
        });
        return window.__starMotionProbe.originalAnimate.call(this, frames, options);
      };
    });
    const star = n => page.locator(`.star-button[data-dimension="study"][data-stars="${n}"]`);
    const clickAndCommit = async n => {
      await star(n).click();
      await page.waitForFunction(n => document.querySelector(`.star-button[data-dimension="study"][data-stars="${n}"]`).getAttribute('aria-pressed') === 'true', n);
    };
    await clickAndCommit(5);
    await page.waitForTimeout(50);
    await clickAndCommit(3);
    await page.waitForTimeout(30);
    report.transitionsUseTransformOnly = await page.evaluate(() => {
      const changed = window.__starMotionProbe.frames;
      return changed.length === 5 && changed.every(item => item.frames.length >= 3 && item.frames.every(frame => frame.opacity === undefined) && item.frames.every(frame => typeof frame.transform === 'string'));
    });
    report.opacityRemainsStable = await page.evaluate(() => {
      const svg = document.querySelector('.star-button[data-dimension="study"][data-stars="3"] svg');
      return getComputedStyle(svg).opacity === '1' && svg.getAnimations().every(animation => animation.effect.getKeyframes().every(frame => frame.opacity === undefined));
    });
    report.rapidCorrectionContinuesVisibleTransform = await page.evaluate(() => {
      const changed = window.__starMotionProbe.frames, next = changed.at(-2);
      return changed.length === 5 && next?.frames?.length >= 3 && next.options.duration > 0
        && /^matrix/.test(next.frames[0].transform) && !new DOMMatrix(next.frames[0].transform).isIdentity;
    });
    report.savedStarStateMatchesAnimation = await star(3).evaluate(b => b.classList.contains('lit') && b.getAttribute('aria-pressed') === 'true')
      && await page.locator('.star-button.lit[data-dimension="study"]').count() === 3;
    await page.screenshot({ path: 'output/playwright/star-motion-final.png', fullPage: true });
  } finally {
    await page.evaluate(async original => {
      if (window.__starMotionProbe) Element.prototype.animate = window.__starMotionProbe.originalAnimate;
      delete window.__starMotionProbe;
      const { openStore } = await import('./src/storage.js'), db = await openStore(), current = await db.read();
      original.revision = current.revision + 1; await db.write(original, current.revision); db.close(); await window.raterReload();
    }, original);
  }
  console.log(JSON.stringify(report, null, 2));
  if (Object.values(report).some(value => value !== true)) throw new Error('Star motion acceptance failed: ' + JSON.stringify(report));
  return report;
}
