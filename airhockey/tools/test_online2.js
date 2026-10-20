// 通信が遅れたり落ちたりしても、ゲストの画面でなめらかに動くか：node tools/test_online2.js [遅れms] [落ちる割合]
const { chromium, launchOpts } = require('./pw');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const lag = +(process.argv[2] || 60), drop = +(process.argv[3] || 0.1);
  const srv = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const b = await chromium.launch(launchOpts(['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows']));
  const ctx = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  await ctx.addInitScript({ content: fs.readFileSync(__dirname + '/mockpeer.js', 'utf8') + `;window.__netLag=${lag};window.__netDrop=${drop};` });
  await ctx.route(/peerjs/, r => r.abort());
  const base = 'http://127.0.0.1:8766/index.html';
  const host = await ctx.newPage(); await host.goto(base);
  await host.evaluate(() => { Acts.online(); Acts.createRoom(); });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (p, expr, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(expr)) return true; await wait(50); } return false; };
  await until(host, `/^[A-Z0-9]{4}$/.test($('#room-code').textContent)`);
  const code = await host.evaluate(() => Net.code);
  const guest = await ctx.newPage(); await guest.goto(base + '?room=' + code);
  await until(guest, `UI.screen === 'skill'`); await until(host, `UI.screen === 'skill'`);
  await guest.evaluate(() => Acts.skillOk()); await host.evaluate(() => Acts.skillOk());
  await until(host, `UI.screen === 'stage'`);
  await host.evaluate(() => { Sel.stage = 'pillars'; Acts.stageOk(); });
  await until(host, `Match.state === 'play'`, 8000); await until(guest, `Match.state === 'play'`);
  // ホスト：パックを速く動かし続け、位置の記録を取る。ゲスト：毎フレームの表示位置を記録
  await host.evaluate(() => {
    CPU.update = () => {}; Physics.mallets[0].tx = Table.mr * 1.2; Stage.shapes = [];
    const p = Physics.pucks[0]; p.x = Table.W / 2; p.y = Table.L / 2; p.vx = 0.9 * Table.L; p.vy = 1.4 * Table.L; Skills.state.wall = [9, 9];
    window.__log = []; const f = () => { const q = Physics.pucks[0]; if (q) window.__log.push([performance.now() + performance.timeOrigin, q.x, q.y]); if (window.__log.length < 400) requestAnimationFrame(f); }; f();
  });
  await guest.evaluate(() => {
    window.__log = []; const f = () => { const q = Physics.pucks.find(p => !p.ghost); if (q) window.__log.push([performance.now() + performance.timeOrigin, q.x, q.y]); if (window.__log.length < 400) requestAnimationFrame(f); }; f();
  });
  await wait(4500);
  const H = await host.evaluate(() => window.__log), G = await guest.evaluate(() => window.__log);
  // ゲストの表示は、ホストの何ミリ秒前の位置に近いか（ずらし幅ごとの平均誤差）
  const at = (t) => { let i = H.findIndex(h => h[0] >= t); if (i <= 0) return null; const a = H[i - 1], c = H[i], u = (t - a[0]) / (c[0] - a[0]); return [a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u]; };
  let best = null;
  for (let sh = 0; sh <= 300; sh += 5) {
    let e = 0, n = 0;
    for (const g of G.slice(30)) { const h = at(g[0] - sh); if (!h) continue; e += Math.hypot(h[0] - g[1], h[1] - g[2]); n++; }
    if (n > 50 && (!best || e / n < best.err)) best = { shift: sh, err: e / n, n };
  }
  const gap = A => { let m = 0; for (let i = 1; i < A.length; i++) m = Math.max(m, A[i][0] - A[i - 1][0]); return Math.round(m); };
  console.log('コマの最大の間隔(ms)：ホスト', gap(H), 'ゲスト', gap(G));
  if (best) {
    const errs = [];
    for (const g of G.slice(30)) { const h = at(g[0] - best.shift); if (h) errs.push([Math.hypot(h[0] - g[1], h[1] - g[2]), g[0], g[1], g[2], h[0], h[1]]); }
    const sorted = errs.map(e => e[0]).sort((a, b) => a - b);
    console.log('ずれ：中央', sorted[sorted.length >> 1].toFixed(1), '90%', sorted[Math.floor(sorted.length * 0.9)].toFixed(1), '最大', sorted[sorted.length - 1].toFixed(1));
    if (process.env.DUMP) for (const e of errs.filter(e => e[0] > 30).slice(0, 12)) console.log('  大きいずれ', e.map(v => Math.round(v)).join(' '));
  }
  // なめらかさ：1フレームあたりの移動量のばらつき（速さ一定なので、ほぼ同じはず）
  const spread = (A) => {
    const steps = [];
    for (let i = 31; i < A.length; i++) { const dt = (A[i][0] - A[i - 1][0]) / 1000; if (dt < 0.004) continue; const d = Math.hypot(A[i][1] - A[i - 1][1], A[i][2] - A[i - 1][2]) / dt; if (d < 4000) steps.push(d / 1000); }
    steps.sort((a, b) => a - b);
    return [steps[Math.floor(steps.length * 0.05)], steps[Math.floor(steps.length / 2)], steps[Math.floor(steps.length * 0.95)]];
  };
  const [p5, med, p95] = spread(G), [h5, hm, h95] = spread(H);
  console.log(`（参考）ホスト自身の見かけの速さ：中央 ${hm.toFixed(2)}・5% ${h5.toFixed(2)}・95% ${h95.toFixed(2)}`);
  console.log(`遅れ ${lag}ms・落ちる割合 ${drop}`);
  console.log(`${best && best.err < 12 ? '〇' : '×'} ゲストのパックは、ホストの約 ${best && best.shift}ms 前の位置をなぞる（平均のずれ ${best && best.err.toFixed(1)}）`);
  console.log(`${(p95 - p5) < (h95 - h5) * 1.5 + 0.2 ? '〇' : '×'} なめらかさ（ホストと同じくらいのばらつき）：見かけの速さ（台長/秒）中央 ${med.toFixed(2)}・5% ${p5.toFixed(2)}・95% ${p95.toFixed(2)}`);
  await b.close(); srv.kill();
})();
