'use strict';
/* =====================================================================
   画面に重ねる表示（画面の座標で描く。ゲストでも逆さにならない）
   試合中に出す文字はゴールとカウントダウンの数字だけ。ほかは記号と光で伝える
   - 角の三角形のゲージ：液体が満ちていくように溜まり、満タンで金色に光る。中に技のマーク
   - 必殺技は発動の瞬間の演出を出さない（いきなり使われるのが面白い）。ゲージが空になるだけ
   - 試合の始め：両者の技のマーク／得点後：サーブ側のパックから光の輪／マレットが消えているとき：触れる場所の波紋
   ===================================================================== */

/* 三角形の3点（画面の座標）：角 C、壁ぞいの点 V、ゴールの線ぞいの点 H */
function triPoints(owner, side) {
  const { W, L, D } = Table, y = Table.goalY(owner), x = side === 0 ? 0 : W;
  const dy = owner === 0 ? -D : D, dx = side === 0 ? D : -D;
  return { C: scr(x, y), V: scr(x, y + dy), H: scr(x + dx, y) };
}

function drawGauges(t) {
  screenTransform();
  for (const owner of [0, 1]) for (const side of [0, 1]) drawGaugeTri(owner, side, t);
}

function drawGaugeTri(owner, side, t) {
  const { C, V, H } = triPoints(owner, side);
  const mine = owner === Match.me, col = ownerColor(owner);
  const fill = clamp(Fx.gaugeShow[owner], 0, 1), full = Match.shownGauge(owner) >= 1;   // 相手が攻撃の技を構えている間は満タンに見せる
  const sk = SKILLS.find(s => s.id === Match.skill[owner]) || SKILLS[0];
  const tcol = SKILL_TYPE[sk.type].color;
  let shake = 0;
  if (mine && Fx.denyT[side] < 0.35) shake = Math.sin(Fx.denyT[side] * 70) * 5 * (1 - Fx.denyT[side] / 0.35);
  ctx.save();
  ctx.translate(shake, 0);
  const path = () => { ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(V.x, V.y); ctx.lineTo(H.x, H.y); ctx.closePath(); };
  // 地：角ほど暗く、斜めの辺に向かって持ち主の色がにじむ
  path();
  const bg = ctx.createLinearGradient(C.x, C.y, (V.x + H.x) / 2, (V.y + H.y) / 2);
  bg.addColorStop(0, '#04081a'); bg.addColorStop(1, mix('#04081a', col, mine ? 0.28 : 0.2));
  ctx.fillStyle = bg; ctx.fill();
  ctx.save();
  path(); ctx.clip();
  // 液体：面積が溜まった割合になる高さ（三角形なので、底のほうが広い）
  const hgt = V.y - C.y, lvl = full ? 1 : 1 - Math.sqrt(1 - fill), sy = C.y + hgt * lvl;
  const xmin = Math.min(C.x, H.x) - 10, xmax = Math.max(C.x, H.x) + 10;
  const liquid = full ? COLORS.ready : col;
  if (lvl > 0.001) {
    const amp = (2 + 5 * Fx.gaugeSplash[owner]) * (full ? 0.6 : 1), dir = Math.sign(hgt);
    const grd = ctx.createLinearGradient(0, C.y, 0, sy);
    grd.addColorStop(0, shade(liquid, -0.35)); grd.addColorStop(1, shade(liquid, 0.15));
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.moveTo(xmin, C.y - dir * 20);
    for (let x = xmin; x <= xmax; x += 4) ctx.lineTo(x, sy + Math.sin(x * 0.12 + t * 5 * (side ? -1 : 1)) * amp + Math.sin(x * 0.05 - t * 3) * amp * 0.6);
    ctx.lineTo(xmax, C.y - dir * 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 1.5;                 // 水面のきらめき
    ctx.beginPath();
    for (let x = xmin; x <= xmax; x += 4) { const y = sy + Math.sin(x * 0.12 + t * 5 * (side ? -1 : 1)) * amp + Math.sin(x * 0.05 - t * 3) * amp * 0.6; x === xmin ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    for (let i = 0; i < 6; i++) {                                                  // 泡
      const ph = (t * (0.5 + i * 0.07) + i * 0.173) % 1;
      const bx = lerp(C.x, H.x, 0.12 + ((i * 0.37) % 0.6)), by = lerp(C.y, sy, ph);
      ctx.fillStyle = rgba('#ffffff', 0.35 * Math.sin(ph * Math.PI));
      circle(bx, by, 1.5 + (i % 3)); ctx.fill();
    }
  }
  if (full) {                                                                      // 満タン：斜めの光が走る
    const k = (t * 0.9) % 1.6 - 0.3, len = Math.hypot(H.x - C.x, V.y - C.y);
    const gx = lerp(Math.min(C.x, H.x) - len * 0.3, Math.max(C.x, H.x) + len * 0.3, k);
    const sg = ctx.createLinearGradient(gx - len * 0.25, 0, gx + len * 0.25, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(xmin, Math.min(C.y, V.y) - 10, xmax - xmin, Math.abs(hgt) + 20);
  }
  if (mine && Fx.denyT[side] < 0.35) { ctx.fillStyle = rgba('#ff3b55', 0.4 * (1 - Fx.denyT[side] / 0.35)); ctx.fillRect(xmin, Math.min(C.y, V.y) - 10, xmax - xmin, Math.abs(hgt) + 20); }
  ctx.restore();
  // 縁：満タンなら脈打つ金色の光
  path();
  if (full) {
    const pz = 0.5 + 0.5 * Math.sin(t * 7 + (mine ? 0 : 1));
    ctx.save();
    ctx.shadowColor = COLORS.ready; ctx.shadowBlur = 10 + 14 * pz;
    ctx.strokeStyle = mix(COLORS.ready, '#ffffff', 0.4 * pz); ctx.lineWidth = 2.5 + 1.5 * pz;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = rgba(col, 0.3); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = rgba(mix(col, '#ffffff', 0.3), 0.9); ctx.lineWidth = 2.5;      // 斜めの辺をはっきり
    ctx.beginPath(); ctx.moveTo(V.x, V.y); ctx.lineTo(H.x, H.y); ctx.stroke();
  }
  // 技のマーク（文字は使わない）。満タンなら金色に光って脈打ち、構え中はマークのまわりを輪が回る
  const underPause = !mine && side === (Layout.flip ? 1 : 0);                    // 左上は一時停止ボタンがあるので出さない
  if (!underPause) {
    const leg = Math.abs(H.x - C.x), mx = C.x + (H.x - C.x) * 0.34, my = C.y + (V.y - C.y) * 0.34;
    const armed = mine && !!Skills.state.armed[owner], pz = 0.5 + 0.5 * Math.sin(t * 7 + owner);   // 構え中は自分にだけ見せる
    const ms = leg * 0.4 * (full ? 1 + 0.1 * pz : 1);
    const mc = full ? '#fffdf2' : armed ? SKILL_TYPE.attack.color : tcol;          // 満タン：金色の液体の上で目立つよう白く
    if (full) { ctx.fillStyle = 'rgba(60,40,0,.35)'; circle(mx, my, ms * 0.62); ctx.fill(); }   // 白いマークが金色に埋もれないよう、うすい影
    ctx.globalAlpha = full || armed ? 1 : 0.8;
    drawSkillMark(ctx, sk.id, mx, my, ms, mc, { glow: full ? 0.5 + 0.5 * pz : armed ? 0.6 : 0 });
    ctx.globalAlpha = 1;
    if (armed) {
      ctx.save();
      ctx.strokeStyle = SKILL_TYPE.attack.color; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 30;
      circle(mx, my, ms * 0.66); ctx.stroke();
      ctx.restore();
    }
  }
  if (Fx.gaugeFullT[owner] < 0.5) {                                                // 満タンになった瞬間の輪
    const u = Fx.gaugeFullT[owner] / 0.5;
    path(); ctx.strokeStyle = rgba('#ffffff', 1 - u); ctx.lineWidth = 6 * (1 - u); ctx.stroke();
  }
  ctx.restore();
}

/* 台の中央の座標（画面） */
function centerScr() { return scr(Table.W / 2, Table.L / 2); }

/* カウントダウン（数字）・試合の始めの技の紹介（マーク）・サーブの合図（光の輪）。文字は出さない */
function drawCountdown(t) {
  const c = Fx.countAnim, W = Table.W * Layout.scale;
  screenTransform();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cs = centerScr();
  if (c && c.n > 0 && Match.state === 'countdown') {
    const u = clamp(c.t / 0.35, 0, 1), s = lerp(2.2, 1, easeOutBack(u)), a = clamp(1.3 - c.t, 0, 1);
    const px = W * 0.32 * s;
    ctx.globalAlpha = a;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glowAt(cs.x, cs.y, px * 1.2, COLORS.ui, 0.5 * a);
    ctx.restore();
    outlinedText(String(c.n), cs.x, cs.y, px, '#ffffff', 'rgba(10,16,48,.9)', 0.12);
    ctx.globalAlpha = 1;
  }
  if (Match.state === 'countdown' && Match.intro) {                                 // 試合の始め：両者の技のマーク（自分は左下、相手は右上）
    const e = FLOW.COUNTDOWN - Match.timer, k = easeOutBack(clamp(e / 0.45, 0, 1)), a = clamp(Match.timer / 0.4, 0, 1);
    for (const o of [0, 1]) {
      const sk = SKILLS.find(q => q.id === Match.skill[o]);
      if (!sk) continue;
      const p = scr(o === 0 ? Table.W * 0.25 : Table.W * 0.75, o === 0 ? Table.L * 0.7 : Table.L * 0.3);
      const size = W * 0.18 * Math.max(0.01, k);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(6,10,28,.75)'; circle(p.x, p.y, size * 0.78); ctx.fill();
      ctx.strokeStyle = ownerColor(o); ctx.lineWidth = 3; circle(p.x, p.y, size * 0.78); ctx.stroke();
      drawSkillMark(ctx, sk.id, p.x, p.y, size, SKILL_TYPE[sk.type].color, { glow: 0.5 });
    }
    ctx.globalAlpha = 1;
  }
  if (Match.state === 'countdown' && !Match.intro && Physics.pucks[0]) {           // 得点後：サーブする側の色の輪がパックから広がる
    const q = Physics.pucks[0], p = scr(q.x, q.y), col = ownerColor(Match.server), r = q.r * Layout.scale;
    ctx.save();
    for (const ph of [(t * 1.4) % 1, (t * 1.4 + 0.5) % 1]) {
      ctx.strokeStyle = rgba(col, 0.85 * (1 - ph)); ctx.lineWidth = 3;
      circle(p.x, p.y, r * (1.25 + ph * 2)); ctx.stroke();
    }
    ctx.restore();
  }
}

/* ゴールの文字：たたきつけるように大きく出て、光の筋が走る */
function drawGoalAnim(t) {
  const g = Fx.goalAnim;
  if (!g || g.t > 1.6) return;
  const W = Table.W * Layout.scale, cs = centerScr(), mine = g.scorer === Match.me;
  const col = mine ? COLORS.me : COLORS.opp;
  screenTransform();
  const u = clamp(g.t / 0.28, 0, 1), s = lerp(2.8, 1, easeOutBack(u)), a = clamp((1.6 - g.t) / 0.4, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {                                                     // 横に走る光の筋
    const y = cs.y + (i - 4) * W * 0.035 + Math.sin(i * 7.1) * 6, k = ((g.t * 1.8 + i * 0.13) % 1);
    const x0 = lerp(-W * 0.2, Layout.vw, k);
    const lg = ctx.createLinearGradient(x0, 0, x0 + W * 0.5, 0);
    lg.addColorStop(0, rgba(col, 0)); lg.addColorStop(0.7, rgba(col, 0.55)); lg.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = lg; ctx.fillRect(x0, y - 1.5, W * 0.5, 3);
  }
  glowAt(cs.x, cs.y, W * 0.55 * s, col, 0.55);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cs.x, cs.y); ctx.rotate(-0.06 * (1 - u)); ctx.scale(s, s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  outlinedText(mine ? 'ゴール！' : '失点…', 0, 0, W * 0.17, mine ? '#ffffff' : '#ffd6de', rgba(shade(col, -0.6), 0.95), 0.14);
  ctx.fillStyle = col;
  ctx.globalAlpha = a * clamp((g.t - 0.25) / 0.2, 0, 1);
  outlinedText(Match.score[Match.me] + ' - ' + Match.score[1 - Match.me], 0, W * 0.15, W * 0.08, mix(col, '#ffffff', 0.5));
  ctx.restore();
}

/* 浮かぶ文字（いまは使っていない。試合中に出す文字はゴールだけにしている） */
function drawTexts() {
  screenTransform();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const tx of Fx.texts) {
    const u = 1 - tx.life / tx.max, p = scr(tx.x, tx.y);
    const s = u < 0.2 ? easeOutBack(u / 0.2) : 1, a = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
    ctx.globalAlpha = a;
    const px = tx.size * Layout.scale * s;
    ctx.font = font(px);
    const hw = ctx.measureText(tx.s).width / 2 + 8;                                  // 画面の端からはみ出さないように
    const x = clamp(p.x, hw, Math.max(hw, Layout.vw - hw));
    outlinedText(tx.s, x, p.y - u * tx.rise * Layout.vh, px, tx.color);
  }
  ctx.globalAlpha = 1;
}

/* ラリー回数：中央線の右端に。増えた瞬間に弾む。2個目が近づくと色が変わる */
function drawRally(t) {
  if (Match.rally <= 0 || Match.state !== 'play') return;
  screenTransform();
  const p = scr(Table.W, Table.L / 2), n = Match.rally, pop = Fx.rallyPop ? Fx.rallyPop.t : 9;
  const s = pop < 0.3 ? 1 + 0.5 * Math.sin(Math.PI * pop / 0.3) : 1;
  const near = !Match.second && n >= TUNE.SECOND_PUCK_RALLY - 3;
  const col = near ? mix(COLORS.ui, COLORS.ready, 0.5 + 0.5 * Math.sin(t * 10)) : mix('#8fb0ff', COLORS.ready, Fx.heat);
  const x = Layout.flip ? scr(0, Table.L / 2).x : p.x;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const size = Table.W * Layout.scale * 0.045;
  ctx.globalAlpha = 0.9;
  outlinedText(String(n), x - 8, p.y, size * 1.5 * s, col);
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';                   // 打ち合いの記号（上下の矢印）
  const ax = x - 8 - size * 0.5, ay = p.y - size * 1.5;
  ctx.beginPath();
  ctx.moveTo(ax - size * 0.3, ay - size * 0.35); ctx.lineTo(ax - size * 0.3, ay + size * 0.35); ctx.lineTo(ax - size * 0.45, ay + size * 0.15);
  ctx.moveTo(ax + size * 0.3, ay + size * 0.35); ctx.lineTo(ax + size * 0.3, ay - size * 0.35); ctx.lineTo(ax + size * 0.45, ay - size * 0.15);
  ctx.stroke();
  if (near) {                                                                        // 2個目までの残りを金の点で
    const left = TUNE.SECOND_PUCK_RALLY - n;
    for (let i = 0; i < left; i++) { ctx.fillStyle = COLORS.ready; circle(x - 8 - size * 0.25 - i * size * 0.55, p.y + size * 1.25, size * 0.17); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

/* 指を離していてマレットが消えているとき：触れる場所の目印（波紋）を出す */
function drawTouchHint(t) {
  if (!Match.active || Match.paused || Physics.mallets[Match.me] && Physics.mallets[Match.me].active) return;
  if (Match.state !== 'countdown' && Fx.inactiveT[Match.me] < 1.0) return;
  const p = scr(Table.W / 2, Match.me === 0 ? Table.L * 0.84 : Table.L * 0.16), r = Table.mr * Layout.scale;
  screenTransform();
  ctx.save();
  for (const ph of [(t * 0.9) % 1, (t * 0.9 + 0.5) % 1]) {
    ctx.strokeStyle = rgba(COLORS.me, 0.6 * (1 - ph)); ctx.lineWidth = 2.5;
    circle(p.x, p.y, r * (0.5 + ph * 1.4)); ctx.stroke();
  }
  ctx.fillStyle = rgba(COLORS.me, 0.5 + 0.2 * Math.sin(t * 5)); circle(p.x, p.y, r * 0.28); ctx.fill();
  ctx.restore();
}

function drawFlash() {
  const f = Fx.flash;
  screenTransform(false);
  if (f) {
    ctx.fillStyle = rgba(f.color, f.a * (f.life / f.max));
    ctx.fillRect(0, 0, Layout.vw, Layout.vh);
  }
  // ふち（いつも少しだけ暗く）
  const vg = ctx.createRadialGradient(Layout.vw / 2, Layout.vh / 2, Math.min(Layout.vw, Layout.vh) * 0.45, Layout.vw / 2, Layout.vh / 2, Math.max(Layout.vw, Layout.vh) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,10,0)'); vg.addColorStop(1, 'rgba(0,0,10,.35)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, Layout.vw, Layout.vh);
}
