'use strict';
/* =====================================================================
   台の形
   - 左右の壁は画面の端（x=0, x=W）
   - 四隅は45°の斜めの壁（大きさ D）
   - goalHalf[owner]：そのプレイヤーが守るゴールの半幅（0＝下のゴール、1＝上のゴール）
   ===================================================================== */
const Table = {
  W: 500, L: GEO.TABLE_LEN, D: 120, mr: 37, pr: 25,
  goalHalf: [100, 100], goalBase: [100, 100], goalScale: [1, 1],
  walls: [],

  setup(W) {
    this.W = W;
    this.L = GEO.TABLE_LEN;
    this.D = W * GEO.CORNER_RATIO;
    this.mr = W * GEO.MALLET_R_RATIO;
    this.pr = W * GEO.PUCK_R_RATIO;
    const g = this.defaultGoal();
    this.goalBase = [g, g];
    this.goalScale = [1, 1];
    this.goalHalf = [g, g];
    this.buildWalls();
  },
  defaultGoal() { return this.W * GEO.GOAL_RATIO / 2; },
  goalY(owner) { return owner === 0 ? this.L : 0; },
  goalHalfMax() { return (this.W - 2 * this.D) / 2 - this.pr * 0.15; },
  /* ゴールの幅＝もとの幅（ステージで変わる）×必殺技の倍率。斜めの壁までが上限 */
  clampGoal() {
    const mx = this.goalHalfMax(), mn = this.pr * 1.3;
    for (const o of [0, 1]) this.goalHalf[o] = clamp(this.goalBase[o] * this.goalScale[o], mn, mx);
  },
  /* ゴール拡大の倍率をなめらかに変える（毎フレーム1回） */
  updateGoals(dt) {
    for (const o of [0, 1]) {
      const target = typeof Skills !== 'undefined' && Skills.state ? Skills.goalScale(o) : 1;
      this.goalScale[o] = dt > 0 ? this.goalScale[o] + (target - this.goalScale[o]) * (1 - Math.exp(-dt * 8)) : target;
    }
    this.clampGoal();
  },

  wall(ax, ay, bx, by, kind = 'wall', e = TUNE.WALL_RESTITUTION, side = -1) {
    return { ax, ay, bx, by, r: 0, vx: 0, vy: 0, e, kind, side };
  },

  /* 壁を作り直す（ゴールの幅が変わるステージがあるので、毎フレーム呼ぶ） */
  buildWalls() {
    const { W, L, D } = this, w = [];
    // 左右の壁。バネやワープ穴は Stage.sideZones で区間ごとに差し替える
    const zones = (typeof Stage !== 'undefined' && Stage.sideZones || []).slice().sort((a, b) => a.y0 - b.y0);
    for (const side of [0, 1]) {
      const x = side === 0 ? 0 : W;
      let y = D;
      for (const z of zones) {
        if (z.y0 > y) w.push(this.wall(x, y, x, z.y0, 'wall', TUNE.WALL_RESTITUTION, side));
        w.push(this.wall(x, z.y0, x, z.y1, z.kind, z.e != null ? z.e : TUNE.WALL_RESTITUTION, side));
        y = z.y1;
      }
      w.push(this.wall(x, y, x, L - D, 'wall', TUNE.WALL_RESTITUTION, side));
    }
    // 斜めの壁
    w.push(this.wall(0, D, D, 0), this.wall(W - D, 0, W, D), this.wall(0, L - D, D, L), this.wall(W - D, L, W, L - D));
    // ゴールの両側の壁（端がゴールポストになる）
    const g1 = this.goalHalf[1], g0 = this.goalHalf[0];
    w.push(this.wall(D, 0, W / 2 - g1, 0), this.wall(W / 2 + g1, 0, W - D, 0));
    w.push(this.wall(D, L, W / 2 - g0, L), this.wall(W / 2 + g0, L, W - D, L));
    this.walls = w;
  },

  /* マレットが動ける範囲：自分の陣地（半分）の中で、壁と斜めの壁の内側 */
  clampMallet(owner, x, y, mr = this.mr) {
    const { W, L, D } = this;
    let yy = owner === 0 ? y : L - y;           // 下側の人の向きにそろえて考える
    x = clamp(x, mr, W - mr);
    yy = clamp(yy, L / 2 + mr, L - mr);
    const k = D + mr * Math.SQRT2;
    let pen = k - (x + (L - yy));               // 左下の斜めの壁
    if (pen > 0) { x += pen / 2; yy -= pen / 2; }
    pen = k - ((W - x) + (L - yy));             // 右下の斜めの壁
    if (pen > 0) { x -= pen / 2; yy -= pen / 2; }
    x = clamp(x, mr, W - mr);
    yy = clamp(yy, L / 2 + mr, L - mr);
    return { x, y: owner === 0 ? yy : L - yy };
  },

  /* 必殺技ボタン（自分のゴール側の、斜めの壁の外の三角形）。台の外（画面の下の余白）へはみ出した所も含む */
  inButton(owner, x, y) {
    const { W, L, D } = this;
    const yy = owner === 0 ? L - y : y;
    if (yy > D) return false;
    return x + yy < D || (W - x) + yy < D;
  },
};
