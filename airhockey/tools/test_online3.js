// オンラインの行き違いのテスト（点検で見つかった件）：node tools/test_online3.js
const { chromium, launchOpts } = require('./pw');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8768', '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const b = await chromium.launch(launchOpts(['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows']));
  const ctx = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  await ctx.addInitScript({ content: fs.readFileSync(__dirname + '/mockpeer.js', 'utf8') + ';window.__netLag=120;' });
  await ctx.route(/peerjs/, r => r.abort());
  const errs = [];
  const open = async url => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(url); return p; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (p, expr, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(expr)) return true; await wait(50); } return false; };
  const out = [], ok = (n, pass, info) => out.push((pass ? '〇 ' : '× ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  const base = 'http://127.0.0.1:8768/index.html';
  const host = await open(base);
  await host.evaluate(() => { Acts.online(); Acts.createRoom(); });
  await until(host, `/^[A-Z0-9]{4}$/.test($('#room-code').textContent)`);
  const code = await host.evaluate(() => Net.code);
  // 全角・小文字で入力しても参加できる
  const guest = await open(base);
  await guest.evaluate(c => { Acts.online(); const i = $('#code-in'); i.value = c.toLowerCase().replace(/[A-Z0-9]/gi, ch => String.fromCharCode(ch.charCodeAt(0) + 0xFEE0)); i.dispatchEvent(new Event('input')); }, code);
  ok('1 全角・小文字で入力しても、そろえられる', await guest.evaluate(c => $('#code-in').value === c, code), await guest.evaluate(() => $('#code-in').value));
  await guest.evaluate(() => Acts.joinRoom());
  ok('2 そのまま参加できる', await until(guest, `UI.screen === 'skill'`) && await until(host, `UI.screen === 'skill'`));
  ok('3 オンラインの技選びの「もどる」は「退出」と表示', await guest.evaluate(() => $('#s-skill .back').textContent === '退出'));
  await guest.evaluate(() => Acts.skillOk()); await host.evaluate(() => Acts.skillOk());
  await until(host, `UI.screen === 'stage'`);
  await host.evaluate(() => Acts.back());
  ok('4 ホストがステージ選びで「もどる」→ 技選びに戻るだけ（部屋は閉じない）', await host.evaluate(() => UI.screen === 'skill' && Net.role === 'host') && await guest.evaluate(() => Net.role === 'guest'));
  await host.evaluate(() => Acts.skillOk()); await until(host, `UI.screen === 'stage'`);
  await host.evaluate(() => { Sel.stage = 'pillars'; Acts.stageOk(); });
  await until(host, `Match.state === 'play'`, 8000); await until(guest, `Match.state === 'play'`);
  // 試合を終わらせる
  await host.evaluate(() => { Match.score = [6, 0]; const p = Physics.pucks[0]; p.x = Table.W / 2; p.y = 6; p.vx = 0; p.vy = -1.5 * Table.L; });
  await until(host, `UI.screen === 'result'`, 6000); await until(guest, `UI.screen === 'result'`, 3000);
  // 行き違い：ゲストが「もう一度」→ ホストが「もう一度」（start が飛ぶ）→ 届く前にゲストが「技とステージを変える」
  await guest.evaluate(() => { window.__overCount = 0; Events.on(t => { if (t === 'over') window.__overCount++; }); Acts.rematch(); });
  await wait(300);
  await host.evaluate(() => Acts.rematch());
  await guest.evaluate(() => Acts.changeSkill());
  await wait(1200);
  const st = { host: await host.evaluate(() => [UI.screen, Game.state, Net.phase]), guest: await guest.evaluate(() => [UI.screen, Game.state, Net.phase]) };
  ok('5 再戦と選び直しが行き違っても、両方とも技選びにそろう', st.host[0] === 'skill' && st.guest[0] === 'skill' && st.host[1] === 'menu' && st.guest[1] === 'menu', st);
  // 試合終了の音（出来事）がゲストで1回だけ
  await guest.evaluate(() => Acts.skillOk()); await host.evaluate(() => Acts.skillOk()); await until(host, `UI.screen === 'stage'`);
  await host.evaluate(() => { Acts.stageOk(); });
  await until(host, `Match.state === 'play'`, 8000);
  await guest.evaluate(() => { window.__overCount = 0; });
  await host.evaluate(() => { Match.score = [0, 6]; const p = Physics.pucks[0]; p.x = Table.W / 2; p.y = Table.L - 6; p.vx = 0; p.vy = 1.5 * Table.L; });
  await until(guest, `UI.screen === 'result'`, 6000); await wait(500);
  ok('6 ゲストで試合終了の出来事は1回だけ（ファンファーレが二重にならない）', await guest.evaluate(() => window.__overCount === 1), await guest.evaluate(() => window.__overCount));
  // 読み込みを待っている間に「もどる」→ あとで勝手にオンライン画面へ飛ばない
  const third = await open(base);
  await third.evaluate(() => { const real = Net.loadPeer.bind(Net); Net.loadPeer = () => new Promise(r => setTimeout(() => real().then(r), 800)); Acts.online(); $('#code-in').value = 'QQQQ'; Acts.joinRoom(); Acts.leaveLobby(); Acts.cpu(); });
  await wait(2500);
  ok('7 読み込み中に「もどる」でCPU戦へ進んでも、オンラインへ引き戻されない', await third.evaluate(() => UI.screen === 'skill' && UI.flow === 'cpu' && !Net.role && !Net.peer));
  let fails = 0;
  for (const l of out) { console.log(l); if (l.startsWith('×')) fails++; }
  console.log(errs.length ? 'ページのエラー: ' + errs.join(' / ') : 'ページのエラーなし');
  console.log(fails ? `失敗 ${fails} 件` : 'すべて合格');
  await b.close(); srv.kill();
})();
