// 本物の PeerJS（ローカルの PeerServer）で、2つのページを WebRTC でつないで試す：node tools/test_realpeer.js
const PT = process.env.PEERTEST;                       // peerjs と peer を入れたフォルダ
const { ExpressPeerServer } = require(PT + '/node_modules/peer');
const express = require(PT + '/node_modules/express');
const { chromium, launchOpts } = require('./pw');
const http = require('http'), fs = require('fs');
(async () => {
  const app = express(); const ps = app.listen(9000, '127.0.0.1'); app.use('/myapp', ExpressPeerServer(ps, { path: '/' }));
  const html = fs.readFileSync('index.html', 'utf8')
    .replace('PEER_SERVER: null,', "PEER_SERVER: { host: '127.0.0.1', port: 9000, path: '/myapp', secure: false },")
    .replace(/ICE_SERVERS: \[[\s\S]*?\],/, 'ICE_SERVERS: [],');
  const lib = fs.readFileSync(PT + '/node_modules/peerjs/dist/peerjs.min.js');
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(8771);
  const b = await chromium.launch(launchOpts(['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows']));
  const ctx = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  await ctx.route(/peerjs.*\.js$/, r => r.fulfill({ body: lib, contentType: 'application/javascript' }));
  const errs = [];
  const open = async (url) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push(m.text()); }); await p.goto(url); return p; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (p, expr, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(expr)) return true; await wait(80); } return false; };
  const out = [], ok = (n, pass, info) => out.push((pass ? '〇 ' : '× ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  const base = 'http://127.0.0.1:8771/index.html';
  const host = await open(base);
  await host.evaluate(() => { Acts.online(); Acts.createRoom(); });
  ok('1 本物のPeerJSで部屋ができる', await until(host, `/^[A-Z0-9]{4}$/.test($('#room-code').textContent) && !$('#lobby-host').classList.contains('hidden')`));
  const code = await host.evaluate(() => Net.code);
  const guest = await open(base + '?room=' + code);
  ok('2 WebRTC でつながり、両方が技選びへ', await until(guest, `UI.screen === 'skill'`) && await until(host, `UI.screen === 'skill'`));
  ok('3 状態用の通信（速さ優先）もつながる', await until(guest, `!!(Net.st && Net.st.open)`) && await until(host, `!!(Net.st && Net.st.open)`), await host.evaluate(() => ({ st: Net.st && Net.st.label, rel: Net.st && Net.st.reliable })));
  await guest.evaluate(() => Acts.skillOk()); await host.evaluate(() => Acts.skillOk());
  await until(host, `UI.screen === 'stage'`);
  await host.evaluate(() => { Sel.stage = 'warp'; Acts.stageOk(); });
  ok('4 試合が始まり、プレーになる', await until(host, `Match.state === 'play'`) && await until(guest, `Match.state === 'play'`));
  await host.evaluate(() => { const p = Physics.pucks[0]; p.x = Table.W / 2; p.y = Table.L * 0.45; p.vx = 1.2 * Table.L; p.vy = 0.05 * Table.L; });
  await wait(600);
  const [h, g] = await Promise.all([host.evaluate(() => Physics.pucks.map(p => [p.id, p.x, p.y])), guest.evaluate(() => Physics.pucks.map(p => [p.id, p.x, p.y]))]);
  ok('5 ゲストにもパックが届いて動いている', g.length >= 1 && h.length >= 1 && g[0][0] === h[0][0], { h, g });
  const recv = await guest.evaluate(() => GuestSync.buf.length);
  ok('6 ホストの状態が届き続けている', recv > 10, recv);
  await guest.evaluate(() => Acts.toTitle());
  ok('7 ゲストがやめると、ホストに「相手が対戦をやめました」', await until(host, `UI.screen === 'msg' && /やめました/.test($('#msg-text').textContent)`, 10000));
  const lone = await open(base);
  await lone.evaluate(() => { Acts.online(); $('#code-in').value = 'ZZZZ'; Acts.joinRoom(); });
  ok('8 存在しない部屋コードは「見つかりません」', await until(lone, `/見つかりません/.test($('#lobby-status').textContent)`, 15000), await lone.evaluate(() => $('#lobby-status').textContent));
  let fails = 0;
  for (const l of out) { console.log(l); if (l.startsWith('×')) fails++; }
  console.log(errs.length ? 'ページのエラー: ' + errs.slice(0, 5).join(' / ') : 'ページのエラーなし');
  console.log(fails ? `失敗 ${fails} 件` : 'すべて合格');
  await b.close(); srv.close(); process.exit(0);
})();
