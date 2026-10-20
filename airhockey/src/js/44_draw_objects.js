'use strict';
/* =====================================================================
   パック・マレット・粒の描画（台の座標）
   ===================================================================== */

/* パックの残像：速いほど長く明るい光の帯。最後に打った人の色、速いほど白く、剛速球は炎の色 */
function drawTrail(p, alpha = 1, lightAt = null) {
  const tr = Fx.trails.get(p.id);
  if (!tr || tr.length < 2) return;
  const now = Fx.time, last = tr[tr.length - 1];
  const s = last.s, k = clamp((s - 0.5) / 2.2, 0, 1);
  if (s < 0.35) return;
  let col = p.lastHit >= 0 ? ownerColor(p.lastHit) : '#bcd0ff';
  if (p.skill === 'fast' && p.boost > 1) col = '#ff7a2e';
  else if (p.curve) col = SKILL_TYPE.attack.color;
  const core = mix(col, '#ffffff', 0.35 + 0.4 * k);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 1; i < tr.length; i++) {
    const a = tr[i - 1], b = tr[i];
    let u = 1 - (now - b.t) / FX.TRAIL_TIME;
    if (lightAt) u *= lightAt(b.x, b.y);                      // 暗いステージ：明かりの中の部分だけ見せる
    if (u <= 0.01) continue;
    ctx.strokeStyle = rgba(col, 0.32 * u * alpha * (0.4 + 0.6 * k));
    ctx.lineWidth = p.r * 2 * (0.35 + 0.65 * u);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = rgba(core, 0.5 * u * alpha * (0.3 + 0.7 * k));
    ctx.lineWidth = p.r * 0.7 * u;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

function drawPuck(p, alpha = 1) {
  const vis = (p.vis == null ? 1 : p.vis) * alpha;
  if (vis <= 0.01) return;
  const r = p.r, s0 = lightSign(), sp = Math.hypot(p.vx, p.vy) / Table.L;
  const fire = p.skill === 'fast' && p.boost > 1;
  ctx.save();
  ctx.globalAlpha = vis;
  // 速いときの残像（ぶれ）
  if (sp > 1.6) {
    const n = 3, dx = -p.vx / Table.L * r * 0.5, dy = -p.vy / Table.L * r * 0.5;
    for (let i = n; i >= 1; i--) {
      ctx.globalAlpha = vis * 0.12 * (1 - i / (n + 1));
      ctx.fillStyle = '#ffffff';
      circle(p.x + dx * i, p.y + dy * i, r); ctx.fill();
    }
    ctx.globalAlpha = vis;
  }
  shadowAt(p.x, p.y, r, 0.28, vis);
  if (fire) {                                                  // 剛速球：炎の光
    ctx.globalCompositeOperation = 'lighter';
    glowAt(p.x, p.y, r * (3 + 0.4 * Math.sin(Fx.time * 40)), '#ff6a2e', 0.7 * vis);
    ctx.globalCompositeOperation = 'source-over';
  }
  // 本体：白い円盤＋縁の色（最後に打った人）
  const rim = p.lastHit >= 0 ? ownerColor(p.lastHit) : '#9aa8c8';
  const g = ctx.createRadialGradient(p.x - s0 * r * 0.35, p.y - s0 * r * 0.4, r * 0.1, p.x, p.y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, fire ? '#ffe0b8' : '#e6ecfb'); g.addColorStop(1, fire ? '#ff9a4d' : '#9eabc9');
  ctx.fillStyle = g; circle(p.x, p.y, r); ctx.fill();
  ctx.strokeStyle = fire ? '#ff6a2e' : rim; ctx.lineWidth = r * 0.22;
  circle(p.x, p.y, r * 0.86); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,40,80,.25)'; ctx.lineWidth = r * 0.08;
  circle(p.x, p.y, r * 0.45); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';                     // つや
  ctx.beginPath(); ctx.ellipse(p.x - s0 * r * 0.32, p.y - s0 * r * 0.38, r * 0.32, r * 0.18, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

/* マレット：持ち手のある円盤。打った瞬間に弾み、構え中・重い腕のときは周りに印が出る */
function drawMallet(m, t) {
  const live = Physics.mallets[m.owner] === m;                // 選択画面の見本では、いつも出ている
  const k = live ? Fx.present[m.owner] : 1;
  if (k <= 0.01) return;                                       // 指を離していて消えている
  const pop = live && m.active ? easeOutBack(Fx.appearT[m.owner] / 0.2) : k;   // 現れるときは弾むように、消えるときは縮んで
  const r = m.r, s0 = lightSign(), col = ownerColor(m.owner), pulse = live ? Fx.malletPulse[m.owner] || 0 : 0;
  const armed = m.owner === Match.me && Skills.state.armed[m.owner], heavy = Skills.state.heavy[m.owner] > 0;   // 構え中は自分にだけ見せる
  const sp = Math.hypot(m.vx, m.vy) / Table.L;
  const rr = r * (1 + 0.08 * pulse) * Math.max(0.05, pop);
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.2);
  drawMalletBody(m, t, r, rr, s0, col, pulse, armed, heavy, sp);
  ctx.restore();
}

function drawMalletBody(m, t, r, rr, s0, col, pulse, armed, heavy, sp) {
  // 速く振ったときの残像
  if (sp > 1.2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= 3; i++) {
      const k = i * 0.012;
      ctx.globalAlpha = 0.16 * (1 - i / 4) * clamp((sp - 1.2) / 2, 0, 1);
      ctx.fillStyle = col;
      circle(m.x - m.vx * k, m.y - m.vy * k, r * 0.95); ctx.fill();
    }
    ctx.restore();
  }
  shadowAt(m.x, m.y, rr * (heavy ? 1.05 : 1), heavy ? 0.18 : 0.42);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(m.x, m.y, rr * (1.9 + 0.8 * pulse), col, 0.28 + 0.4 * pulse);
  ctx.restore();
  if (armed) {                                                 // 構え中：攻撃の色の、回る輪と火花
    const ac = SKILL_TYPE.attack.color;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(m.x, m.y, rr * 2.3, ac, 0.35 + 0.15 * Math.sin(t * 10));
    ctx.strokeStyle = ac; ctx.lineWidth = r * 0.12;
    ctx.setLineDash([r * 0.5, r * 0.32]); ctx.lineDashOffset = -t * r * 4;
    circle(m.x, m.y, rr * 1.38); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * TAU / 3;
      glowAt(m.x + Math.cos(a) * rr * 1.38, m.y + Math.sin(a) * rr * 1.38, r * 0.35, '#ffe0b0', 0.9);
    }
    ctx.restore();
  }
  // 本体：外側の輪
  const g = ctx.createRadialGradient(m.x - s0 * rr * 0.4, m.y - s0 * rr * 0.45, rr * 0.1, m.x, m.y, rr);
  const body = heavy ? mix(col, '#3a2a5a', 0.55) : col;
  g.addColorStop(0, shade(body, 0.45)); g.addColorStop(0.55, body); g.addColorStop(1, shade(body, -0.5));
  ctx.fillStyle = g; circle(m.x, m.y, rr); ctx.fill();
  ctx.strokeStyle = shade(body, -0.35); ctx.lineWidth = rr * 0.08;
  circle(m.x, m.y, rr * 0.7); ctx.stroke();
  // 持ち手（中央の盛り上がり）
  const k = ctx.createRadialGradient(m.x - s0 * rr * 0.18, m.y - s0 * rr * 0.22, rr * 0.03, m.x, m.y, rr * 0.45);
  k.addColorStop(0, '#ffffff'); k.addColorStop(0.4, shade(body, 0.35)); k.addColorStop(1, shade(body, -0.25));
  ctx.fillStyle = k; circle(m.x, m.y, rr * 0.42); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(m.x - s0 * rr * 0.42, m.y - s0 * rr * 0.5, rr * 0.28, rr * 0.13, -0.6, 0, TAU); ctx.fill();
  if (pulse > 0) {                                             // 打った瞬間の輪
    ctx.strokeStyle = rgba('#ffffff', pulse * 0.8); ctx.lineWidth = rr * 0.1 * pulse;
    circle(m.x, m.y, rr * (1.05 + 0.35 * (1 - pulse))); ctx.stroke();
  }
  if (heavy) drawHeavy(m, t, rr);
  if (Skills.state.giant[m.owner] > 0) drawGiant(m, t, rr);
  if (Skills.state.mirror[m.owner] > 0) drawMirror(m, t, rr);
}

