'use strict';
/* =====================================================================
   ステージの仕掛けの描画（台の座標）
   色は役割ごと：柱＝灰青／バンパー＝桃／バネ＝黄緑／動く壁＝白／ワープ＝紫／矢印の床＝琥珀／減速の床＝青緑／シャッター＝黄
   ===================================================================== */

/* 床：流れる矢印・霜の降りた減速の床 */
function drawStageFloor(t) {
  const W = Table.W;
  for (const z of Stage.zones) {
    const w = z.x1 - z.x0, h = z.y1 - z.y0;
    ctx.save();
    ctx.beginPath(); ctx.rect(z.x0, z.y0, w, h); ctx.clip();
    if (z.type === 'arrow') {
      const lg = ctx.createLinearGradient(0, z.y0, 0, z.y1);
      lg.addColorStop(z.dy < 0 ? 1 : 0, 'rgba(255,179,71,.02)'); lg.addColorStop(z.dy < 0 ? 0 : 1, 'rgba(255,179,71,.20)');
      ctx.fillStyle = lg; ctx.fillRect(z.x0, z.y0, w, h);
      const sz = Math.min(w, h) * 0.42, gap = sz * 0.95, off = (t * sz * 2.2) % gap, cx = z.x0 + w / 2;
      ctx.lineWidth = W * 0.013; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let k = -1; k * gap < h + gap; k++) {
        const y = z.dy < 0 ? z.y1 - off - k * gap : z.y0 + off + k * gap;
        const u = clamp((z.dy < 0 ? z.y1 - y : y - z.y0) / h, 0, 1);       // 進む向きほど明るく
        ctx.strokeStyle = rgba(STAGE_COLOR.arrow, 0.25 + 0.7 * u);
        ctx.beginPath();
        ctx.moveTo(cx - sz * 0.6, y - z.dy * sz * 0.32);
        ctx.lineTo(cx, y + z.dy * sz * 0.32);
        ctx.lineTo(cx + sz * 0.6, y - z.dy * sz * 0.32);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(46,196,196,.13)'; ctx.fillRect(z.x0, z.y0, w, h);
      ctx.strokeStyle = 'rgba(120,230,230,.28)'; ctx.lineWidth = W * 0.005;
      const step = W * 0.032, sh = (t * W * 0.01) % step;
      ctx.beginPath();
      for (let d = -h + sh; d < w; d += step) { ctx.moveTo(z.x0 + d, z.y1); ctx.lineTo(z.x0 + d + h, z.y0); }
      ctx.stroke();
      for (let i = 0; i < 7; i++) {                                         // 霜のきらめき
        const k = (t * 0.6 + i * 0.37) % 1, x = z.x0 + w * ((i * 0.618) % 1), y = z.y0 + h * ((i * 0.41 + 0.2) % 1);
        glowAt(x, y, W * 0.02, '#c9ffff', Math.sin(k * Math.PI) * 0.5);
      }
    }
    ctx.restore();
    ctx.strokeStyle = z.type === 'arrow' ? 'rgba(255,179,71,.55)' : 'rgba(46,196,196,.6)';
    ctx.lineWidth = W * 0.005;
    ctx.setLineDash([W * 0.02, W * 0.014]);
    ctx.strokeRect(z.x0, z.y0, w, h);
    ctx.setLineDash([]);
  }
}

