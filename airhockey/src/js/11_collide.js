'use strict';
/* =====================================================================
   連続衝突判定の計算
   点 p が速度 v で T 秒動くあいだに、図形（円・カプセル）の半径 R の範囲に入る最初の時刻を求める。
   当たれば { t, nx, ny }（nx,ny は図形からパックへ向かう法線）、当たらなければ null
   ===================================================================== */
function sweepCircle(px, py, vx, vy, T, cx, cy, R) {
  const dx = px - cx, dy = py - cy;
  const b = dx * vx + dy * vy;
  if (b >= 0) return null;                          // 離れていく・すれ違う
  const a = vx * vx + vy * vy;
  if (a < 1e-12) return null;
  const c = dx * dx + dy * dy - R * R;
  let t;
  if (c <= 0) t = 0;                                // すでに重なっていて近づいている
  else {
    const disc = b * b - a * c;
    if (disc < 0) return null;
    t = (-b - Math.sqrt(disc)) / a;
    if (t < 0 || t > T) return null;
  }
  const hx = dx + vx * t, hy = dy + vy * t, hl = Math.hypot(hx, hy) || 1;
  return { t, nx: hx / hl, ny: hy / hl };
}

function sweepCapsule(px, py, vx, vy, T, ax, ay, bx, by, R) {
  const sx = bx - ax, sy = by - ay, len = Math.hypot(sx, sy);
  if (len < 1e-9) return sweepCircle(px, py, vx, vy, T, ax, ay, R);
  const ux = sx / len, uy = sy / len, nx = -uy, ny = ux;
  const d = (px - ax) * nx + (py - ay) * ny;        // 線分からの符号つき距離
  const side = d >= 0 ? 1 : -1;
  const dd = d * side, vn = (vx * nx + vy * ny) * side;
  let best = null;
  if (vn < 0) {                                     // 平らな面
    const t = dd <= R ? 0 : (dd - R) / -vn;
    if (t <= T) {
      const along = (px + vx * t - ax) * ux + (py + vy * t - ay) * uy;
      if (along >= 0 && along <= len) best = { t, nx: nx * side, ny: ny * side };
    }
  }
  const h1 = sweepCircle(px, py, vx, vy, T, ax, ay, R);   // 両端の丸い所
  if (h1 && (!best || h1.t < best.t)) best = h1;
  const h2 = sweepCircle(px, py, vx, vy, T, bx, by, R);
  if (h2 && (!best || h2.t < best.t)) best = h2;
  return best;
}

/* 点と線分の最短距離（重なりの確認用） */
function segDist(px, py, ax, ay, bx, by) {
  const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy;
  let t = l2 > 0 ? ((px - ax) * sx + (py - ay) * sy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + sx * t, cy = ay + sy * t, dx = px - cx, dy = py - cy;
  return { d: Math.hypot(dx, dy), dx, dy };
}
