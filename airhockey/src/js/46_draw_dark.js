'use strict';
/* =====================================================================
   暗いステージ：画面を暗くし、両者のマレットの周りだけを明るくする
   パック自体は光らず、マレットの明かりに入ったときだけ見える
   ===================================================================== */
let darkCv = null, darkCtx = null;
const lightRadius = () => Table.mr * STG.LIGHT_R;

function drawDarkMask(t) {
  // 暗さはやわらかいグラデーションだけなので、小さいキャンバスに描いて引き伸ばす（軽くするため）
  const k = 0.25, w = Math.max(1, Math.round(Layout.vw * k)), h = Math.max(1, Math.round(Layout.vh * k));
  if (!darkCv) { darkCv = document.createElement('canvas'); darkCtx = darkCv.getContext('2d'); }
  if (darkCv.width !== w || darkCv.height !== h) { darkCv.width = w; darkCv.height = h; }
  const c = darkCtx;
  c.globalCompositeOperation = 'source-over';
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  c.fillStyle = `rgba(1,2,8,${STG.DARK_ALPHA})`;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'destination-out';
  c.setTransform(k, 0, 0, k, 0, 0);
  for (const m of Physics.mallets) {
    const k = Fx.present[m.owner];
    if (k <= 0.01) continue;                                   // 消えているマレットは光らない
    const s = scr(m.x, m.y);
    const R = k * lightRadius() * Layout.scale * (1 + 0.025 * Math.sin(t * 7 + m.owner * 2) + 0.015 * Math.sin(t * 23));   // ほんの少しゆらぐ明かり
    const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.97)'); g.addColorStop(0.8, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(s.x, s.y, R, 0, TAU); c.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(darkCv, -2, -2, canvas.width + 4, canvas.height + 4);
  // 明かりのふちに、持ち主の色をうっすら
  screenTransform();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of Physics.mallets) {
    if (Fx.present[m.owner] <= 0.01) continue;
    const s = scr(m.x, m.y), R = lightRadius() * Layout.scale * Fx.present[m.owner];
    ctx.strokeStyle = rgba(ownerColor(m.owner), 0.12);
    ctx.lineWidth = R * 0.12;
    circle(s.x, s.y, R * 0.82); ctx.stroke();
  }
  ctx.restore();
}

/* パックの見え方：マレットの明かりの中にいるときだけ見える */
function darkPuckAlpha(p) { return darkLightAt(p.x, p.y); }
function darkLightAt(x, y) {
  const R = lightRadius();
  let best = 0;
  for (const m of Physics.mallets) {
    const k = Fx.present[m.owner];
    if (k <= 0.01) continue;
    const d = Math.hypot(x - m.x, y - m.y) / (R * k);
    const a = d <= 0.55 ? 1 : d >= 1 ? 0 : 1 - (d - 0.55) / 0.45;
    if (a > best) best = a;
  }
  return best * best * (3 - 2 * best);
}