/* バネの壁：ジグザグのコイル。当たると縮んで、光る */
function drawSpringWall(w, t) {
  const W = Table.W, x = w.ax, inward = x < W / 2 ? 1 : -1, side = x < W / 2 ? 0 : 1, n = 9;
  let squash = 0;
  for (const s of Fx.springKick) {
    if (s.side !== side || s.y < w.ay - 10 || s.y > w.by + 10) continue;
    squash = Math.max(squash, Math.sin(Math.PI * clamp(s.t / 0.35, 0, 1)) * (1 - s.t / 0.4));
  }
  const amp = W * (0.022 - 0.012 * squash);
  ctx.save();
  glowAt(x + inward * W * 0.02, (w.ay + w.by) / 2, (w.by - w.ay) * 0.6, STAGE_COLOR.spring, 0.18 + 0.5 * squash);
  ctx.strokeStyle = rgba(STAGE_COLOR.spring, 0.3); ctx.lineWidth = W * 0.03; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, w.ay); ctx.lineTo(x, w.by); ctx.stroke();
  ctx.strokeStyle = mix(STAGE_COLOR.spring, '#ffffff', 0.3 * squash); ctx.lineWidth = W * 0.009; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, w.ay);
  for (let i = 1; i < n; i++) ctx.lineTo(x + (i % 2 ? inward * amp : inward * amp * 0.15), lerp(w.ay, w.by, i / n));
  ctx.lineTo(x, w.by);
  ctx.stroke();
  for (const y of [w.ay, w.by]) { ctx.fillStyle = STAGE_COLOR.spring; circle(x, y, W * 0.012); ctx.fill(); }
  ctx.restore();
}

/* ワープ穴：壁が切れて、紫の渦の出入り口になる */
function drawPortalWall(w, t) {
  const W = Table.W, inward = w.ax < W / 2 ? 1 : -1, depth = W * 0.08, cy = (w.ay + w.by) / 2, hl = (w.by - w.ay) / 2;
  ctx.save();
  const gl = ctx.createLinearGradient(w.ax, 0, w.ax + inward * depth, 0);
  gl.addColorStop(0, 'rgba(157,123,255,.6)'); gl.addColorStop(1, 'rgba(157,123,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(inward > 0 ? w.ax : w.ax - depth, w.ay, depth, w.by - w.ay);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {                                    // 渦を巻いて吸い込まれる光
    const k = ((t * 0.8 + i / 7) % 1), yy = cy + Math.sin((i * 2.1 + t * 3)) * hl * (1 - k) * 0.9;
    glowAt(w.ax + inward * depth * (1 - k) * 0.9, yy, W * 0.018, '#c4b0ff', k * 0.8);
  }
  ctx.strokeStyle = STAGE_COLOR.warp; ctx.lineWidth = W * 0.016; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 5);
  ctx.beginPath(); ctx.moveTo(w.ax, w.ay); ctx.lineTo(w.bx, w.by); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#efe8ff'; ctx.lineWidth = W * 0.005;
  ctx.beginPath(); ctx.moveTo(w.ax, w.ay); ctx.lineTo(w.bx, w.by); ctx.stroke();
  ctx.restore();
}

/* 八角形のパス（内接円の半径が r。当たり判定の円と、平らな辺がちょうど重なる） */
function octPath(x, y, r, rot = Math.PI / 8) {
  const R = r / Math.cos(Math.PI / 8);
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = rot + k * TAU / 8; const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}

/* 柱：台に固定された八角形の金属の塊（玉に見えないよう、平らな面と角、ボルト） */
function drawPillar(s, t) {
  const r = s.r, x = s.ax, y = s.ay, f = s.flash || 0, th = theme();
  const metal = th.pillar || STAGE_COLOR.pillar, s0 = lightSign();
  ctx.save();
  octPath(x, y, r * 1.2);                                       // 台に埋めこまれた土台
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
  ctx.strokeStyle = rgba(th.line, 0.35); ctx.lineWidth = r * 0.06; ctx.stroke();
  octPath(x + s0 * r * 0.06, y + s0 * r * 0.1, r);              // ほんの少しの影（浮いていない）
  ctx.fillStyle = 'rgba(0,0,10,.5)'; ctx.fill();
  octPath(x, y, r);                                             // 側面（グラデーションは位置と色が変わったときだけ作り直す）
  const gk = x + '|' + y + '|' + r + '|' + s0 + '|' + metal;
  if (s._gk !== gk) {
    s._gk = gk;
    s._grad = ctx.createLinearGradient(x - s0 * r, y - s0 * r, x + s0 * r, y + s0 * r);
    s._grad.addColorStop(0, shade(metal, 0.25)); s._grad.addColorStop(1, shade(metal, -0.55));
  }
  ctx.fillStyle = s._grad; ctx.fill();
  octPath(x, y, r * 0.72);                                      // 上の面（平ら）
  ctx.fillStyle = shade(metal, -0.1); ctx.fill();
  ctx.strokeStyle = shade(metal, 0.45); ctx.lineWidth = r * 0.07; ctx.stroke();
  ctx.fillStyle = shade(metal, -0.6);                           // ボルト
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; circle(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48, r * 0.07); ctx.fill(); }
  ctx.strokeStyle = rgba(th.line, 0.7); ctx.lineWidth = r * 0.08;   // 中央の印
  ctx.beginPath(); ctx.moveTo(x - r * 0.2, y); ctx.lineTo(x + r * 0.2, y); ctx.moveTo(x, y - r * 0.2); ctx.lineTo(x, y + r * 0.2); ctx.stroke();
  if (f > 0) { octPath(x, y, r); ctx.strokeStyle = rgba('#ffffff', 0.9 * f); ctx.lineWidth = r * 0.14; ctx.stroke(); }
  ctx.restore();
}

