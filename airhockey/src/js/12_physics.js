'use strict';
/* =====================================================================
   物理（台の平面上で計算する）
   - パック：連続衝突判定で、壁・仕掛け・マレットをすり抜けない
   - マレット：指（またはCPU）の目標位置へ動く。速さは毎フレーム計算して、なめらかにする
   - 跳ね返り：パックとマレットの相対速度で計算（反発 0.7）
   ===================================================================== */
const Physics = {
  pucks: [],
  mallets: [],
  rally: 0,
  nextId: 1,
  onMalletHit: null,       // (puck, mallet, power, nx, ny) 打ち返しが数えられたとき（Match が設定）

  /* ラリーが続くほど上がる、打ち返しの強さの倍率 */
  power() { return Math.min(1 + TUNE.RALLY_POWER_GAIN * this.rally, TUNE.RALLY_POWER_MAX); },
  /* パックの最高速度（物理単位/秒）。ラリーで上限が上がる。剛速球はさらに上がる */
  maxSpeed(p) {
    const cap = Math.min(TUNE.PUCK_MAX_SPEED + TUNE.RALLY_SPEED_GAIN * this.rally, TUNE.RALLY_SPEED_MAX);
    return cap * Table.L * (p && p.boost || 1);
  },

  newPuck(x, y, vx = 0, vy = 0) {
    return { id: this.nextId++, x, y, vx, vy, r: Table.pr, lastHit: -1, cool: [0, 0], boost: 1, curve: 0,
             vis: 1, ghost: false, owner: -1, life: 0, dead: false, vanish: false, travel: 0,
             evCool: 0, still: 0, trail: [], born: 0 };
  },
  makeMallet(owner, x, y) {
    return { owner, x, y, px: x, py: y, tx: x, ty: y, vx: 0, vy: 0, ivx: 0, ivy: 0, r: Table.mr,
             heavy: false, speedLimit: 0, remote: false, rvx: 0, rvy: 0,
             active: true };                       // active=false：指を離していてマレットが消えている（パックは素通り）
  },

  /* マレットを目標位置へ動かし、速さを計算する */
  updateMallets(dt, only) {
    dt = Math.max(dt, 1e-4);
    const L = Table.L, vmax = PHYS.MALLET_V_MAX * L;
    const a = 1 - Math.exp(-dt / PHYS.MALLET_V_SMOOTH);
    for (const m of this.mallets) {
      if (only != null && m.owner !== only) continue;
      m.px = m.x; m.py = m.y;
      if (!m.active) { m.tx = m.x; m.ty = m.y; m.vx = m.vy = m.ivx = m.ivy = 0; continue; }
      let nx = m.tx, ny = m.ty;
      if (m.heavy && !m.remote) {                      // 重い腕：指に遅れてついてくる（相手の端末で動かすマレットは、向こうで遅れをかけ済み）
        const k = 1 - Math.exp(-dt / SKILL.HEAVY_LAG);
        nx = m.x + (m.tx - m.x) * k; ny = m.y + (m.ty - m.y) * k;
      }
      let capV = PHYS.MALLET_V_MAX;
      if (m.speedLimit) capV = Math.min(capV, m.speedLimit);
      if (m.heavy && !m.remote) capV = Math.min(capV, SKILL.HEAVY_V_MAX);
      if (m.remote) capV = PHYS.MALLET_V_MAX * 3;      // 相手の端末で動かしているマレットは、届いた位置へ追いつく
      const cap = capV * L * dt, dx = nx - m.x, dy = ny - m.y, dd = Math.hypot(dx, dy);
      if (dd > cap) { nx = m.x + dx * cap / dd; ny = m.y + dy * cap / dd; }
      const c = Table.clampMallet(m.owner, nx, ny, m.r);
      m.x = c.x; m.y = c.y;
      m.ivx = (m.x - m.px) / dt; m.ivy = (m.y - m.py) / dt;          // その場の速さ
      const tvx = m.remote ? m.rvx : m.ivx, tvy = m.remote ? m.rvy : m.ivy;
      m.vx += (tvx - m.vx) * a; m.vy += (tvy - m.vy) * a;            // なめらかにした速さ（打ち返しに使う）
      const sp = Math.hypot(m.vx, m.vy);
      if (sp > vmax) { m.vx *= vmax / sp; m.vy *= vmax / sp; }
    }
  },

  /* パックが当たる相手：壁・仕掛け・防壁・マレット */
  obstacles() {
    const obs = Table.walls.concat(Stage.shapes, Skills.shapes());
    for (const m of this.mallets) {
      if (!m.active) continue;                         // 消えているマレットには当たらない
      obs.push({ ax: m.px, ay: m.py, bx: m.px, by: m.py, r: m.r, vx: m.ivx, vy: m.ivy, mallet: m, kind: 'mallet' });
    }
    return obs;
  },

  /* 1フレーム進める。得点があれば得点者(0/1)、なければ -1 */
  step(dt) {
    dt = Math.max(dt, 1e-4);
    Table.clampGoal();
    Table.buildWalls();
    const obs = this.obstacles();
    const L = Table.L, n = Math.max(1, Math.ceil(dt / PHYS.SUBSTEP)), h = dt / n;
    const drag = Math.exp(-TUNE.FLOOR_DRAG * h);
    let result = -1;
    for (let s = 0; s < n && result < 0; s++) {
      const e0 = s * h;
      for (const p of this.pucks) {
        if (p.dead) continue;
        p.cool[0] -= h; p.cool[1] -= h; p.evCool -= h;
        Stage.applyZones(p, h);
        p.vx *= drag; p.vy *= drag;
        if (p.zig) Skills.stepZig(p, h);               // 稲妻：一定の間隔で折れ曲がる
        if (p.curve) {                                 // カーブ：進む向きがだんだん曲がる
          const a = p.curve * h, ca = Math.cos(a), sa = Math.sin(a);
          const vx = p.vx * ca - p.vy * sa, vy = p.vx * sa + p.vy * ca;
          p.vx = vx; p.vy = vy;
        }
        const x0 = p.x, y0 = p.y;
        movePuck(p, h, obs, e0);
        resolveOverlaps(p, obs, e0 + h);
        sanity(p);
        p.travel += Math.hypot(p.x - x0, p.y - y0);
        if (p.ghost) {                                 // 分身：時間切れで消える（ゴールに入ったときは下で得点にする）
          p.life -= h;
          if (p.life <= 0) p.dead = true;
        }
      }
      collidePucks(this.pucks);
      for (const p of this.pucks) {                    // 分身も、相手のゴールに入れば本物と同じく1点（どれか1つが入れば終わり）
        if (p.dead) continue;
        if (p.y < -p.r) {                              // 上のゴールに入った → 下の人(0)の得点
          if (p.ghost && p.owner !== 0) { p.dead = true; continue; }   // 打った人の自分のゴールに入った分身は、点にせず消す（自分のマレットをすり抜けるので）
          result = 0; p.scored = 0; break;
        }
        if (p.y > L + p.r) {
          if (p.ghost && p.owner !== 1) { p.dead = true; continue; }
          result = 1; p.scored = 1; break;
        }
      }
    }
    if (result < 0) for (const p of this.pucks) if (!p.dead) { unpinch(p, dt); sanity(p); }
    if (this.pucks.some(p => p.dead)) this.pucks = this.pucks.filter(p => !p.dead);
    return result;
  },

  /* 当たった音・演出の知らせ（同じパックから続けて出すぎないようにする） */
  hitEvent(p, kind, power, x, y, nx, ny) {
    if (power < 0.03) return;
    if (p.evCool > 0 && power < 0.5) return;
    p.evCool = 0.045;
    Events.emit('hit', kind, power, x, y, nx, ny, p.ghost ? 1 : 0);
  },
};

