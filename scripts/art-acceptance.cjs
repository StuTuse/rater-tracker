// Playwright CLI run-code; run on the fresh snapshot of the generated gallery.
async page => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.waitForFunction(() => document.images.length === 48 && Array.from(document.images).every(i => i.complete && i.naturalWidth > 0));
  const report = await page.evaluate(() => {
    const images = Array.from(document.images);
    const alpha = images.every(img => {
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      for (let p=3; p<pixels.length; p+=4) if (pixels[p] === 0) transparent++;
      // Permit a 1/255 alpha edge speck; require substantial truly transparent space.
      return transparent / (pixels.length / 4) > .05 && [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]].every(([x,y]) => ctx.getImageData(x,y,1,1).data[3] <= 1);
    });
    return { gallery48: images.length === 48, unique48: new Set(images.map(i => i.src)).size === 48, transparentBackground: alpha, noOverflow: document.documentElement.scrollWidth <= innerWidth };
  });
  await page.screenshot({ path: 'output/playwright/generated-gallery.png', fullPage: true });
  await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(() => window.raterReady);
  report.all51Decoded = await page.evaluate(async () => {
    const { ART_ASSETS } = await import('./src/art.js');
    const decoded = await Promise.all(ART_ASSETS.map(async path => { const i = new Image(); i.src=path; try { await i.decode(); return i.naturalWidth > 0; } catch { return false; } }));
    return decoded.length === 51 && decoded.every(Boolean);
  });
  report.illustrationsTransparent = await page.evaluate(async () => {
    const { ART } = await import('./src/art.js');
    const checks = await Promise.all([ART.task, ART.ledger].map(async path => {
      const img = new Image(); img.src=path; await img.decode();
      const canvas=document.createElement('canvas'); canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d', { willReadFrequently:true }); ctx.drawImage(img,0,0);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let transparent=0; for(let p=3;p<data.length;p+=4) if(data[p]===0) transparent++;
      return transparent/(data.length/4)>.05 && [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]].every(([x,y])=>ctx.getImageData(x,y,1,1).data[3]<=1);
    }));
    return checks.every(Boolean);
  });
  await page.getByRole('button', { name: '奖励中心', exact: true }).click();
  await page.locator('[data-action="badge-detail"]').first().click();
  await page.locator('.badge-detail img').evaluate(i => i.decode());
  report.detailUsesGeneratedArt = await page.locator('.badge-detail img').evaluate(i => i.src.includes('/assets/generated/badges/') && i.naturalWidth > 0);
  await page.screenshot({ path: 'output/playwright/generated-detail.png', fullPage: true });
  await page.getByRole('button', { name: '继续成长', exact: true }).click();
  await page.getByRole('button', { name: '今日', exact: true }).click();
  console.log(JSON.stringify(report, null, 2));
  if (Object.values(report).some(v => v !== true)) throw new Error('Generated art acceptance failed: ' + JSON.stringify(report));
  return report;
}