/* バンパー：ピンボールの跳ね返し台。歯車のような土台・回る光の輪・平らなふた（当たると輪が光って広がる） */
function drawBumper(s, t) {
  const r = s.r, x = s.ax, y = s.ay, f = s.flash || 0, col = STAGE_COLOR.bumper;
  ctx.save();
  ctx.beginPath();                                              // 歯車の形の土台
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, rr = r * (k % 2 ? 1.08 : 1.22); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
  ctx.fillStyle = '#1a0d22'; ctx.fill();
  ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = r * 0.05; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(x, y, r * (1.8 + 1.2 * f), col, 0.25 + 0.6 * f);
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'butt';                                         // 区切られた光の輪（ゆっくり回る）
  ctx.strokeStyle = mix(col, '#ffffff', 0.5 * f); ctx.lineWidth = r * 0.22;
  const seg = 8, rot = t * 0.8;
  for (let k = 0; k < seg; k++) { ctx.beginPath(); ctx.arc(x, y, r * (0.86 + 0.12 * f), rot + k * TAU / seg + 0.08, rot + (k + 1) * TAU / seg - 0.08); ctx.stroke(); }
  ctx.fillStyle = '#2a1238'; circle(x, y, r * 0.66); ctx.fill();   // 平らなふた
  ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = r * 0.05; circle(x, y, r * 0.66); ctx.stroke();
  ctx.fillStyle = f > 0 ? mix(col, '#ffffff', f) : col;            // 星の印
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + k * Math.PI / 4, rr = r * (k % 2 ? 0.16 : 0.42); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* 柱・バンパー・往復する壁・シャッター */
function drawStageShapes(t) {
  const s0 = lightSign(), W = Table.W;
  for (const s of Stage.shapes) {
    if (s.kind === 'pillar') drawPillar(s, t);
    else if (s.kind === 'bumper') drawBumper(s, t);
    else if (s.kind === 'sweeper') {                      // 往復する壁：白い光の棒。流れる模様と、動く向きの残像
      const f = s.flash || 0;
      ctx.save();
      ctx.lineCap = 'round';
      const dir = Math.sign(s.vx) || 1;
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = rgba(STAGE_COLOR.mover, 0.08 / i); ctx.lineWidth = s.r * 2;
        const o = -dir * i * Math.abs(s.vx) * 0.025;
        ctx.beginPath(); ctx.moveTo(s.ax + o, s.ay); ctx.lineTo(s.bx + o, s.by); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#9fb6ff', 0.35 + 0.4 * f); ctx.lineWidth = s.r * 4.5;
      ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = mix(STAGE_COLOR.mover, '#ffffff', f); ctx.lineWidth = s.r * 2;
      ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,80,150,.55)'; ctx.lineWidth = s.r * 0.6;
      ctx.setLineDash([s.r * 1.4, s.r * 1.4]); ctx.lineDashOffset = -t * W * 0.12 * dir;
      ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by); ctx.stroke();
      ctx.restore();
    }
  }
  drawShutters(t);
}