/* 重い腕：紫の鎖と、まわりを重そうに回る重り */
/* 巨大化：守りの色の輪。終わる前に点滅 */
function drawGiant(m, t, rr) {
  const left = Skills.state.giant[m.owner], col = SKILL_TYPE.defense.color;
  ctx.save();
  ctx.globalAlpha = left < 0.6 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 22)) : 1;
  ctx.strokeStyle = col; ctx.lineWidth = rr * 0.09;
  circle(m.x, m.y, rr * 1.08); ctx.stroke();
  ctx.restore();
}

/* 反転：左右の矢印が、マレットのまわりを回る */
function drawMirror(m, t, rr) {
  const left = Skills.state.mirror[m.owner], col = SKILL_TYPE.disrupt.color;
  ctx.save();
  ctx.globalAlpha = left < 0.6 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 22)) : 1;
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = rr * 0.12; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const a0 = t * 2.5 + i * Math.PI, a1 = a0 + 1.9, R = rr * 1.32;
    ctx.beginPath(); ctx.arc(m.x, m.y, R, a0, a1); ctx.stroke();
    const hx = m.x + Math.cos(a1) * R, hy = m.y + Math.sin(a1) * R, tx = -Math.sin(a1), ty = Math.cos(a1);
    ctx.beginPath();
    ctx.moveTo(hx + tx * rr * 0.32, hy + ty * rr * 0.32);
    ctx.lineTo(hx - ty * rr * 0.22, hy + tx * rr * 0.22);
    ctx.lineTo(hx + ty * rr * 0.22, hy - tx * rr * 0.22);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawHeavy(m, t, rr) {
  const col = SKILL_TYPE.disrupt.color, left = Skills.state.heavy[m.owner];
  const blink = left < 0.6 ? 0.5 + 0.5 * Math.sin(t * 24) : 1;
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.globalCompositeOperation = 'lighter';
  glowAt(m.x, m.y, rr * 2.4, col, 0.45);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = col; ctx.lineWidth = rr * 0.16;
  ctx.setLineDash([rr * 0.22, rr * 0.14]); ctx.lineDashOffset = t * rr * 0.6;
  circle(m.x, m.y, rr * 1.25); ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 4; i++) {
    const a = t * 0.9 + i * TAU / 4, x = m.x + Math.cos(a) * rr * 1.25, y = m.y + Math.sin(a) * rr * 1.25;
    ctx.fillStyle = '#2a1a44'; ctx.strokeStyle = col; ctx.lineWidth = rr * 0.06;
    ctx.beginPath(); ctx.rect(x - rr * 0.18, y - rr * 0.18, rr * 0.36, rr * 0.36); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* 粒・衝撃波・光（ほとんどは加算で重ねて光らせる） */
function drawFxWorld() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const g of Fx.glows) {
    if (g.delay > 0) continue;
    const u = g.life / g.max;
    glowAt(g.x, g.y, g.r * (1.2 - 0.2 * u), g.color, u * 0.9);
  }
  for (const b of Fx.beams) {
    const u = b.life / b.max;
    ctx.strokeStyle = rgba(b.color, 0.7 * u); ctx.lineWidth = Table.pr * 1.6 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.8 * u); ctx.lineWidth = Table.pr * 0.3 * u;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  }
  for (const r of Fx.rings) {
    if (r.delay > 0) continue;
    const u = 1 - r.life / r.max, e = easeOutCubic(u);
    ctx.strokeStyle = rgba(r.color, (1 - u) * 0.9);
    ctx.lineWidth = Table.W * r.w * (1 - u * 0.7);
    circle(r.x, r.y, lerp(r.r0, r.r1, e)); ctx.stroke();
  }
  ctx.lineCap = 'round';
  for (const p of Fx.parts) {
    if (p.delay > 0) continue;
    const u = p.life / p.max;
    if (p.k === 'spark') {
      ctx.strokeStyle = rgba(p.color, Math.min(1, u * 1.4));
      ctx.lineWidth = Table.W * 0.006 * (p.w || 1) * (0.4 + 0.6 * u);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
    } else if (p.k === 'dot' || p.k === 'home') {
      glowAt(p.x, p.y, p.size * (0.5 + 0.8 * u) * 2, p.color, u);
    } else if (p.k === 'shard') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = rgba(p.color, Math.min(1, u * 1.5));
      const s = p.size * (0.5 + 0.5 * u);
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.6, s * 0.6); ctx.lineTo(-s * 0.7, s * 0.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of Fx.parts) {                                    // 煙は加算にしない（もやっと広がる）
    if (p.k !== 'smoke' || p.delay > 0) continue;
    const u = p.life / p.max;
    ctx.globalAlpha = u * 0.35;
    ctx.drawImage(Sprites.glow(p.color), p.x - p.size * (2 - u), p.y - p.size * (2 - u), p.size * (4 - 2 * u), p.size * (4 - 2 * u));
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
