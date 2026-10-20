// 画面の大きさ・向きが変わったときのテスト：node tools/test_resize.js
const { chromium, launchOpts } = require('./pw');
(async () => {
  const b = await chromium.launch(launchOpts());
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/index.html');
  const out = [], ok = (n, pass, info) => out.push((pass ? '〇 ' : '× ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  const W0 = await p.evaluate(() => Table.W);
  await p.setViewportSize({ width: 430, height: 932 }); await p.waitForTimeout(300);
  const W1 = await p.evaluate(() => Table.W);
  const W1x = await p.evaluate(() => 1000 * Layout.vw / (Layout.vh - Layout.safe.t - Layout.safe.b));   // 上端に空ける幅（ノッチ・サイト名よけ）を除いた縦横比
  ok('1 メニュー中に画面が変わると、背景の台も作り直す', Math.abs(W1 - W1x) < 1 && W1 !== W0, { W0, W1, W1x });
  await p.evaluate(() => { Acts.cpu(); Acts.skillOk(); Acts.stageOk(); });
  await p.waitForTimeout(3500);
  const a = await p.evaluate(() => ({ W: Table.W, scale: Layout.scale, btn: $('#pause-btn').style.left }));
  await p.setViewportSize({ width: 932, height: 430 }); await p.waitForTimeout(400);
  const b2 = await p.evaluate(() => ({ W: Table.W, scale: Layout.scale, btn: $('#pause-btn').style.left, ox: Layout.ox, fits: Table.L * Layout.scale <= Layout.vh + 0.5, state: Match.state }));
  ok('2 試合中に横向きにしても、台の形は変えず画面に収め直す', b2.W === a.W && b2.scale < a.scale && b2.fits && b2.ox > 100, { a, b2 });
  ok('3 一時停止ボタンも台の角へ動く', b2.btn !== a.btn, [a.btn, b2.btn]);
  await p.setViewportSize({ width: 430, height: 932 }); await p.waitForTimeout(400);
  const c = await p.evaluate(() => ({ W: Table.W, scale: Layout.scale }));
  ok('4 縦に戻すと元の大きさ', Math.abs(c.scale - a.scale) < 1e-6 && c.W === a.W, c);
  await p.evaluate(() => { Match.score = [6, 0]; Match.state = 'play'; const q = Physics.pucks[0] || (Physics.pucks = [Physics.newPuck(0, 0)])[0]; q.x = Table.W / 2; q.y = 5; q.vy = -1 * Table.L; });
  await p.waitForTimeout(2600);
  ok('5 試合が終わると、次は新しい画面に合わせた台になる', await p.evaluate(() => UI.screen === 'result' && !Layout.locked));
  // 画面の切り替え（タブを隠す）で CPU 戦は一時停止
  await p.evaluate(() => { Acts.rematch(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  ok('6 アプリを切り替えると、CPU戦は一時停止', await p.evaluate(() => Match.paused && UI.screen === 'pause'));
  let fails = 0;
  for (const l of out) { console.log(l); if (l.startsWith('×')) fails++; }
  console.log(errs.length ? 'ページのエラー: ' + errs.join(' / ') : 'ページのエラーなし');
  console.log(fails ? `失敗 ${fails} 件` : 'すべて合格');
  await b.close();
})();