/* シャッター：黄色と黒のしま模様。閉まる前に、閉まる側が点滅して予告する */
function drawShutters(t) {
  if (!Stage.shutters.length) return;
  const W = Table.W, info = Stage.shutterInfo;
  for (const s of Stage.shutters) {
    const gh = Table.goalHalf[s.owner], cx = W / 2, y = Table.goalY(s.owner), dir = s.owner === 0 ? -1 : 1;
    if (info.warn > 0) {                                    // 予告：ふさがる側のゴールの半分が点滅
      const blink = 0.5 + 0.5 * Math.sin(t * 28);
      const x0 = info.side < 0 ? cx - gh : cx, x1 = info.side < 0 ? cx : cx + gh;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(STAGE_COLOR.shutter, 0.4 * info.warn * blink);
      ctx.fillRect(x0, Math.min(y, y + dir * Table.pr * 1.4), x1 - x0, Table.pr * 1.4);
      ctx.restore();
    }
    if (s.off) continue;
    const len = s.bx - s.ax, th = s.r * 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt((s.ax + s.bx) / 2, y, Math.max(len, th) * 0.7, STAGE_COLOR.shutter, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.rect(s.ax, y - s.r, len, th); ctx.clip();
    ctx.fillStyle = STAGE_COLOR.shutter; ctx.fillRect(s.ax, y - s.r, len, th);
    ctx.fillStyle = '#1b1606';
    const st = th * 1.2;
    for (let x = s.ax - th * 2; x < s.bx + th; x += st * 2) {
      ctx.beginPath(); ctx.moveTo(x, y + s.r); ctx.lineTo(x + st, y + s.r); ctx.lineTo(x + st + th, y - s.r); ctx.lineTo(x + th, y - s.r); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = W * 0.004;
    ctx.strokeRect(s.ax, y - s.r, len, th);
  }
}

/* 防壁（必殺技）：六角形の模様の光の盾。ゴールの線から台の内側へ厚く見せる。終わる前に点滅する */
function drawBarriers(t) {
  const W = Table.W;
  for (const b of Skills.shapes()) {
    const left = Skills.state.wall[b.owner], age = SKILL.WALL_TIME - left;
    const grow = easeOutCubic(age / 0.25), fade = left < 0.7 ? 0.45 + 0.55 * Math.abs(Math.sin(t * 22)) : 1;
    const cx = (b.ax + b.bx) / 2, hl = (b.bx - b.ax) / 2 * grow, y = b.ay, r = b.r, col = SKILL_TYPE.defense.color;
    const dir = b.owner === 0 ? -1 : 1, depth = r * 3.2;             // 台の内側の向きと、見た目の厚み
    const y0 = Math.min(y, y + dir * depth), hgt = depth + r;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.globalCompositeOperation = 'lighter';
    glowAt(cx, y + dir * r, hl * 1.1, col, 0.4);
    ctx.beginPath(); ctx.rect(cx - hl, Math.min(y0, y - dir * r), hl * 2, hgt + r); ctx.clip();
    const lg = ctx.createLinearGradient(0, y, 0, y + dir * depth);
    lg.addColorStop(0, rgba(col, 0.45)); lg.addColorStop(1, rgba(col, 0.04));
    ctx.fillStyle = lg; ctx.fillRect(cx - hl, Math.min(y0, y - dir * r), hl * 2, hgt + r);
    ctx.strokeStyle = rgba('#b9ffe0', 0.5); ctx.lineWidth = W * 0.003;
    const hs = r * 0.85, sh = (t * W * 0.04) % (hs * 3);
    for (let row = 0; row < 3; row++) {
      const yy = y + dir * (row * hs * 1.5 + hs * 0.2);
      for (let x = cx - hl - hs * 3 + sh + (row % 2) * hs * 1.5; x < cx + hl + hs * 3; x += hs * 3) {
        ctx.globalAlpha = fade * (1 - row * 0.3);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; const px = x + Math.cos(a) * hs, py = yy + Math.sin(a) * hs; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#d9fff0'; ctx.lineWidth = W * 0.007;              // パックが跳ね返る位置
    ctx.beginPath(); ctx.moveTo(cx - hl, y + dir * r); ctx.lineTo(cx + hl, y + dir * r); ctx.stroke();
    ctx.restore();
  }
}
