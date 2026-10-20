'use strict';
/* =====================================================================
   ステージの仕掛け
     shapes    … パックが跳ね返るカプセル（柱・バンパー・往復する壁・シャッター）
     sideZones … 左右の壁の区間の差し替え（バネ・ワープ穴）。Table.buildWalls が使う
     zones     … 床（矢印で加速・減速の床）
   どの仕掛けも上下・左右に対称に置く（ゲストは台を180°回して見るので、どちらから見ても同じ形）
   ===================================================================== */
const Stage = {
  id: 'pillars', t: 0, dark: false,
  shapes: [], sideZones: [], zones: [], sweeper: null, shutters: [],
  shutterInfo: { side: 0, cover: 0, warn: 0 },

  load(id) {
    const { W, L } = Table;
    this.id = id; this.t = 0; this.dark = false;
    Table.goalBase = [Table.defaultGoal(), Table.defaultGoal()];   // ゴールの幅は、ステージごとに元へ戻す
    this.shapes = []; this.sideZones = []; this.zones = [];
    this.sweeper = null; this.shutters = [];
    this.shutterInfo = { side: 0, cover: 0, warn: 0 };

    const circle = (x, y, r, kind, extra) =>
      Object.assign({ ax: x, ay: y, bx: x, by: y, r, vx: 0, vy: 0, e: TUNE.WALL_RESTITUTION, kind, flash: 0 }, extra);
    const bumper = (x, y, r) => circle(x, y, r, 'bumper', { e: 1, kick: STG.BUMPER_KICK });
    const pillar = (x, y, r) => circle(x, y, r, 'pillar');
    const four = (x, y, make) => {                  // 上下左右に対称な4か所（重なる場所は1つ）
      const seen = new Set();
      for (const q of [[x, y], [W - x, y], [x, L - y], [W - x, L - y]]) {
        const key = q[0].toFixed(2) + ',' + q[1].toFixed(2);
        if (!seen.has(key)) { seen.add(key); this.shapes.push(make(q[0], q[1])); }
      }
    };

    switch (id) {
      case 'pillars':                               // 中央の柱と、4つのバンパー
        this.shapes.push(pillar(W / 2, L / 2, W * 0.065));
        four(W * 0.22, L * 0.38, (x, y) => bumper(x, y, W * 0.042));
        break;
      case 'sweeper':                               // 中央線の上を左右に往復する壁
        this.sweeper = circle(W / 2, L / 2, W * 0.022, 'sweeper');
        this.shapes.push(this.sweeper);
        this.updateSweeper();
        break;
      case 'spring':                                // 左右の壁の一部がバネ + 中央の柱
        this.sideZones = [
          { y0: L * 0.30, y1: L * 0.40, kind: 'spring', e: STG.SPRING_E },
          { y0: L * 0.60, y1: L * 0.70, kind: 'spring', e: STG.SPRING_E },
        ];
        this.shapes.push(pillar(W / 2, L / 2, W * 0.05));
        break;
      case 'boost': {                               // 矢印の床（自分の陣地から相手のゴールへ向けて加速）+ 中央の減速の床
        const x0 = W * 0.05, x1 = W * 0.33;
        this.zones.push(
          { type: 'arrow', x0, x1, y0: L * 0.58, y1: L * 0.78, dx: 0, dy: -1 },
          { type: 'arrow', x0: W - x1, x1: W - x0, y0: L * 0.58, y1: L * 0.78, dx: 0, dy: -1 },
          { type: 'arrow', x0, x1, y0: L * 0.22, y1: L * 0.42, dx: 0, dy: 1 },
          { type: 'arrow', x0: W - x1, x1: W - x0, y0: L * 0.22, y1: L * 0.42, dx: 0, dy: 1 },
          { type: 'slow', x0: W * 0.36, x1: W * 0.64, y0: L * 0.44, y1: L * 0.56 });
        break;
      }
      case 'warp':                                  // 左の壁の穴 ⇔ 右の壁の穴 + 中央のバンパー
        this.sideZones = [
          { y0: L * 0.36, y1: L * 0.46, kind: 'warp' },
          { y0: L * 0.54, y1: L * 0.64, kind: 'warp' },
        ];
        this.shapes.push(bumper(W / 2, L / 2, W * 0.045));
        break;
      case 'shutter':                               // ゴール前のシャッター + 中央の柱
        for (const owner of [0, 1]) {
          const s = circle(W / 2, Table.goalY(owner), W * 0.03, 'shutter', { off: true, owner });
          this.shutters.push(s);
          this.shapes.push(s);
        }
        this.shapes.push(pillar(W / 2, L / 2, W * 0.05));
        this.updateShutters();
        break;
      case 'pulse':                                 // ゴールの幅が広がったり狭まったり + 4つのバンパー
        four(W * 0.22, L * 0.5, (x, y) => bumper(x, y, W * 0.04));
        this.updatePulse();
        break;
      case 'dark':                                  // 暗いステージ：中央線に柱を3本（当たった音で位置が分かる）
        this.dark = true;
        this.shapes.push(pillar(W * 0.25, L / 2, W * 0.045), pillar(W * 0.5, L / 2, W * 0.06), pillar(W * 0.75, L / 2, W * 0.045));
        break;
    }
  },

  /* 時間を進める（ゲストは、ホストから届いた時刻を set で入れる） */
  update(dt) { this.set(this.t + dt, dt); },
  set(t, dt = 0) {
    this.t = t;
    for (const s of this.shapes) if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 4);
    if (this.sweeper) this.updateSweeper();
    if (this.shutters.length) this.updateShutters();
    if (this.id === 'pulse') this.updatePulse();
  },

  /* 往復する壁：sin で左右に動く。速度も持たせて、動く壁に当たったときの跳ね返りを正しくする */
  updateSweeper() {
    const s = this.sweeper, W = Table.W, hl = W * STG.SWEEP_LEN / 2;
    const A = W / 2 - hl - s.r - W * 0.02, w = TAU / STG.SWEEP_PERIOD;
    const cx = W / 2 + A * Math.sin(w * this.t);
    s.ax = cx - hl; s.bx = cx + hl; s.ay = s.by = Table.L / 2;
    s.vx = A * w * Math.cos(w * this.t); s.vy = 0;
  },

  /* シャッター：開く → 左半分をふさぐ → 開く → 右半分をふさぐ（上下のゴールは同時） */
  updateShutters() {
    const O = STG.SHUTTER_OPEN, C = STG.SHUTTER_CLOSED, M = STG.SHUTTER_MOVE, cyc = 2 * (O + C);
    const t = ((this.t % cyc) + cyc) % cyc;
    let side = 0, cover = 0, warn = 0, next = -1;
    if (t >= O && t < O + C) { side = -1; const k = t - O; cover = Math.min(1, k / M, (C - k) / M); }
    else if (t >= 2 * O + C) { side = 1; const k = t - (2 * O + C); cover = Math.min(1, k / M, (C - k) / M); }
    else {                                           // 開いている間：閉まる直前に予告
      const until = t < O ? O - t : 2 * O + C - t;
      next = t < O ? -1 : 1;
      warn = until < STG.SHUTTER_WARN ? 1 - until / STG.SHUTTER_WARN : 0;
    }
    cover = clamp(cover, 0, 1);
    this.shutterInfo = { side: side || next, cover, warn };
    for (const s of this.shutters) {
      const gh = Table.goalHalf[s.owner], cx = Table.W / 2;
      s.off = cover < 0.02;
      if (side < 0) { s.ax = cx - gh; s.bx = cx - gh + gh * cover; }
      else { s.bx = cx + gh; s.ax = cx + gh - gh * cover; }
      s.ay = s.by = Table.goalY(s.owner);
      s.cover = cover;
    }
  },

  /* ゴールの幅：両方のゴールが同時に広がったり狭まったりする */
  updatePulse() {
    const W = Table.W, mid = (STG.PULSE_MIN + STG.PULSE_MAX) / 2, amp = (STG.PULSE_MAX - STG.PULSE_MIN) / 2;
    const gh = W * (mid + amp * Math.sin(TAU * this.t / STG.PULSE_PERIOD));
    Table.goalBase = [gh, gh];
  },

  /* 床の効果：矢印は向きへ加速、減速の床はゆっくりにする */
  applyZones(p, h) {
    for (const z of this.zones) {
      if (p.x < z.x0 || p.x > z.x1 || p.y < z.y0 || p.y > z.y1) continue;
      if (z.type === 'arrow') {
        const a = STG.ARROW_ACCEL * Table.L * h;
        p.vx += z.dx * a; p.vy += z.dy * a;
        clampSpeed(p);
        p.zoneArrow = 0.15;
      } else {
        const k = Math.exp(-STG.SLOW_DRAG * h);
        p.vx *= k; p.vy *= k;
        p.zoneSlow = 0.15;
      }
    }
  },
};