function clampSpeed(p) {
  const mx = Physics.maxSpeed(p), s2 = p.vx * p.vx + p.vy * p.vy;
  if (s2 > mx * mx) { const k = mx / Math.sqrt(s2); p.vx *= k; p.vy *= k; }
}

/* 連続衝突判定：当たる時刻まで進める→跳ね返す→残りの時間でまた進める */
function movePuck(p, dt, obs, e0) {
  let tr = dt, el = e0;
  for (let it = 0; it < 16 && tr > 1e-9; it++) {
    let best = null, bo = null;
    for (const o of obs) {
      if (o.off || (p.ghost && o.mallet && o.mallet.owner === p.owner)) continue;   // 分身は、打った人のマレットをすり抜ける
      // 動いている相手は、相手を止めた座標系（相対速度）で考える
      const hh = sweepCapsule(p.x - o.vx * el, p.y - o.vy * el, p.vx - o.vx, p.vy - o.vy, tr,
                              o.ax, o.ay, o.bx, o.by, p.r + o.r);
      if (hh && (!best || hh.t < best.t)) { best = hh; bo = o; }
    }
    if (!best) { p.x += p.vx * tr; p.y += p.vy * tr; return; }
    p.x += p.vx * best.t; p.y += p.vy * best.t;
    tr -= best.t; el += best.t;
    respond(p, bo, best.nx, best.ny);
    if (p.dead) return;
  }
  if (tr > 1e-9) { p.x += p.vx * tr; p.y += p.vy * tr; }
}

