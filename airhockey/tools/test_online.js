// オンライン対戦の流れのテスト（PeerJS のかわりにページどうしを直接つなぐ）：node tools/test_online.js
const { chromium, launchOpts } = require('./pw');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const b = await chromium.launch(launchOpts(['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows']));
  const ctx = await b.newContext({ hasTouch: true, isMobile: true, deviceScaleFactor: 1, viewport: { width: 390, height: 844 } });
  await ctx.addInitScript({ content: fs.readFileSync(__dirname + '/mockpeer.js', 'utf8') });
  await ctx.route(/peerjs/, r => r.abort());
  const errs = [];
  const open = async (url, w, h) => {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    p.on('pageerror', e => errs.push(url + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto(url);
    return p;
  };
  const out = [], ok = (n, pass, info) => out.push((pass ? '〇 ' : '× ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (p, expr, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(expr)) return true; await wait(50); } return false; };

  const base = 'http://127.0.0.1:8765/index.html';
  const host = await open(base, 390, 844);              // ホストは縦長の画面
  await host.evaluate(() => Acts.online());
  await host.evaluate(() => Acts.createRoom());
  ok('1 ホスト：部屋コードと招待リンクが出る', await until(host, `!$('#lobby-host').classList.contains('hidden') && /^[A-Z0-9]{4}$/.test($('#room-code').textContent)`));
  const code = await host.evaluate(() => Net.code), link = await host.evaluate(() => $('#invite-url').textContent);
  ok('2 招待リンクは今のページのURLから作る', link === base + '?room=' + code, link);

  const guest = await open(link, 360, 640);              // ゲストは別の縦横比の画面。招待リンクで開く
  ok('3 ゲスト：招待リンクを開くと、そのまま参加して必殺技を選ぶ画面へ', await until(guest, `UI.screen === 'skill'`, 6000));
  ok('4 ホストも必殺技を選ぶ画面へ', await until(host, `UI.screen === 'skill'`));
  ok('5 リンクの ?room= は消える（読み込み直しで入り直さない）', !(await guest.evaluate(() => location.search)));

  await guest.evaluate(() => { Sel.skill = 'split'; Acts.skillOk(); });
  ok('6 ゲスト：技を決めると、ホストのステージ選びを待つ', await until(guest, `UI.screen === 'wait'`));
  await host.evaluate(() => { Sel.skill = 'heavy'; Acts.skillOk(); });
  ok('7 ホスト：技を決めるとステージを選ぶ画面へ', await until(host, `UI.screen === 'stage'`));
  await host.evaluate(() => { Sel.stage = 'sweeper'; Acts.stageOk(); });
  ok('8 両方で試合が始まる', await until(host, `Game.state === 'match' && Match.mode === 'host'`) && await until(guest, `Game.state === 'match' && Match.mode === 'guest'`));
  const gInfo = await guest.evaluate(() => ({ flip: Layout.flip, W: Table.W, skills: Match.skill, stage: Match.stageId, me: Match.me }));
  const hInfo = await host.evaluate(() => ({ flip: Layout.flip, W: Table.W, skills: Match.skill, stage: Match.stageId }));
  ok('9 ゲストは180°回転・ホストと同じ形の台・同じ技とステージ', gInfo.flip && !hInfo.flip && Math.abs(gInfo.W - hInfo.W) < 1e-6 && gInfo.stage === 'sweeper' && gInfo.skills.join() === 'heavy,split' && gInfo.me === 1, { gInfo, hInfo });
  const fit = await guest.evaluate(() => ({ sx: Layout.ox, sy: Layout.oy, w: Table.W * Layout.scale, h: Table.L * Layout.scale, vw: Layout.vw, vh: Layout.vh }));
  ok('10 ゲスト：台は画面に収まるよう縮小（余白は背景）', fit.w <= fit.vw + 0.5 && fit.h <= fit.vh + 0.5 && (fit.sx > 0.5 || fit.sy > 0.5), fit);

  // カウントダウンが両方で進み、プレーが始まる
  ok('11 カウントダウンのあと、両方でプレー中になる', await until(host, `Match.state === 'play'`, 5000) && await until(guest, `Match.state === 'play'`, 2000));

  // ゲストがマレットを動かす → ホストの台でも動く
  const cdp = await ctx.newCDPSession(guest);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
  ok('11b 指を置くまで、ゲストのマレットは両方の画面で消えている', await guest.evaluate(() => !Physics.mallets[1].active) && await host.evaluate(() => !Physics.mallets[1].active));
  await touch('touchStart', [[1, 180, 500]]);
  await wait(250);
  const gm0 = await guest.evaluate(() => ({ x: Physics.mallets[1].x, y: Physics.mallets[1].y, a: Physics.mallets[1].active }));
  ok('11c 指を置くと現れ、ホストの台にも現れる', gm0.a && await host.evaluate(() => Physics.mallets[1].active));
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[1, 180 + i * 6, 500 - i * 4]]); await wait(16); }
  await wait(250);
  const gm1 = await guest.evaluate(() => ({ x: Physics.mallets[1].x, y: Physics.mallets[1].y }));
  const hm1 = await host.evaluate(() => ({ x: Physics.mallets[1].x, y: Physics.mallets[1].y }));
  ok('12 ゲストのマレットは、ゲストの画面ですぐ動く（画面で右上へ → 台では左下へ）', gm1.x < gm0.x - 20 && gm1.y > gm0.y + 10, { gm0, gm1 });
  ok('13 ホストの台でも、ゲストのマレットが同じ位置に来る', Math.hypot(hm1.x - gm1.x, hm1.y - gm1.y) < 8, { hm1, gm1 });
  await touch('touchEnd', [[1, 240, 460]]);
  ok('13b 指を離すと、ホストの台からもゲストのマレットが消える', await until(host, `Physics.mallets[1].active === false`, 2000));

  // パックの位置が、ゲストの画面でもホストとほぼ同じ（少し遅れて補間）
  let worst = 0;
  for (let i = 0; i < 20; i++) {
    const [h, g] = await Promise.all([host.evaluate(() => Physics.pucks.filter(p => !p.ghost).map(p => [p.id, p.x, p.y, Math.hypot(p.vx, p.vy)])), guest.evaluate(() => Physics.pucks.filter(p => !p.ghost).map(p => [p.id, p.x, p.y]))]);
    for (const q of h) { const r = g.find(z => z[0] === q[0]); if (r) worst = Math.max(worst, Math.hypot(q[1] - r[1], q[2] - r[2]) - q[3] * 0.25); }
    await wait(40);
  }
  ok('14 ゲストの画面のパックは、ホストの位置にほぼ一致（遅れ0.25秒分を除く）', worst < 30, +worst.toFixed(1));

  // ゲストが必殺技ボタンを押す → ホストで発動し、ゲストにも演出が届く
  await host.evaluate(() => { Match.gauge[1] = 1; });
  await until(guest, `Match.gauge[1] >= 1`);
  const btn = await guest.evaluate(() => { const p = Layout.toScreen(8, 8); return { x: Math.round(p.x), y: Math.round(p.y) }; });
  await touch('touchStart', [[2, btn.x, btn.y]]);
  await touch('touchEnd', [[2, btn.x, btn.y]]);
  ok('15 ゲストのボタン → ホストで必殺技が発動（分身を構える）', await until(host, `Skills.state.armed[1] === 'split' && Match.gauge[1] === 0`));
  ok('16 ゲストにも技名の帯が出る', await until(guest, `Fx.cutin && Fx.cutin.id === 'split' || Skills.state.armed[1] === 'split'`));
  // ホストが重い腕 → ゲストのマレットが重くなる
  await host.evaluate(() => { Match.gauge[0] = 1; Match.pressSkill(0); });
  ok('17 ホストの「重い腕」で、ゲストのマレットが重くなる', await until(guest, `Physics.mallets[1].heavy === true`));

  // 新しい技の効果もゲストに届く（巨大化・ゴール拡大・反転・ミニ球・稲妻）
  await host.evaluate(() => { Skills.state.heavy = [0, 0]; Skills.state.giant[1] = 3; Skills.state.wide[1] = 3; Skills.state.mirror[1] = 3; const p = Physics.pucks[0]; if (p) { p.r = Table.pr * SKILL.MINI_SCALE; p.zig = { t: 1, dir: 1 }; p.skill = 'zigzag'; } });
  ok('17b 巨大化・ゴール拡大・反転・ミニ球の状態がゲストにも届く', await until(guest, `Physics.mallets[1].r > Table.mr * 1.5 && Table.goalHalf[1] > Table.defaultGoal() * 1.2 && Physics.mallets[1].mirror && (!Physics.pucks[0] || Physics.pucks[0].r < Table.pr * 0.6)`, 3000),
     await guest.evaluate(() => ({ r: +(Physics.mallets[1].r / Table.mr).toFixed(2), gh: +(Table.goalHalf[1] / Table.defaultGoal()).toFixed(2), mirror: Physics.mallets[1].mirror, pr: Physics.pucks[0] && +(Physics.pucks[0].r / Table.pr).toFixed(2) })));
  await host.evaluate(() => { Skills.state.giant[1] = 0; Skills.state.wide[1] = 0; Skills.state.mirror[1] = 0; const p = Physics.pucks[0]; if (p) { p.r = Table.pr; p.zig = null; p.skill = null; } });

  // ホストが攻撃の技を構えても、ゲストには知らされない（ゲージは満タンのまま・構えた技も届かない）
  await host.evaluate(() => { Skills.state.armed[0] = 'fast'; Match.gauge[0] = 0; });
  await wait(300);
  const hidden = await guest.evaluate(() => ({ g: Match.gauge[0], shown: Match.shownGauge(0), armed: Skills.state.armed[0] }));
  ok('17c ホストが構えた攻撃の技は、ゲストには分からない（ゲージは満タンのまま）', hidden.g === 1 && hidden.shown === 1 && !hidden.armed, hidden);
  await host.evaluate(() => { Skills.state.armed[0] = null; });

  // 得点がゲストにも反映される
  await until(host, `Match.state === 'play' && Physics.pucks.length > 0`, 6000);   // 得点の直後なら、次のサーブまで待つ
  await host.evaluate(() => { const p = Physics.pucks[0]; p.x = Table.W / 2; p.y = 6; p.vx = 0; p.vy = -1.5 * Table.L; Skills.state.wall = [0, 0]; });
  ok('18 得点がゲストにも届く（ゴールの演出つき）', await until(guest, `Match.score[0] + Match.score[1] >= 1 && Fx.goalAnim`));
  // 試合を終わらせる
  await host.evaluate(() => { Match.score = [6, 0]; const p = Physics.pucks[0] || (Physics.pucks = [Physics.newPuck(Table.W / 2, Table.L / 2)])[0]; Match.state = 'play'; p.x = Table.W / 2; p.y = 6; p.vy = -1.5 * Table.L; });
  ok('19 7点で両方に結果画面（ホスト勝ち・ゲスト負け）', await until(host, `UI.screen === 'result' && $('#result-title').textContent === '勝ち！'`, 6000) && await until(guest, `UI.screen === 'result' && $('#result-title').textContent === '負け…'`, 3000));

  // 再戦
  await guest.evaluate(() => Acts.rematch());
  ok('20 片方が「もう一度」を押すと、相手に知らせる', await until(host, `/もう一度/.test($('#result-note').textContent)`));
  await host.evaluate(() => Acts.rematch());
  ok('21 両方押すと、同じ技・ステージで再戦が始まる', await until(host, `Game.state === 'match' && Match.score.join() === '0,0'`) && await until(guest, `Game.state === 'match' && Match.stageId === 'sweeper'`));

  // 技とステージを選び直す
  await host.evaluate(() => { Match.score = [0, 6]; const p = Physics.pucks[0] || (Physics.pucks = [Physics.newPuck(Table.W / 2, Table.L / 2)])[0]; Match.state = 'play'; p.x = Table.W / 2; p.y = Table.L - 6; p.vx = 0; p.vy = 1.5 * Table.L; });
  ok('21b 2試合目はゲストの勝ち', await until(host, `UI.screen === 'result' && $('#result-title').textContent === '負け…'`, 6000) && await until(guest, `UI.screen === 'result' && $('#result-title').textContent === '勝ち！'`, 3000));
  await guest.evaluate(() => Acts.changeSkill());
  ok('21c 「技とステージを変える」で、両方が技選びに戻る', await until(guest, `UI.screen === 'skill'`) && await until(host, `UI.screen === 'skill'`));
  await host.evaluate(() => { Sel.skill = 'wall'; Acts.skillOk(); });
  await guest.evaluate(() => { Sel.skill = 'curve'; Acts.skillOk(); });
  await until(host, `UI.screen === 'stage'`);
  await host.evaluate(() => { Sel.stage = 'dark'; Acts.stageOk(); });
  ok('21d 選び直した技とステージで始まる', await until(guest, `Game.state === 'match' && Match.stageId === 'dark' && Match.skill.join() === 'wall,curve' && Stage.dark`));

  // 3人目は入れない
  const third = await open(base, 390, 844);
  await third.evaluate(c => { Acts.online(); $('#code-in').value = c; Acts.joinRoom(); }, code);
  ok('22 3人目は「もう対戦中」と出る', await until(third, `/もう対戦中/.test($('#lobby-status').textContent + $('#msg-text').textContent)`, 5000), await third.evaluate(() => ({ st: $('#lobby-status').textContent, msg: $('#msg-text').textContent, scr: UI.screen, phase: Net.phase, role: Net.role, ctl: !!(Net.ctl && Net.ctl.open) })));
  await third.close();
  ok('23 3人目が来ても、試合は続いている', await host.evaluate(() => Game.state === 'match') && await guest.evaluate(() => Game.state === 'match'));

  // 切断：ゲストのページを閉じる → ホストに知らせ、タイトルへ戻れる
  await guest.close();
  ok('24 相手が切れたら知らせる', await until(host, `UI.screen === 'msg' && /接続が切れました/.test($('#msg-title').textContent)`, 9000));
  await host.evaluate(() => Acts.toTitle());
  ok('25 タイトルに戻れる', await host.evaluate(() => UI.screen === 'title' && Game.state === 'menu'));

  // つながらない場合：存在しない部屋コード
  const lone = await open(base, 390, 844);
  await lone.evaluate(() => { Acts.online(); $('#code-in').value = 'ZZZZ'; Acts.joinRoom(); });
  ok('26 存在しない部屋は「見つかりません」と出る', await until(lone, `/見つかりません/.test($('#lobby-status').textContent)`, 5000));
  await lone.evaluate(() => { $('#code-in').value = 'AB'; Acts.joinRoom(); });
  ok('27 コードの文字数が足りないと知らせる', await lone.evaluate(() => /4文字/.test($('#lobby-status').textContent)));

  let fails = 0;
  for (const l of out) { console.log(l); if (l.startsWith('×')) fails++; }
  console.log(errs.length ? 'ページのエラー: ' + errs.slice(0, 6).join(' / ') : 'ページのエラーなし');
  console.log(fails ? `失敗 ${fails} 件` : 'すべて合格');
  await b.close();
  srv.kill();
})();
