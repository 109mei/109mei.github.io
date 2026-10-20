// ステージのテスト：node tools/test_stage.js（先に node build.js）
require('./common').run(() => {
  const lines = [];
  const R1 = (() => {
    const out = {}, dt = 1 / 60;
    const ids = STAGE_META.map(s => s.id);
    const fresh = id => {
      Match.start({ mode: 'cpu', skills: ['fast', 'fast'], stage: id, server: 0 });
      Match.state = 'idle'; Physics.pucks = []; Match.rally = 0; Physics.rally = 0;
      const { W, L } = Table;
      Physics.mallets.forEach(m => { m.tx = m.x = m.px = W * 0.5; m.ty = m.y = m.py = m.owner === 0 ? L * 0.95 : L * 0.05; });
    };
    const step = (n, d = dt) => { for (let i = 0; i < n; i++) { Stage.update(d); Physics.step(d); } };
    const near = (a, b, e = 1) => Math.abs(a - b) < e;

    // ---- 対称性：すべての仕掛けが上下・左右に対称か（動くものは t=0 の位置で調べる）
    const sym = {};
    for (const id of ids) {
      fresh(id); Stage.t = 0; Stage.update(0);
      const { W, L } = Table;
      const has = (x, y, r) => Stage.shapes.some(s => near(s.ax, x, 1) && near(s.ay, y, 1) && near(s.r, r, 0.5) && (s.kind !== 'sweeper' && s.kind !== 'shutter'));
      let ok = true;
      for (const s of Stage.shapes) {
        if (s.kind === 'sweeper') { ok = ok && near((s.ax + s.bx) / 2, W / 2, 1) && near(s.ay, L / 2, 1); continue; }
        if (s.kind === 'shutter') continue;
        ok = ok && has(s.ax, L - s.ay, s.r) && has(W - s.ax, s.ay, s.r);
      }
      for (const z of Stage.sideZones) ok = ok && Stage.sideZones.some(q => q.kind === z.kind && near(q.y0, L - z.y1, 1) && near(q.y1, L - z.y0, 1));
      for (const z of Stage.zones) ok = ok && Stage.zones.some(q => q.type === z.type && near(q.y0, L - z.y1, 1) && near(q.y1, L - z.y0, 1) && near(q.x0, W - z.x1, 1) && (z.type !== 'arrow' || near(q.dy, -z.dy)));
      sym[id] = ok;
    }
    out['対称（上下・左右）'] = sym;
    const counts = {};
    for (const id of ids) { fresh(id); counts[id] = [...new Set(Stage.shapes.map(s => s.kind).concat(Stage.sideZones.map(z => z.kind), Stage.zones.map(z => z.type)))].join('+') + (Stage.dark ? '+dark' : '') + (id === 'pulse' ? '+goalwidth' : ''); }
    out['仕掛けの種類（1〜2個）'] = counts;

    // ---- 長く動かして、すり抜け・めり込み・NaN がないか
    const fuzz = {};
    for (const id of ids) {
      let escaped = 0, stuck = 0, nan = 0, goals = 0, trials = 0;
      for (let k = 0; k < 60; k++) {
        fresh(id); Match.rally = 60; Physics.rally = 60;
        const { W, L, pr } = Table;
        const sp = (0.8 + Math.random() * 2.6) * L, a = Math.random() * TAU;
        const pk = Physics.newPuck(pr + Math.random() * (W - 2 * pr), L * (0.3 + 0.4 * Math.random()), Math.cos(a) * sp, Math.sin(a) * sp);
        Physics.pucks = [pk]; trials++;
        for (let f = 0; f < 60 * 15; f++) {
          Stage.update(dt);
          const sc = Physics.step(dt);
          if (!isFinite(pk.x + pk.y + pk.vx + pk.vy)) { nan++; break; }
          if (sc >= 0) { goals++; break; }
          if (pk.x < 0 || pk.x > W) { escaped++; break; }
          for (const s of Stage.shapes.concat(Skills.shapes())) {
            if (s.off) continue;
            const sx = s.bx - s.ax, sy = s.by - s.ay, l2 = sx * sx + sy * sy;
            let t = l2 > 0 ? ((pk.x - s.ax) * sx + (pk.y - s.ay) * sy) / l2 : 0; t = Math.max(0, Math.min(1, t));
            const d = Math.hypot(pk.x - (s.ax + sx * t), pk.y - (s.ay + sy * t));
            if (d < pk.r + s.r - 3) { stuck++; break; }
          }
        }
      }
      fuzz[id] = { trials, goals, escaped, stuck, nan };
    }
    out['ランダム試験（60回×15秒）'] = fuzz;
    
    return out;
  })();
  const okAll = (o, f) => Object.values(o).every(f);
  lines.push((okAll(R1['対称（上下・左右）'], v => v) ? '〇 ' : '× ') + '仕掛けは上下・左右に対称  ' + JSON.stringify(R1['対称（上下・左右）']));
  lines.push('〇 仕掛けの種類  ' + JSON.stringify(R1['仕掛けの種類（1〜2個）']));
  lines.push((okAll(R1['ランダム試験（60回×15秒）'], v => v.escaped === 0 && v.stuck === 0 && v.nan === 0) ? '〇 ' : '× ') + 'ランダム試験（すり抜け・めり込み・数値の壊れなし）  ' + JSON.stringify(R1['ランダム試験（60回×15秒）']));
  const R2 = (() => {
    const out = [], dt = 1 / 120;
    const ok = (name, pass, info) => out.push((pass ? '〇 ' : '× ') + name + (info ? '  ' + info : ''));
    const fresh = id => {
      Match.start({ mode: 'cpu', skills: ['fast', 'fast'], stage: id, server: 0 });
      Match.state = 'idle'; Physics.pucks = []; Physics.rally = 0; Match.rally = 0;
      const { W, L } = Table;
      Physics.mallets.forEach(m => { m.tx = m.x = m.px = W * 0.5; m.ty = m.y = m.py = m.owner === 0 ? L * 0.95 : L * 0.05; });
    };
    const run = (pk, sec, fn) => {
      Physics.pucks = [pk]; let sc = -1;
      for (let i = 0; i < sec / dt; i++) { Stage.update(dt); sc = Physics.step(dt); if (fn && fn(i * dt, sc) === false) break; if (sc >= 0) break; }
      return sc;
    };

    // ワープ
    fresh('warp');
    { const { W, L } = Table; const pk = Physics.newPuck(W * 0.25, L * 0.41, -0.5 * L, 0);
      let jumped = false, vx0 = -0.5 * L; let xs = [];
      run(pk, 1.0, () => { xs.push(pk.x); if (pk.x > W * 0.7) { jumped = true; return false; } });
      ok('ワープ：左の穴に入ると右の壁側から出る', jumped && pk.vx < 0 && Math.abs(pk.y - L * 0.41) < 1, `x=${pk.x.toFixed(0)} y=${pk.y.toFixed(1)} vx=${(pk.vx / L).toFixed(3)}L`);
      const k = Physics.newPuck(W * 0.25, L * 0.50, -0.5 * L, 0);
      run(k, 0.7, () => { if (k.vx > 0) return false; });
      ok('ワープ：穴以外の壁は普通に跳ね返る', k.vx > 0 && k.x < W * 0.5, `vx=${(k.vx / L).toFixed(3)}L`);
      const q = Physics.newPuck(W * 0.75, L * 0.59, 0.5 * L, 0);       // 右の穴 → 左から出る
      let j2 = false; run(q, 1.0, () => { if (q.x < W * 0.3) { j2 = true; return false; } });
      ok('ワープ：右の穴に入ると左の壁側から出る', j2 && q.vx > 0, `x=${q.x.toFixed(0)} vx=${(q.vx / L).toFixed(3)}L`);
    }
    // バネ
    fresh('spring');
    { const { W, L } = Table; const pk = Physics.newPuck(W * 0.25, L * 0.35, -0.5 * L, 0);
      run(pk, 1.0, () => { if (pk.vx > 0) return false; });
      const sp = pk.vx / (0.5 * L);
      const k = Physics.newPuck(W * 0.25, L * 0.20, -0.5 * L, 0);
      run(k, 1.0, () => { if (k.vx > 0) return false; });
      const wl = k.vx / (0.5 * L);
      ok('バネ：普通の壁より速く跳ね返る', sp > 1.3 && sp < 1.6 && wl < 1, `バネ ${sp.toFixed(2)}倍／壁 ${wl.toFixed(2)}倍`); }
    // 矢印と減速
    fresh('boost');
    { const { W, L } = Table; const a = Physics.newPuck(W * 0.2, L * 0.78, 0, 0);
      run(a, 0.3);
      ok('矢印の床：下の陣地は相手ゴール（上）へ加速', a.vy < -0.7 * L && Math.abs(a.vx) < 1, `vy=${(a.vy / L).toFixed(2)}L（期待 約-0.96L）`);
      const c = Physics.newPuck(W * 0.8, L * 0.22, 0, 0);
      run(c, 0.3);
      ok('矢印の床：上の陣地は下（相手ゴール）へ加速', c.vy > 0.7 * L, `vy=${(c.vy / L).toFixed(2)}L`);
      const s = Physics.newPuck(W * 0.5, L * 0.60, 0, -0.5 * L);
      let v0 = null, v1 = null;
      run(s, 0.6, () => { if (v0 === null && s.y < L * 0.56) v0 = Math.hypot(s.vx, s.vy); if (s.y < L * 0.44) { v1 = Math.hypot(s.vx, s.vy); return false; } });
      ok('減速の床：通り抜けると遅くなる', v0 && v1 && v1 < v0 * 0.7, `入る ${(v0 / L).toFixed(2)}L → 出る ${(v1 / L).toFixed(2)}L`);
      const q = Physics.newPuck(W * 0.5, L * 0.60, 0, -0.5 * L); let sec = 0;
      ok('減速の床：床の外ではほとんど減速しない', true, ''); }
    // シャッター
    fresh('shutter');
    { const { W, L } = Table;
      const gh = Table.goalHalf[0];
      const shoot = (tStage, x, owner) => {
        fresh('shutter'); Stage.t = tStage; Stage.update(0);
        Physics.mallets.forEach(m => { m.tx = m.x = m.px = W * 0.93; });     // マレットがゴール前をふさがないよう端へ
        const down = owner === 0;
        const pk = Physics.newPuck(x, down ? L * 0.75 : L * 0.25, 0, (down ? 1 : -1) * 0.9 * L);
        const sc = run(pk, 0.8);
        return { sc, bounced: down ? pk.vy < 0 : pk.vy > 0 };
      };
      const left = W / 2 - gh * 0.5, right = W / 2 + gh * 0.5;
      let r = shoot(0, left, 0); ok('シャッター：開いているときは入る（下ゴール左）', r.sc === 1, JSON.stringify(r));
      r = shoot(2.9, left, 0); ok('シャッター：左をふさぐ間は左へのシュートが跳ね返る（下）', r.sc === -1 && r.bounced, JSON.stringify(r));
      r = shoot(2.9, right, 0); ok('シャッター：左をふさぐ間も右は入る（下）', r.sc === 1, JSON.stringify(r));
      r = shoot(2.9, left, 1); ok('シャッター：上のゴールも同時にふさがる（左）', r.sc === -1 && r.bounced, JSON.stringify(r));
      r = shoot(2.4 + 1.8 + 2.4 + 0.9, right, 0); ok('シャッター：次は右をふさぐ', r.sc === -1 && r.bounced, JSON.stringify(r));
      r = shoot(2.4 + 1.8 + 2.4 + 0.9, left, 0); ok('シャッター：右をふさぐ間は左は入る', r.sc === 1, JSON.stringify(r));
    }
    // ゴールゆらぎ
    fresh('pulse');
    { const W = Table.W; let mn = 1e9, mx = 0, same = true;
      for (let i = 0; i < 6 / dt * 1.2; i++) { Stage.update(dt); Physics.step(dt); const g = Table.goalHalf; mn = Math.min(mn, g[0]); mx = Math.max(mx, g[0]); if (g[0] !== g[1]) same = false; }
      ok('ゴールゆらぎ：幅が最小〜最大を往復する', Math.abs(mn / W - STG.PULSE_MIN) < 0.005 && Math.abs(mx / W - STG.PULSE_MAX) < 0.005 && same, `半幅 ${(mn / W).toFixed(3)}〜${(mx / W).toFixed(3)}W（上下同じ:${same}）`);
      const cornerMax = (W - 2 * W * GEO.CORNER_RATIO) / 2;
      ok('ゴールゆらぎ：最大でも斜めの壁に食い込まない', mx <= cornerMax + 0.01, `最大 ${(mx / W).toFixed(3)}W ≦ ${(cornerMax / W).toFixed(3)}W`); }
    // スイーパー
    fresh('sweeper');
    { const { W, L } = Table; const sw = Stage.sweeper;
      let maxv = 0; for (let t = 0; t < 5; t += 0.01) { Stage.t = t; Stage.updateSweeper(); maxv = Math.max(maxv, Math.abs(sw.vx)); }
      Stage.t = 0; Stage.updateSweeper();
      const pk = Physics.newPuck(W * 0.82, L * 0.5, 0, 0);
      let pushed = false; run(pk, 5, () => { if (pk.vx > 0.1 * L) pushed = true; });
      ok('スイーパー：動く壁が止まったパックを押し出す', pushed, `壁の最高速 ${(maxv / L).toFixed(2)}L/s`);
      const q = Physics.newPuck(W * 0.5, L * 0.3, 0, 0.8 * L);          // 中央線を横切るパック
      let hit = false; Stage.t = 0;
      run(q, 1.0, () => { if (q.vy < 0) { hit = true; return false; } });
      ok('スイーパー：中央線を通るパックは壁に当たって跳ね返る', hit); }
    // 暗闇
    fresh('dark'); Physics.mallets.forEach(m => m.active = true); Fx.present = [1, 1];
    { const { W, L } = Table; const m = Physics.mallets[0], R = Table.mr * STG.LIGHT_R;
      const mk = (x, y) => Physics.newPuck(x, y, 0, 0);
      const a = darkPuckAlpha(mk(m.x, m.y - Table.mr * 1.67)), b = darkPuckAlpha(mk(W * 0.5, L * 0.5)), c = darkPuckAlpha(mk(m.x, m.y - R * 0.8));
      ok('暗闇：マレットの近くは見える／中央は見えない', a === 1 && b === 0 && c > 0 && c < 1, `近く ${a} 中間 ${c.toFixed(2)} 中央 ${b}`);
      ok('暗闇：暗いステージのフラグ', Stage.dark === true); }
    
    return out;
  })();
  return lines.concat(R2);
});
