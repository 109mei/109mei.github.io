// オンライン対戦のホストとゲストの画面を撮る：node tools/shot_online.js 出力フォルダ [ステージ]
const { chromium, launchOpts } = require('./pw');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const dir = process.argv[2], stage = process.argv[3] || 'warp';
  const srv = spawn('python3', ['-m', 'http.server', '8767', '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const b = await chromium.launch(launchOpts(['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows']));
  const mk = async (w, h) => { const c = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: w, height: h }, deviceScaleFactor: 2 }); await c.addInitScript({ content: fs.readFileSync(__dirname + '/mockpeer.js', 'utf8') }); await c.route(/peerjs/, r => r.abort()); return c; };
  // BroadcastChannel は同じブラウザの中なら別のコンテキストでも届かないので、同じコンテキストで2ページ開く
  const ctx = await mk(390, 844);
  const base = 'http://127.0.0.1:8767/index.html';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (p, expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(expr)) return true; await wait(50); } return false; };
  const host = await ctx.newPage(); await host.goto(base);
  await host.evaluate(() => { Acts.online(); Acts.createRoom(); });
  await until(host, `/^[A-Z0-9]{4}$/.test($('#room-code').textContent)`);
  const code = await host.evaluate(() => Net.code);
  const guest = await ctx.newPage(); await guest.setViewportSize({ width: 375, height: 667 }); await guest.goto(base + '?room=' + code);
  await until(guest, `UI.screen === 'skill'`); await until(host, `UI.screen === 'skill'`);
  await guest.evaluate(() => { Sel.skill = 'wall'; Acts.skillOk(); }); await host.evaluate(() => { Sel.skill = 'fast'; Acts.skillOk(); });
  await until(host, `UI.screen === 'stage'`);
  await guest.screenshot({ path: dir + '/on_guest_wait.png' });
  await host.evaluate(s => { Sel.stage = s; Acts.stageOk(); }, stage);
  await until(host, `Match.state === 'play'`); await until(guest, `Match.state === 'play'`);
  await host.evaluate(() => { const p = Physics.pucks[0]; p.vx = 0.7 * Table.L; p.vy = -1.2 * Table.L; Match.gauge = [1, 0.6]; Match.rally = 6; Skills.state.wall[1] = 3; });
  await wait(700);
  await host.screenshot({ path: dir + '/on_host.png' });
  await guest.screenshot({ path: dir + '/on_guest.png' });
  console.log('ok');
  await b.close(); srv.kill();
})();
