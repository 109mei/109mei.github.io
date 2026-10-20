// 効果音のテスト（エラーなく鳴らせるか・暗闇の音の向きと大きさ）：node tools/test_sound.js
const { chromium, launchOpts } = require('./pw');
(async () => {
  const b = await chromium.launch(launchOpts(['--autoplay-policy=no-user-gesture-required']));
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/index.html');
  await p.mouse.click(200, 400);                      // 最初のタップで音を有効にする
  await p.waitForTimeout(300);
  const R = await p.evaluate(async () => {
    const out = [], ok = (n, pass, info) => out.push((pass ? '〇 ' : '× ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
    ok('最初のタップで音が有効になる', !!Sound.ac && Sound.ac.state === 'running', Sound.ac && Sound.ac.state);
    Match.start({ mode: 'cpu', skills: ['fast', 'wall'], stage: 'dark', server: 0 });
    Match.state = 'play'; CPU.update = () => {}; window.__hold = true;   // ループを止めて、音だけを確かめる
    const { W, L } = Table;
    let thrown = [];
    const tryEv = (t, a) => { try { Sound.event(t, a); } catch (e) { thrown.push(t + ':' + e.message); } };
    tryEv('mhit', [0, 0.5, W / 2, L * 0.7]); tryEv('mhit', [1, 3.5, W / 2, L * 0.3]); tryEv('mtouch', [0, 0.05, W / 2, L * 0.7]);
    for (const k of ['wall', 'pillar', 'bumper', 'spring', 'sweeper', 'shutter', 'barrier', 'puck', 'other']) tryEv('hit', [k, 1.5, W * 0.2, L * 0.4]);
    tryEv('warp', [0, L * 0.4, W, L * 0.4]); tryEv('pop', [W / 2, L / 2, 0]);
    tryEv('goal', [0, W / 2]); tryEv('goal', [1, W / 2]);
    for (const s of SKILLS) { tryEv('skill', [0, s.id]); tryEv('shot', [1, s.id, W / 2, L / 2]); }
    tryEv('second', [W / 2, L / 2]); tryEv('rally', [5]); tryEv('full', [0]); tryEv('full', [1]);
    for (const n of [3, 2, 1, 0]) tryEv('count', [n]);
    tryEv('over', [0]); tryEv('over', [1]);
    Sound.ui(); Sound.denied();
    ok('すべての効果音をエラーなく鳴らせる（' + 'mhit/hit 9種/warp/pop/goal/skill/shot/second/rally/full/count/over' + '）', thrown.length === 0, thrown);

    // 暗闇の滑走音：左右の位置・自分のマレットとの距離・速さ
    const pk = Physics.newPuck(W * 0.1, L * 0.75, 0.0, -1.5 * L);
    Physics.pucks = [pk];
    const me = Physics.mallets[0]; me.x = me.tx = W / 2; me.y = me.ty = L * 0.85;
    const sample = async () => { for (let i = 0; i < 6; i++) { Slide.update(1 / 60); await new Promise(r => setTimeout(r, 30)); } const c = Slide.ch.get(pk.id); if (!c) return { gain: 0, pan: 0, f: 0 }; return { gain: c.gain.gain.value, pan: c.pan ? c.pan.pan.value : 0, f: c.tf }; };
    const left = await sample();
    pk.x = W * 0.9; const right = await sample();
    pk.x = W / 2; pk.y = L * 0.82; const near = await sample();
    pk.y = L * 0.15; const far = await sample();
    pk.vy = -0.4 * L; const slow = await sample();
    ok('滑走音：左にあると左から（左右の振り）', left.pan < -0.5 && right.pan > 0.5, { left: +left.pan.toFixed(2), right: +right.pan.toFixed(2) });
    ok('滑走音：自分のマレットに近いほど大きい', near.gain > far.gain * 2, { near: +near.gain.toFixed(3), far: +far.gain.toFixed(3) });
    ok('滑走音：速いほど高い', far.f > slow.f + 200, { fast: Math.round(far.f), slow: Math.round(slow.f) });
    pk.vx = 0; pk.vy = 0; const still = await sample();
    ok('滑走音：止まっていると鳴らない', still.gain < 0.005, +still.gain.toFixed(4));
    Match.stageId = 'pillars'; Stage.load('pillars'); pk.vy = -1.5 * L; const normal = await sample();
    ok('滑走音は暗いステージだけ', normal.gain < 0.01, +normal.gain.toFixed(4));
    const pl = Sound.place(W * 0.05, L * 0.5), pr = Sound.place(W * 0.95, L * 0.5);
    ok('暗いステージ以外でも、当たった音は位置に合わせて少し左右に振る', pl.pan < -0.2 && pr.pan > 0.2 && Math.abs(pl.pan) <= 0.4, { pl: pl.pan, pr: pr.pan });
    Layout.flip = true; const fl = Sound.place(W * 0.05, L * 0.5); Layout.flip = false;
    ok('ゲスト（台が180°回転）では左右が入れ替わる', fl.pan > 0.2, fl.pan);
    ok('音のオン・オフ', (Sound.setOn(false), Sound.master.gain.value >= 0) && (Sound.setOn(true), Sound.on === true));
    return out;
  });
  let fails = 0;
  for (const l of R) { console.log(l); if (l.startsWith('×')) fails++; }
  console.log(errs.length ? 'ページのエラー: ' + errs.join(' / ') : 'ページのエラーなし');
  console.log(fails ? `失敗 ${fails} 件` : 'すべて合格');
  await b.close();
})();
