const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
  await p.screenshot({ path: 'out/site_full.jpg', fullPage: true, type: 'jpeg', quality: 70 });
  // walk the app
  await p.locator('#app').scrollIntoViewIfNeeded();
  const shots = [];
  await p.click('[data-screen=learn]'); await p.fill('#msg', '4/6'); await p.click('#composer button'); await p.waitForTimeout(200);
  await p.locator('.device').screenshot({ path: 'out/app_learn.png' });
  await p.click('#quick .chip >> nth=0'); await p.click('#quick .chip >> nth=0'); await p.waitForTimeout(100);
  await p.click('.seg button[data-m=generic]'); await p.click('#quick .chip >> nth=0'); await p.locator('.device').screenshot({ path: 'out/app_generic.png' });
  for (const s of ['feed', 'checkin', 'clusters', 'mentors', 'teacher', 'future']) {
    await p.click(`[data-screen=${s}]`);
    if (s === 'clusters') { await p.click('#run'); await p.waitForTimeout(1800); }
    if (s === 'checkin') { await p.click('.mood >> nth=3'); await p.fill('#ci-text', 'someone hurt me'); await p.click('#ci-form button'); }
    await p.waitForTimeout(150);
    await p.locator('.app-stage').screenshot({ path: `out/app_${s}.png` });
  }
  await p.click('[data-screen=profile]'); await p.locator('.app-stage').screenshot({ path: 'out/app_profile.png' });
  // mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  m.on('pageerror', e => errs.push('mobile: ' + e.message));
  await m.goto('http://localhost:8765/index.html'); await m.waitForTimeout(400);
  await m.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  await m.screenshot({ path: 'out/site_mobile.jpg', fullPage: true, type: 'jpeg', quality: 60 });
  console.log('mobile scrollWidth', sw, 'errors', JSON.stringify(errs));
  await b.close();
})();
