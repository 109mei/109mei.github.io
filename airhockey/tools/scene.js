// 場面を作って、決まったコマ数だけ進めてから撮る：node tools/scene.js 出力.png "準備の式" コマ数 [幅 高さ] [毎コマの式]
const { chromium, launchOpts } = require('./pw');
(async () => {
  const [out, setup, frames = 30, w = 390, h = 844, each] = process.argv.slice(2);
  const b = await chromium.launch(launchOpts());
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/index.html');
  await p.waitForTimeout(300);
  const r = await p.evaluate(({ setup, frames, each }) => {
    window.__hold = true;
    window.__t = window.__t || 10;
    const res = eval(setup);
    for (let i = 0; i < frames; i++) { if (each) eval(each); window.__t += 1 / 60; tick(1 / 60, window.__t); }
    return res;
  }, { setup, frames: +frames, each });
  await p.waitForTimeout(+(process.env.WAIT || 1200));
  await p.screenshot({ path: out });
  console.log('result', JSON.stringify(r), errs.length ? 'エラー: ' + errs.join(' / ') : 'エラーなし');
  await b.close();
})();