/* 当たった後の速度 */
function respond(p, o, nx, ny) {
  if (o.mallet) { respondMallet(p, o.mallet, nx, ny); return; }
  if (o.kind === 'warp') {                             // ワープ穴：反対側の壁から出てくる（向きと速さはそのまま）
    const x1 = p.x;
    p.x = o.side === 0 ? Table.W - p.r - 0.01 : p.r + 0.01;
    p.trail.length = 0;
    Events.emit('warp', x1, p.y, p.x, p.y);
    return;
  }
  const L = Table.L;
  const vn = (p.vx - o.vx) * nx + (p.vy - o.vy) * ny;
  if (vn >= 0) return;
  const k = (1 + o.e) * vn;
  p.vx -= k * nx; p.vy -= k * ny;
  if (o.kick) { p.vx += nx * o.kick * L; p.vy += ny * o.kick * L; }   // バンパーの押し出し
  if (p.zig) p.zig.dir = -p.zig.dir;                   // 稲妻：跳ね返ると左右も入れ替わるので、次に折れる向きも入れ替える（跳ね返った向きを中心にジグザグを続ける）
  clampSpeed(p);
  o.flash = 1;
  Physics.hitEvent(p, o.kind, -vn / L, p.x - nx * p.r, p.y - ny * p.r, nx, ny);
}

/*
  マレットとの跳ね返り（相対速度で計算）
    v_p' = v_m − e (v_p − v_m)   … 法線方向の成分
  止まったマレット（v_m=0）では v_p' = −e v_p で勢いが e 倍に落ちる。
  マレットを引きながら受ける（v_m ≒ v_p·e/(1+e)）と、パックはほぼ止まる。
  ラリーが続くほど、マレットが押し込む成分に強さの倍率がかかる。
*/
function respondMallet(p, m, nx, ny) {
  if (p.ghost) {                                       // 分身：相手のマレットに触れるとパッと消える
    p.dead = true;
    Events.emit('pop', p.x, p.y, p.owner);
    return;
  }
  const L = Table.L, P = Physics.power();
  const solve = (vx, vy) => {
    const vmn = vx * nx + vy * ny;
    const s = vmn > 0 ? vmn * (P - 1) : 0;
    const mx = vx + nx * s, my = vy + ny * s;
    return (p.vx - mx) * nx + (p.vy - my) * ny;
  };
  let vn = solve(m.vx, m.vy);                          // まず、なめらかにした速さで
  if (vn >= 0) vn = solve(m.ivx, m.ivy);               // 離れて見えるときは、その場の速さで
  if (vn < 0) {
    const k = (1 + TUNE.RESTITUTION) * vn;
    p.vx -= k * nx; p.vy -= k * ny;
    clampSpeed(p);
    const power = -vn / L;
    if (power > PHYS.HIT_MIN_SPEED && p.cool[m.owner] <= 0) {
      p.cool[m.owner] = PHYS.HIT_COOLDOWN;
      if (Physics.onMalletHit) Physics.onMalletHit(p, m, power, nx, ny);
    } else if (power > 0.03 && p.evCool <= 0) {
      p.evCool = 0.06;
      Events.emit('mtouch', m.owner, power, p.x - nx * p.r, p.y - ny * p.r);
    }
    return;
  }
  const v0 = (p.vx - m.ivx) * nx + (p.vy - m.ivy) * ny;   // どちらでも離れて見える：くっついたまま（反発なし）
  if (v0 < 0) { p.vx -= v0 * nx; p.vy -= v0 * ny; clampSpeed(p); }
}

