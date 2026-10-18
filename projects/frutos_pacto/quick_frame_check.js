// Captura rápida de fotogramas sueltos a resolución nativa (1080x1920) para
// QA de layout, sin esperar al render completo del vídeo.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const root = path.resolve(__dirname, '..', '..');
  const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf-8'));
  const runtimeSource = fs.readFileSync(path.join(root, 'engine', 'timeline_runtime.js'), 'utf-8');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.warn('[Browser]', msg.text()); });

  await page.goto('file://' + path.join(root, 'engine', 'base_template.html'), { waitUntil: 'domcontentloaded' });
  await page.evaluate((payload) => {
    window.__TIMELINE__ = payload.timeline;
    window.__RUNTIME_READY__ = false;
    window.__RENDER_QUALITY__ = 'final';
    window.__PARTICLE_LIMIT__ = 400;
  }, { timeline });
  await page.addScriptTag({ content: runtimeSource });
  await page.waitForFunction(() => window.__RUNTIME_READY__ === true, { timeout: 15000 });

  const times = process.argv.slice(2).map(Number);
  const outDir = path.join(__dirname, 'control_frames');
  fs.mkdirSync(outDir, { recursive: true });
  for (const t of times) {
    await page.evaluate((tt) => { window.__ENGINE__.seekTo(tt); }, t);
    await page.waitForTimeout(30);
    const file = path.join(outDir, `native_${t}.png`);
    await page.screenshot({ path: file });
    console.log('saved', file);
  }
  await browser.close();
})();
