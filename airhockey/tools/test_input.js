// 操作のテスト（本物のタッチを送る）：node tools/test_input.js
const { chromium, launchOpts } = require('./pw');
(async () => {
  const b = await chromium.launch(launchOpts());
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/index.html');
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
  const wait = ms => p.waitForTimeout(ms);
  const get = expr => p.evaluate(expr);
  const out = [], ok = (n, pass, info) => out.push((pass ? '〇 ' : '× ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  const ms = `(()=>{const m=Physics.mallets[Match.me];const s=Layout.toScreen(m.x,m.y);return {x:s.x,y:s.y}})()`;

  await get(`(Acts.cpu(), Acts.skillOk(), Acts.stageOk(), Match.state='play', Physics.pucks=[], CPU.update=()=>{}, window.__act=0, Skills.activate=()=>{window.__act++}, 1)`);
  await wait(100);
  ok('0 指を置くまで、自分のマレットは出ていない（当たらない）', await get('Physics.mallets[0].active === false && !Physics.obstacles().some(o => o.mallet && o.mallet.owner === 0)'));
  await touch('touchStart', [[1, 60, 600]]);
  await wait(60);
  const s0 = await get(ms), off = await get('Table.mr * Layout.scale + 34');
  ok('1 指を置くと、指の少し上にマレットが現れる（指で隠れない）', await get('Physics.mallets[0].active') && Math.abs(s0.x - 60) < 1 && Math.abs(s0.y - (600 - off)) < 1, { s0, expectY: 600 - off });
  await touch('touchMove', [[1, 90, 580]]);
  await wait(150);
  const s1 = await get(ms);
  ok('2 指を(+30,-20)動かすと、マレットも(+30,-20)動く', Math.abs(s1.x - s0.x - 30) < 1 && Math.abs(s1.y - s0.y + 20) < 1, [+(s1.x - s0.x).toFixed(1), +(s1.y - s0.y).toFixed(1)]);

  await get('(Skills.state.mirror[0] = 2, Skills.applyMallets(0), 1)');
  await touch('touchMove', [[1, 120, 570]]);
  await wait(150);
  const sm = await get(ms);
  ok('2b 反転をかけられると、指を右へ動かしてもマレットは左へ（上下はそのまま）', Math.abs(sm.x - s1.x + 30) < 1 && Math.abs(sm.y - s1.y + 10) < 1, [+(sm.x - s1.x).toFixed(1), +(sm.y - s1.y).toFixed(1)]);
  await get('(Skills.state.mirror[0] = 0, Skills.applyMallets(0), 1)');
  await touch('touchMove', [[1, 90, 580]]);
  await wait(150);
  const s1b = await get(ms);
  s1.x = s1b.x; s1.y = s1b.y;

  await get('Match.gauge[0]=1');
  await touch('touchStart', [[1, 90, 580], [2, 372, 826]]);
  await wait(60);
  ok('3 2本目の指で、右下の三角形を触ると発動', await get('window.__act') === 1);
  await touch('touchMove', [[1, 120, 570], [2, 372, 826]]);
  await wait(150);
  const s2 = await get(ms);
  ok('4 ボタンを押したままでも、マレットの指で動かせる', Math.abs(s2.x - s1.x - 30) < 1 && Math.abs(s2.y - s1.y + 10) < 1, [+(s2.x - s1.x).toFixed(1), +(s2.y - s1.y).toFixed(1)]);
  await touch('touchEnd', [[2, 372, 826]]);
  await wait(30);
  await get('Match.gauge[0]=1');
  await touch('touchMove', [[1, 372, 826]]);
  await wait(60);
  await touch('touchMove', [[1, 380, 836]]);
  await wait(60);
  ok('5 マレットの指が三角形に滑り込んでも発動しない', await get('window.__act') === 1);
  await touch('touchEnd', [[1, 380, 836]]);
  await wait(30);
  ok('5b 指を離すと、マレットは消える', await get('Physics.mallets[0].active === false'));
  const thru = await get(`(() => { const m = Physics.mallets[0]; const p = Physics.newPuck(m.x, m.y - Table.L * 0.12, 0, 0.6 * Table.L); Physics.pucks = [p]; for (let i = 0; i < 20; i++) Physics.step(1 / 60); const r = { vy: p.vy, y: p.y, my: m.y }; Physics.pucks = []; return r; })()`);
  ok('5c 消えている間、パックはマレットの場所を素通りする', thru.vy > 0 && thru.y > thru.my, thru);
  await get('Match.gauge[0]=0.5');
  await touch('touchStart', [[7, 15, 830]]);
  await wait(60);
  ok('6 満タンでないときは発動しない（左下の三角形）', await get('window.__act') === 1 && await get('Fx.denyT[0] < 0.3'));
  await touch('touchEnd', [[7, 15, 830]]);

  await touch('touchStart', [[3, 195, 760]]);
  await touch('touchMove', [[3, 195, 60]]);
  await wait(200);
  const lim = await get('({y:Physics.mallets[0].y, limit:Table.L/2+Table.mr})');
  ok('7 上へ大きく動かしても、自分の陣地（下半分）から出ない', Math.abs(lim.y - lim.limit) < 0.5, lim);
  await touch('touchMove', [[3, 195, 260]]);
  await wait(200);
  const back = await get('Physics.mallets[0].y');
  ok('8 指を戻すと、すぐ戻ってくる（はみ出した分を溜め込まない）', back > lim.limit + 100, +back.toFixed(1));
  await touch('touchEnd', [[3, 195, 260]]);

  await touch('touchStart', [[4, 200, 500]]);
  await touch('touchStart', [[4, 200, 500], [5, 300, 500]]);
  ok('9 マレット用の指は1本だけ（2本目は控え）', await get('Array.from(Input.fingers.values()).map(f=>f.role).join(",")') === 'mallet,idle');
  await touch('touchEnd', [[4, 200, 500]]);
  ok('10a 引き継いだあともマレットは出たまま', await get('Physics.mallets[0].active === true'));
  ok('10 マレットの指を離すと、控えの指が引き継ぐ', await get('Array.from(Input.fingers.values()).map(f=>f.role).join(",")') === 'mallet');
  await touch('touchEnd', [[5, 300, 500]]);
  ok('11 全部離すと、指の記録は空になり、マレットも消える', await get('Input.fingers.size === 0 && Physics.mallets[0].active === false'));

  // ゲスト：台は180°回転。指の動きと画面上のマレットの動きは同じ向き、ボタンは画面の下の三角形
  await get(`(Match.abort(), Net.sendPress=()=>{window.__press=(window.__press||0)+1}, Match.start({mode:'guest', skills:['fast','wall'], stage:'pillars', aspect:0.5, server:0}), Match.state='play', 1)`);
  await wait(100);
  await touch('touchStart', [[8, 200, 600]]);
  await wait(60);
  const g0 = await get(ms);
  ok('11b ゲスト：指の少し上にマレットが現れる', Math.abs(g0.x - 200) < 1 && Math.abs(g0.y - (600 - await get('Table.mr * Layout.scale + 34'))) < 1, g0);
  await touch('touchMove', [[8, 230, 580]]);
  await wait(150);
  const g1 = await get(ms);
  ok('12 ゲスト：指を(+30,-20)動かすと、画面上でも(+30,-20)動く', Math.abs(g1.x - g0.x - 30) < 1 && Math.abs(g1.y - g0.y + 20) < 1, [+(g1.x - g0.x).toFixed(1), +(g1.y - g0.y).toFixed(1)]);
  ok('13 ゲスト：自分のマレットは画面の下半分にいる', g1.y > 844 / 2);
  await touch('touchEnd', [[8, 230, 580]]);
  await get('Match.gauge[1]=1');
  const geo = await get('(()=>{const p=Layout.toScreen(Table.W - 8, Table.L - 8);const q=Layout.toScreen(8,8);return {top:p, bottom:q}})()');
  await touch('touchStart', [[9, Math.round(geo.bottom.x), Math.round(geo.bottom.y)]]);
  await wait(60);
  ok('14 ゲスト：画面の下の三角形がボタン', await get('window.__press') === 1, geo.bottom);
  await touch('touchEnd', [[9, Math.round(geo.bottom.x), Math.round(geo.bottom.y)]]);

  ok('15 スクロール・拡大・選択を止める設定', await get(`(()=>{const c=getComputedStyle(document.body);return c.touchAction==='none' && (c.userSelect||c.webkitUserSelect)==='none' && getComputedStyle(canvas).touchAction==='none' && /user-scalable=no/.test(document.querySelector('meta[name=viewport]').content)})()`));
  // 2本指でつまんでも拡大しない（2本目の指の touchstart と、ジェスチャーを止めている）
  ok('16 2本指のタッチとジェスチャーは、ページの拡大に使わせない', await get(`(()=>{
    const mk = n => { const t = []; for (let i = 0; i < n; i++) t.push(new Touch({ identifier: 50 + i, target: document.body, clientX: 100 + i * 50, clientY: 300 })); return t; };
    const e2 = new TouchEvent('touchstart', { touches: mk(2), cancelable: true, bubbles: true }); document.body.dispatchEvent(e2);
    const m2 = new TouchEvent('touchmove', { touches: mk(2), cancelable: true, bubbles: true }); document.body.dispatchEvent(m2);
    const g = new Event('gesturechange', { cancelable: true }); document.dispatchEvent(g);
    const w = new WheelEvent('wheel', { ctrlKey: true, cancelable: true, deltaY: -10 }); window.dispatchEvent(w);
    return e2.defaultPrevented && m2.defaultPrevented && g.defaultPrevented && w.defaultPrevented;
  })()`));
  // 長押しで「ペースト」：台の上では出さない。部屋コードの入力欄は、コードか招待リンクのときだけ貼り付けられる
  ok('17 台の上の長押しで、文字選択やメニューを出さない', await get(`(()=>{ const t = new Touch({ identifier: 70, target: canvas, clientX: 100, clientY: 300 }); const e = new TouchEvent('touchstart', { touches: [t], cancelable: true, bubbles: true }); canvas.dispatchEvent(e); return e.defaultPrevented && getComputedStyle(canvas).webkitTouchCallout !== 'default'; })()`));
  ok('18 部屋コードの欄：関係ない文字は貼り付けられず、コード・招待リンクは貼り付けられる', await get(`(()=>{
    const c = $('#code-in'), paste = t => { const d = new DataTransfer(); d.setData('text', t); c.value = ''; c.dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, cancelable: true, bubbles: true })); return c.value; };
    return [paste('こんにちは、今日はよろしく'), paste('ab12'), paste('https://x.github.io/airhockey/?room=QW3E')].join('|');
  })()`) === '|AB12|QW3E');
  ok('19 試合が始まると、入力欄から外れる（長押しで「ペースト」が出ない）', await get(`(()=>{ Match.abort(); UI.show('lobby'); const c = $('#code-in'); c.focus(); const f = document.activeElement === c; Match.start({ mode: 'cpu', skills: ['fast', 'fast'], stage: 'pillars', server: 0 }); return f && document.activeElement !== c; })()`));
  let fails = 0;
  for (const l of out) { console.log(l); if (l.startsWith('×')) fails++; }
  console.log(errs.length ? 'ページのエラー: ' + errs.join(' / ') : 'ページのエラーなし');
  console.log(fails ? `失敗 ${fails} 件` : 'すべて合格');
  await b.close();
})();
