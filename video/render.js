// Render the GranthAI demo video.
//   node video/render.js stills s04_compare:3,s04_compare:20   -> out/stills/*.jpg
//   node video/render.js scenes [id,id,...]                   -> out/scenes/<id>.mp4
// Serve the repo root first: python3 -m http.server 8766 (from the granth folder).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const FPS = 30, BASE = 'http://localhost:8766/video/video.html' + (process.env.VO ? '?vo=' + process.env.VO : '');

async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  await p.goto(BASE); await p.waitForFunction(() => window.V);
  const ids = await p.evaluate(() => V.init());
  await p.evaluate(() => document.fonts.ready);
  return { p, ids };
}

async function renderScene(p, id) {
  const total = await p.evaluate(id => V.setup(id), id);
  await p.waitForTimeout(250); // images decode
  const n = Math.round(total * FPS);
  fs.mkdirSync('out/scenes', { recursive: true });
  const tmp = `out/scenes/${id}.tmp.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp]);
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  const stage = await p.$('#stage');
  for (let f = 0; f < n; f++) {
    await p.evaluate(t => V.seek(t), f / FPS);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await done;
  fs.renameSync(tmp, `out/scenes/${id}.mp4`);
  return { id, total, frames: n };
}

(async () => {
  const [mode, arg] = process.argv.slice(2);
  const browser = await chromium.launch();
  if (mode === 'stills') {
    const { p } = await page(browser); fs.mkdirSync('out/stills', { recursive: true });
    for (const item of arg.split(',')) {
      const [id, t] = item.split(':');
      await p.evaluate(id => V.setup(id), id); await p.waitForTimeout(200);
      await p.evaluate(t => V.seek(t), +t);
      await (await p.$('#stage')).screenshot({ path: `out/stills/${id}_${t}.jpg`, type: 'jpeg', quality: 80 });
    }
  } else {
    const first = await page(browser);
    const ids = arg ? arg.split(',') : first.ids;
    const pages = [first.p, (await page(browser)).p, (await page(browser)).p];
    const queue = [...ids]; const meta = [];
    await Promise.all(pages.map(async p => { while (queue.length) { const id = queue.shift(); const m = await renderScene(p, id); console.log(m.id, m.total.toFixed(2), m.frames); meta.push(m); } }));
    fs.writeFileSync('out/scenes/meta.json', JSON.stringify(meta, null, 1));
  }
  await browser.close();
})();
