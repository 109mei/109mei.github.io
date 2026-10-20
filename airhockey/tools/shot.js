// 使い方: node tools/shot.js 出力.png [幅 高さ] [実行する式]
const { chromium, launchOpts } = require('./pw');
(async () => {
  const [out, w = 390, h = 844, expr] = process.argv.slice(2);
  const b = await chromium.launch(launchOpts());
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/index.html');
  await p.waitForTimeout(500);
  if (expr) { const r = await p.evaluate(expr); console.log('result:', JSON.stringify(r)); await p.waitForTimeout(300); }
  await p.screenshot({ path: out });
  console.log(errs.length ? errs.join('\n') : 'エラーなし');
  await b.close();
})();
