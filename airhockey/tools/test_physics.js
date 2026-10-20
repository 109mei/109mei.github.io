// 物理のテスト：node tools/test_physics.js（先に node build.js）
require('./common').run(() => {
  const out = [], ok = (name, pass, info) => out.push((pass ? '〇 ' : '× ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  Match.start({ mode: 'cpu', skills: ['fast', 'fast'], stage: 'pillars', server: 0 });
  Match.state = 'idle';
  Stage.load('dark'); Stage.shapes = []; Stage.dark = false;           // 仕掛けのない台で試す
  const { W, L, pr, mr, D } = Table;
  const park = () => Physics.mallets.forEach(m => { m.active = true; m.tx = m.x = m.px = m.owner ? mr * 1.2 : W / 2; m.ty = m.y = m.py = m.owner === 0 ? L * 0.9 : L * 0.1; m.vx = m.vy = m.ivx = m.ivy = 0; m.heavy = false; m.speedLimit = 0; }) || (Match.rally = 0, Physics.rally = 0);

  // A：すり抜けない（ラリー最大の速さで、ランダムに長く動かす。マレットも動かす）
  for (const dt of [1 / 60, 1 / 30, 0.05]) {
    let escaped = 0, badGoal = 0, trials = 0, inMallet = 0;
    for (let k = 0; k < 200; k++) {
      park(); Physics.rally = 100;
      const sp = (1 + Math.random() * 2.4) * L, a = Math.random() * TAU;
      const pk = Physics.newPuck(pr + Math.random() * (W - 2 * pr), L * (0.3 + Math.random() * 0.4), Math.cos(a) * sp, Math.sin(a) * sp);
      Physics.pucks = [pk]; trials++;
      for (let f = 0; f < Math.round(8 / dt); f++) {
        for (const m of Physics.mallets) {                                 // マレットをでたらめに速く動かす
          if (Math.random() < 0.05) { const c = Table.clampMallet(m.owner, Math.random() * W, m.owner ? Math.random() * L / 2 : L / 2 + Math.random() * L / 2); m.tx = c.x; m.ty = c.y; }
        }
        Physics.updateMallets(dt);
        const sc = Physics.step(dt);
        if (sc >= 0) { if (Math.abs(pk.x - W / 2) > Table.goalHalf[sc === 0 ? 1 : 0] + pr) badGoal++; break; }
        if (pk.x < 0 || pk.x > W || pk.x + pk.y < D || (W - pk.x) + pk.y < D || pk.x + (L - pk.y) < D || (W - pk.x) + (L - pk.y) < D) { escaped++; break; }
        for (const m of Physics.mallets) if (Math.hypot(pk.x - m.x, pk.y - m.y) < pr + mr - 2) inMallet++;
      }
    }
    ok(`A すり抜けない dt=${dt.toFixed(3)}`, escaped === 0 && badGoal === 0, { trials, escaped, badGoal, inMallet });
  }

  // B：マレットとの跳ね返り（相対速度・反発 0.7）
  const hit = (puckVy, mvy, frames = 60, dt = 1 / 120) => {
    park(); Physics.rally = 0;
    const m = Physics.mallets[0];
    m.tx = m.x = m.px = W / 2; m.ty = m.y = m.py = L * 0.7;
    Physics.pucks = [Physics.newPuck(W / 2, L * 0.7 - mr - pr - 40, 0, puckVy * L)];
    for (let f = 0; f < frames; f++) { m.ty += mvy * L * dt; Physics.updateMallets(dt); Physics.step(dt); }
    return Physics.pucks[0].vy / L;
  };
  let v = hit(1.0, 0); ok('B1 止まったマレット：1.0 → 0.7 で跳ね返る', Math.abs(v + 0.7) < 0.03, +v.toFixed(3));
  v = hit(1.0, 0.41, 40); ok('B2 引きながら受けると、ほぼ止まる', Math.abs(v) < 0.1, +v.toFixed(3));
  v = hit(0.3, 0); ok('B3 そっと当たる 0.3 → 0.21', Math.abs(v + 0.21) < 0.02, +v.toFixed(3));

  // C：速く振るほど速く飛ぶ。上限で頭打ち
  const swing = (mv, dt) => {
    park(); Physics.rally = 0;
    const m = Physics.mallets[0];
    m.tx = m.x = m.px = W / 2; m.ty = m.y = m.py = L * 0.9;
    Physics.pucks = [Physics.newPuck(W / 2, L * 0.62, 0, 0)];
    let best = 0;
    for (let f = 0; f < Math.round(0.8 / dt); f++) { m.ty -= mv * L * dt; Physics.updateMallets(dt); Physics.step(dt); best = Math.max(best, -Physics.pucks[0].vy / L); }
    return best;
  };
  const s1 = swing(0.5, 1 / 60), s2 = swing(1.2, 1 / 60), s3 = swing(4.0, 0.05);
  ok('C 振りの速さで飛ぶ速さが変わる（ゆっくり < 速く ≦ 上限。最初の打ち返しでラリー1なので上限は2.08）', s1 > 0.3 && s1 < s2 && s2 <= 2.081 && s3 <= 2.081 && s3 > 1.9, [s1, s2, s3].map(x => +x.toFixed(2)));

  // D：ラリーで強さと上限が上がる
  Physics.rally = 0; const m0 = Physics.maxSpeed({ boost: 1 }) / L, p0 = Physics.power();
  Physics.rally = 5; const m5 = Physics.maxSpeed({ boost: 1 }) / L, p5 = Physics.power();
  Physics.rally = 50; const m50 = Physics.maxSpeed({ boost: 1 }) / L, p50 = Physics.power();
  ok('D ラリーで強さと最高速度の上限が少しずつ上がる', m0 === 2 && m5 > m0 && m50 === 3.4 && p5 > p0 && p50 === 1.7, { m0, m5, m50, p0, p5, p50 });

  // E：滑走（ほとんど減速しない）と、壁でわずかに落ちる
  park(); Physics.rally = 0;
  let pk = Physics.newPuck(W * 0.35, L * 0.5, 0, 0.8 * L); Physics.pucks = [pk];
  for (let f = 0; f < 60; f++) Physics.step(1 / 60);
  const glide = Math.hypot(pk.vx, pk.vy) / L;
  ok('E1 1秒滑ったあとの速さ（0.8 → 0.78 前後）', glide > 0.77 && glide < 0.8, +glide.toFixed(3));
  pk = Physics.newPuck(W * 0.3, L * 0.45, -0.8 * L, 0); Physics.pucks = [pk];
  for (let f = 0; f < 30 && pk.vx < 0; f++) Physics.step(1 / 60);
  for (let f = 0; f < 5; f++) Physics.step(1 / 60);
  ok('E2 壁に当たると、わずかに勢いが落ちる（0.94倍前後）', pk.vx > 0 && pk.vx / (0.8 * L) > 0.9 && pk.vx / (0.8 * L) < 0.96, +(pk.vx / (0.8 * L)).toFixed(3));

  // F：パックがマレットと壁に挟まれても、台の外へ出ない
  park();
  let worst = 0;
  for (let k = 0; k < 40; k++) {
    const m = Physics.mallets[0];
    pk = Physics.newPuck(pr + 1, L * 0.75, 0, 0); Physics.pucks = [pk];
    m.x = m.px = m.tx = W * 0.5; m.y = m.py = m.ty = L * 0.75;
    for (let f = 0; f < 60; f++) { m.tx = 0; m.ty = L * 0.75 + Math.sin(f) * 20; Physics.updateMallets(1 / 60); Physics.step(1 / 60); worst = Math.min(worst, pk.x - pk.r); }
  }
  ok('F 壁とマレットに挟まれても、パックは台の中', worst > -2, +worst.toFixed(2));

  // G：パックが2個のときの衝突
  park();
  const a = Physics.newPuck(W * 0.3, L * 0.5, 0.6 * L, 0), b = Physics.newPuck(W * 0.7, L * 0.5, -0.6 * L, 0);
  Physics.pucks = [a, b];
  for (let f = 0; f < 60; f++) Physics.step(1 / 60);
  ok('G パック同士は跳ね返る', a.vx < 0 && b.vx > 0, [+(a.vx / L).toFixed(2), +(b.vx / L).toFixed(2)]);
  return out;
});