/* 重なりの深さと押し出す向き。台の壁（太さ0の線）と防壁は、台の内側へだけ押し出す
   （中心が線の外へ出てしまっても、外へ押し出さないようにするため） */
function overlapOf(p, o, tEnd) {
  const ax = o.ax + o.vx * tEnd, ay = o.ay + o.vy * tEnd, bx = o.bx + o.vx * tEnd, by = o.by + o.vy * tEnd;
  const R = p.r + o.r;
  if (o.r === 0 || o.kind === 'barrier') {
    const sx = bx - ax, sy = by - ay, len = Math.hypot(sx, sy);
    if (len < 1e-9) return null;
    let nx = -sy / len, ny = sx / len;
    if ((Table.W / 2 - ax) * nx + (Table.L / 2 - ay) * ny < 0) { nx = -nx; ny = -ny; }
    const along = ((p.x - ax) * sx + (p.y - ay) * sy) / (len * len);
    if (along < 0 || along > 1) {                       // 線の端（ゴールポスト）：丸として扱う
      const ex = along < 0 ? ax : bx, ey = along < 0 ? ay : by, dx = p.x - ex, dy = p.y - ey, d = Math.hypot(dx, dy);
      if (d >= R - 1e-6 || d < 1e-9) return null;
      return { nx: dx / d, ny: dy / d, depth: R - d };
    }
    const d = (p.x - ax) * nx + (p.y - ay) * ny;
    if (d >= R - 1e-6 || d < -R * 3) return null;       // 大きく外にいるもの（ゴールの奥など）は相手にしない
    return { nx, ny, depth: R - d };
  }
  const q = segDist(p.x, p.y, ax, ay, bx, by);
  if (q.d >= R - 1e-6) return null;
  if (q.d > 1e-9) return { nx: q.dx / q.d, ny: q.dy / q.d, depth: R - q.d };
  const cx = Table.W / 2 - p.x, cy = Table.L / 2 - p.y, cd = Math.hypot(cx, cy) || 1;
  return { nx: cx / cd, ny: cy / cd, depth: R };
}

/* 万一めり込んだときの押し出し（連続衝突判定の取りこぼしに備える） */
function resolveOverlaps(p, obs, tEnd) {
  for (let pass = 0; pass < 2; pass++) {
    for (const o of obs) {
      if (p.dead) return;
      if (o.off || o.kind === 'warp' || (p.ghost && o.mallet && o.mallet.owner === p.owner)) continue;
      const h = overlapOf(p, o, tEnd);
      if (!h) continue;
      p.x += h.nx * h.depth; p.y += h.ny * h.depth;
      respond(p, o, h.nx, h.ny);
    }
  }
}

