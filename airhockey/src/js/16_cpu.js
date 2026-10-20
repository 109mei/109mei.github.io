'use strict';
/* =====================================================================
   CPU（台の上側＝プレイヤー1）
   - パックを追って打ち返す。強く打つときと、弱く当てるときを使い分ける
   - 速い球が来たら、ゴールの前で待ち構える
   - ゲージが満タンになったら、技に合った場面で必殺技を使う
   CPU も分身にはだまされる（本物と区別しない）
   ===================================================================== */
const CPU = {
  think: 0, mode: 'home', strikeT: 0, skillWait: null, skillPatience: 0,
  tx: 0, ty: 0, speed: AI.SPEED, aim: null,

  reset() {
    this.think = 0; this.mode = 'home'; this.strikeT = 0; this.skillWait = null; this.skillPatience = 0;
    this.aim = null;
  },

  update(dt) {
    const m = Physics.mallets[1];
    if (!m) return;
    this.skillLogic(dt);
    if (this.mode === 'strike') {
      this.strikeT -= dt;
      if (this.strikeT <= 0) { this.mode = 'home'; this.think = 0; }
    }
    this.think -= dt;
    if (this.think <= 0 && this.mode !== 'strike') { this.think = AI.THINK; this.decide(m); }
    m.tx = this.tx; m.ty = this.ty;
    if (m.mirror) m.tx = m.x - (this.tx - m.x);                       // 反転されている：思った向きと左右逆に動いてしまう
    m.speedLimit = this.speed;
  },

  /* まっすぐ進んだときの位置（左右の壁での跳ね返りだけ考える） */
  predict(p, t) {
    const { W } = Table, r = p.r, P = 2 * (W - 2 * r);
    let u = ((p.x + p.vx * t - r) % P + P) % P;
    const x = u > P / 2 ? r + P - u : r + u;
    return { x, y: p.y + p.vy * t };
  },

  /* いちばん気にするべきパックを選ぶ */
  target() {
    const L = Table.L;
    let best = null, bestScore = Infinity;
    for (const p of Physics.pucks) {
      if (p.vis < 0.3 && Math.random() < 0.5) continue;           // 見えない球は見失うことがある
      const toward = p.vy < 0;
      let score = p.y;                                            // 自分のゴール（上）に近いほど急ぐ
      if (toward) score -= Math.min(L * 0.4, -p.vy * 0.3);
      if (!toward && p.y > L / 2) score += L;
      if (score < bestScore) { bestScore = score; best = p; }
    }
    return best;
  },

  decide(m) {
    const { W, L, pr } = Table, mr = Math.max(m.r, Skills.malletR(m.owner));   // 巨大化中は大きさに合わせて立つ位置を変える
    const p = this.target();
    const homeY = L * 0.12;
    this.speed = AI.SPEED;
    if (!p || Match.state !== 'play') {                           // 待機：ゴールの前で、パックの横の位置を少し追う
      const px = p ? p.x : W / 2;
      this.tx = lerp(W / 2, px, 0.3); this.ty = homeY;
      return;
    }
    const sp = Math.hypot(p.vx, p.vy);
    // 守り：速い球が自分のゴールへ向かってくる
    if (p.vy < -0.7 * L && p.y > L * 0.28) {
      const yDef = L * 0.13, t = (p.y - yDef) / -p.vy;
      const q = this.predict(p, t);
      const gh = Table.goalHalf[1];
      this.tx = clamp(q.x, W / 2 - gh - mr * 0.3, W / 2 + gh + mr * 0.3);
      this.ty = yDef;
      this.speed = AI.SPEED * 1.25;
      return;
    }
    // 相手の陣地にあって、こちらへ来ない：待機
    if (p.y > L / 2 + pr && p.vy >= -0.15 * L) {
      this.tx = lerp(W / 2, p.x, 0.35); this.ty = homeY;
      return;
    }
    // 攻め：パックの後ろへ回り込んで、狙った向きへ打つ
    const dist = Math.hypot(p.x - m.x, p.y - m.y);
    const tau = clamp(dist / (AI.SPEED * L) * 0.6, 0, 0.3);
    const q = this.predict(p, tau);
    q.y = clamp(q.y, pr, L / 2 + pr * 0.5);
    if (!this.aim || Math.random() < 0.08) {
      const r = Math.random(), err = rand(-1, 1) * AI.AIM_ERROR * W;
      this.aim = r < 0.6 ? { x: W / 2 + err, y: L + pr } : r < 0.8 ? { x: -W / 2 + err, y: L } : { x: W * 1.5 + err, y: L };
      this.strong = Math.random() < AI.STRONG_RATE;
    }
    let dx = this.aim.x - q.x, dy = this.aim.y - q.y, dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    const R = pr + mr;
    const ax = q.x - dx * R * 1.15, ay = q.y - dy * R * 1.15;          // 打つ前に立つ場所（パックの後ろ）
    const rx = m.x - q.x, ry = m.y - q.y;
    const behind = rx * dx + ry * dy;                                 // 負なら、パックの後ろにいる
    const side = -rx * dy + ry * dx;
    const near = Math.hypot(m.x - ax, m.y - ay);
    if (behind < -R * 0.5 && Math.abs(side) < R * 0.7 && (near < mr * 0.9 || sp < 0.3 * L)) {
      // 打つ：パックを突き抜ける位置へ、決めた速さで振る
      const k = this.strong ? 2.2 : 1.4;
      this.tx = q.x + dx * R * k; this.ty = q.y + dy * R * k;
      this.speed = this.strong ? AI.STRIKE_STRONG : AI.STRIKE_WEAK;
      this.mode = 'strike'; this.strikeT = this.strong ? 0.2 : 0.3;
      this.aim = null;
      return;
    }
    if (behind > -R * 0.3 && dist < R * 2.4) {                        // パックの前にいる：横から回り込む（自分のゴールへ押さない）
      const s = side >= 0 ? 1 : -1;
      this.tx = q.x + (-dy) * s * R * 1.5 - dx * R * 0.8;
      this.ty = q.y + dx * s * R * 1.5 - dy * R * 0.8;
      if (this.ty < m.r) this.ty = m.r;
      return;
    }
    this.tx = ax; this.ty = ay;
  },

  /* 必殺技：満タンになってから少し待ち、技に合った場面で使う */
  skillLogic(dt) {
    if (Match.state !== 'play' || Match.gauge[1] < 1) { this.skillWait = null; return; }
    if (this.skillWait == null) { this.skillWait = rand(AI.SKILL_DELAY[0], AI.SKILL_DELAY[1]); this.skillPatience = 0; }
    this.skillWait -= dt;
    if (this.skillWait > 0) return;
    this.skillPatience += dt;
    const L = Table.L, ps = Physics.pucks.filter(p => !p.ghost), m = Physics.mallets[1];
    const id = Match.skill[1], sk = SKILLS.find(s => s.id === id);
    let good = false;
    if (sk.type === 'attack') good = !Skills.state.armed[1] && ps.some(p => p.y < L * 0.55 || p.vy < 0);   // これから打つとき
    else if (id === 'wall' || id === 'giant') good = ps.some(p => p.vy < -0.9 * L && p.y < L * 0.7);    // 速い球が来るとき
    else if (id === 'shock') good = ps.some(p => Math.hypot(p.x - m.x, p.y - m.y) < SKILL.SHOCK_RANGE * L * 0.6 && p.y < L * 0.5);   // 自分の陣地で近いとき
    else if (id === 'widegoal') good = ps.some(p => p.y < L * 0.45 && Math.hypot(p.vx, p.vy) < 1.2 * L);                        // これから打つとき
    else good = ps.some(p => p.vy > 0.4 * L && p.y < L * 0.6);                                                                   // 相手が受けるとき
    if (good || this.skillPatience > 4) {
      if (Match.pressSkill(1)) this.skillWait = null;
    }
  },
};
