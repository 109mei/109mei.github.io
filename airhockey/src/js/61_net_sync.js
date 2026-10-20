'use strict';
/* =====================================================================
   ゲスト側の表示
   - 自分のマレットは、自分の画面ですぐに動かす
   - 相手のマレットとパックは、届いた状態の間をなめらかに補間して表示する（少しだけ過去を表示する）
   ===================================================================== */
const GuestSync = {
  buf: [],                  // 届いた状態 { T, d }
  offset: null,             // 自分の時計 − ホストの時計（遅れの少ない値を使う）
  samples: [],
  pucks: new Map(),         // パックID → 表示用のパック
  stageT: 0,

  reset() { this.buf = []; this.offset = null; this.samples = []; this.pucks.clear(); this.stageT = 0; },

  push(d) {
    const now = Net.now();
    this.samples.push(now - d.T);
    if (this.samples.length > 90) this.samples.shift();
    this.offset = Math.min(...this.samples);
    if (this.buf.length && d.T <= this.buf[this.buf.length - 1].T) return;   // 古い・順番が入れ替わった状態は捨てる
    this.buf.push({ T: d.T, d });
    if (this.buf.length > 40) this.buf.shift();
    const s = d;                                              // 補間しない値は、最新のものを使う
    if (Match.state === 'goal' && s.st === 'countdown') this.homeMallet();   // 得点後の仕切り直し：消えている自分のマレットは定位置へ
    if (Match.state !== s.st || Math.abs(Match.timer - s.tm) > 0.15) Match.timer = s.tm;
    Match.state = s.st; Match.intro = !!s.it; Match.server = s.sv;
    Match.score = s.sc.slice(); Match.gauge = s.g.slice(); Match.rally = s.r; Match.second = !!s.sec;
    Physics.rally = s.r;
    const k = s.k;
    Skills.state.armed = [k[0] || null, k[1] || null];
    Skills.state.wall = [k[2], k[3]];
    Skills.state.heavy = [k[4], k[5]];
    Skills.state.giant = [k[6] || 0, k[7] || 0];
    Skills.state.wide = [k[8] || 0, k[9] || 0];
    Skills.state.mirror = [k[10] || 0, k[11] || 0];
    Skills.freeze = s.fz ? 0.05 : 0;
    Match.hitStop = s.fz ? 0.05 : 0;
  },

  homeMallet() {
    const m = Physics.mallets[Match.me];
    if (!m || m.active) return;                               // 指で持っているマレットはそのまま
    m.x = m.px = m.tx = Table.W / 2;
    m.y = m.py = m.ty = Match.me === 0 ? Table.L * 0.82 : Table.L * 0.18;
    m.vx = m.vy = m.ivx = m.ivy = 0;
  },

  update(dt) {
    if (!Match.active) return;
    Match.t += dt;
    if (Match.state === 'countdown' || Match.state === 'goal') Match.timer = Math.max(0, Match.timer - dt);
    // 自分のマレット（重い腕もここで反映）
    for (const s of [0, 1]) Skills.state.heavy[s] = Math.max(0, Skills.state.heavy[s] - dt);
    Skills.state.wall = Skills.state.wall.map(v => Math.max(0, v - dt));
    for (const k of ['giant', 'wide', 'mirror']) Skills.state[k] = Skills.state[k].map(v => Math.max(0, v - dt));
    Skills.applyMallets(dt);
    Table.updateGoals(dt);
    Physics.updateMallets(dt, Match.me);
    if (!this.buf.length || this.offset == null) { Stage.set(this.stageT, dt); Table.clampGoal(); Table.buildWalls(); return; }
    const rt = Net.now() - this.offset - NET.INTERP_DELAY;    // 表示するホストの時刻
    let a = this.buf[0], b = this.buf[this.buf.length - 1];
    for (let i = this.buf.length - 1; i > 0; i--) {
      if (this.buf[i - 1].T <= rt) { a = this.buf[i - 1]; b = this.buf[i]; break; }
    }
    let u, extra = 0;
    if (rt >= b.T) { u = 1; a = b; extra = Math.min(rt - b.T, 0.1); }   // 新しいのが届いていない：速さで少し先へ
    else if (rt <= a.T) u = 0;
    else u = (rt - a.T) / (b.T - a.T || 1);
    const A = a.d, B = b.d, L = Table.L;
    // 相手（ホスト）のマレット
    const om = Physics.mallets[1 - Match.me];
    if (om) {
      om.px = om.x; om.py = om.y;
      om.active = !!B.m[4];
      const uu = A.m[4] ? u : 1;                                  // 現れた瞬間は、途中を補間せず現れた場所に出す
      om.x = lerp(A.m[0], B.m[0], uu) + B.m[2] * extra; om.y = lerp(A.m[1], B.m[1], uu) + B.m[3] * extra;
      const c = Table.clampMallet(om.owner, om.x, om.y, om.r); om.x = c.x; om.y = c.y;
      om.vx = B.m[2]; om.vy = B.m[3];
    }
    // パック
    const pa = new Map(A.p.map(q => [q[0], q])), list = [];
    for (const q of B.p) {
      const id = q[0], o = pa.get(id);
      let x = q[1], y = q[2];
      if (o && Math.hypot(q[1] - o[1], q[2] - o[2]) < L * 0.25) { x = lerp(o[1], q[1], u); y = lerp(o[2], q[2], u); }
      x += q[3] * extra; y += q[4] * extra;
      if (extra > 0) { x = clamp(x, Table.pr, Table.W - Table.pr); y = clamp(y, -Table.pr, Table.L + Table.pr); }   // 先読みで壁の外へ出さない
      let p = this.pucks.get(id);
      if (!p) { p = Physics.newPuck(x, y); p.id = id; this.pucks.set(id, p); }
      p.x = x; p.y = y; p.vx = q[3]; p.vy = q[4];
      const f = q[5];
      p.ghost = !!(f & 1); p.vanish = !!(f & 2); p.boost = f & 4 ? SKILL.FAST_BOOST : 1; p.curve = f & 8 ? 1 : 0;
      p.skill = f & 4 ? 'fast' : f & 16 ? 'split' : f & 32 ? 'zigzag' : f & 64 ? 'mini' : null;
      p.zig = f & 32 ? (p.zig || { t: 0, dir: 1 }) : null;
      p.r = f & 64 ? Table.pr * SKILL.MINI_SCALE : Table.pr;
      p.vis = o ? lerp(o[6], q[6], u) : q[6];
      p.lastHit = q[7];
      list.push(p);
    }
    for (const id of this.pucks.keys()) if (!B.p.some(q => q[0] === id)) this.pucks.delete(id);
    Physics.pucks = list;
    // ステージの時刻（動く壁・シャッター・ゴールの幅）
    this.stageT = lerp(A.sg, B.sg, u) + extra;
    Stage.set(this.stageT, dt);
    Table.clampGoal();
    Table.buildWalls();
  },

  finish(score) {
    Match.score = score.slice();
    Net.phase = 'result';
    Match.finish();
  },
};