/* 壁や仕掛けとの重なりだけを押し出す（マレットとの挟み込みの処理に使う） */
function pushOutStatic(p, tEnd) {
  const list = Stage.shapes.concat(Skills.shapes(), Table.walls);   // 台の壁を最後に：往復する壁と台の壁に挟まれても、台の外へは押し出さない
  for (let pass = 0; pass < 2; pass++) {
    for (const o of list) {
      if (o.off) continue;                               // 挟み込みのときは、ワープ穴も壁として扱う（マレットで台の外へ押し出さない）
      const h = overlapOf(p, o, tEnd);
      if (!h) continue;
      p.x += h.nx * h.depth; p.y += h.ny * h.depth;
      const vn = p.vx * h.nx + p.vy * h.ny;
      if (vn < 0) { p.vx -= vn * h.nx; p.vy -= vn * h.ny; }
    }
  }
}

/* パックがマレットと壁に挟まれたとき：パックを壁の内側に残し、マレットのほうを押し戻す */
function unpinch(p, dt) {
  pushOutStatic(p, 0);                                 // マレットに押されて壁にめり込んでいたら、まず台の内側へ戻す
  for (const m of Physics.mallets) {
    if (!m.active || (p.ghost && m.owner === p.owner)) continue;
    let dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
    const R = p.r + m.r;
    if (d >= R - 0.01) continue;
    const nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : (m.owner === 0 ? -1 : 1);
    p.x = m.x + nx * R; p.y = m.y + ny * R;
    pushOutStatic(p, 0);
    dx = p.x - m.x; dy = p.y - m.y; d = Math.hypot(dx, dy);
    if (d < R - 0.01) {
      const ux = d > 1e-6 ? dx / d : nx, uy = d > 1e-6 ? dy / d : ny;
      const c = Table.clampMallet(m.owner, p.x - ux * R, p.y - uy * R, m.r);
      m.x = c.x; m.y = c.y;
    }
    const vn = (p.vx - m.ivx) * nx + (p.vy - m.ivy) * ny;
    if (vn < 0) { p.vx -= vn * nx; p.vy -= vn * ny; clampSpeed(p); }
  }
}

/* パック同士の衝突（2個のとき）。分身とは当たらない */
function collidePucks(pucks) {
  for (let i = 0; i < pucks.length; i++) {
    for (let j = i + 1; j < pucks.length; j++) {
      const a = pucks[i], b = pucks[j];
      if (a.ghost || b.ghost || a.dead || b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = a.r + b.r;
      if (d >= R || d < 1e-9) continue;
      const nx = dx / d, ny = dy / d, push = (R - d) / 2;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn >= 0) continue;
      const k = vn * (1 + TUNE.WALL_RESTITUTION) / 2;
      a.vx += k * nx; a.vy += k * ny; b.vx -= k * nx; b.vy -= k * ny;
      clampSpeed(a); clampSpeed(b);
      if (a.evCool <= 0) { a.evCool = 0.05; Events.emit('hit', 'puck', -vn / Table.L, a.x + nx * a.r, a.y + ny * a.r, nx, ny, 0); }
    }
  }
}

/* 念のための安全装置：数値が壊れた・台の外へ出たときに戻す */
function sanity(p) {
  const { W, L } = Table;
  if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.vx) || !isFinite(p.vy)) {
    p.x = W / 2; p.y = L / 2; p.vx = 0; p.vy = 0; return;
  }
  if (p.x < p.r - 2) { p.x = p.r; p.vx = Math.abs(p.vx); }
  if (p.x > W - p.r + 2) { p.x = W - p.r; p.vx = -Math.abs(p.vx); }
  const inMouth = g => Math.abs(p.x - W / 2) < g;
  if (p.y < p.r && !inMouth(Table.goalHalf[1])) {
    if (p.y < -p.r * 0.5) { p.y = p.r; p.vy = Math.abs(p.vy); }
  }
  if (p.y > L - p.r && !inMouth(Table.goalHalf[0])) {
    if (p.y > L + p.r * 0.5) { p.y = L - p.r; p.vy = -Math.abs(p.vy); }
  }
}
