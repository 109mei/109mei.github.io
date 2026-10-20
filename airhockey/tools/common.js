// テストの共通部分：ページを開いて、関数をページの中で実行する
const { chromium, launchOpts } = require('./pw');
exports.run = async (fn, arg, opts = {}) => {
  const b = await chromium.launch(launchOpts());
  const ctx = await b.newContext({ viewport: { width: opts.w || 390, height: opts.h || 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: opts.dpr || 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load|ERR_NAME|ERR_INTERNET/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/index.html');
  await p.waitForTimeout(200);
  const R = await p.evaluate(fn, arg);
  let fails = 0;
  for (const line of R) { console.log(line); if (line.startsWith('×')) fails++; }
  console.log(errs.length ? 'ページのエラー: ' + errs.slice(0, 5).join(' / ') : 'ページのエラーなし');
  console.log(fails ? `失敗 ${fails} 件` : 'すべて合格');
  await b.close();
  return { fails: fails + errs.length };
};
