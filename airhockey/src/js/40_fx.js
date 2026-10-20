'use strict';
/* =====================================================================
   演出（粒・衝撃波・残像・画面の揺れ・フラッシュ・技のマーク・マレットの出る消える…）
   出来事（Events）を受けて作る。時間はヒットストップの影響を受けない実時間で進める
   位置は台の座標（暗いステージでは、暗くする前に描くので明かりの外では見えない）
   ===================================================================== */
const Fx = {
  parts: [], rings: [], glows: [], texts: [], beams: [],
  trails: new Map(),                // パックID → 最近の位置 [{x,y,t,s}]
  shakeAmp: 0, shakeX: 0, shakeY: 0,
  flash: null,                      // { color, a, life, max }
  present: [0, 0],                  // マレットの見え方（0＝消えている、1＝出ている）
  wasActive: [false, false],
  appearT: [9, 9],
  inactiveT: [0, 0],
  goalAnim: null,                   // { scorer, t }
  countAnim: null,                  // { n, t }
  scorePop: [9, 9],
  malletPulse: [0, 0],
  gaugeShow: [0, 0],                // 表示用のゲージ（なめらかに追いかける）
  gaugeSplash: [0, 0],
  gaugeFullT: [9, 9],
  denyT: [9, 9],
  springKick: [],                   // { side, y, t }
  heat: 0,                          // ラリーの盛り上がり（0..1）
  rallyPop: null,                   // { n, t }
  secondT: 9,
  time: 0,
  lastSmash: -9,

  reset() {
    this.parts = []; this.rings = []; this.glows = []; this.texts = []; this.beams = [];
    this.trails.clear(); this.shakeAmp = 0; this.flash = null;
    this.present = [0, 0]; this.wasActive = [false, false]; this.appearT = [9, 9]; this.inactiveT = [0, 0];
    this.goalAnim = null; this.countAnim = null; this.scorePop = [9, 9]; this.malletPulse = [0, 0];
    this.gaugeShow = [0, 0]; this.gaugeSplash = [0, 0]; this.gaugeFullT = [9, 9]; this.denyT = [9, 9];
    this.springKick = []; this.heat = 0; this.rallyPop = null; this.secondT = 9;
  },

  init() { Events.on((type, a) => { try { this.event(type, a); } catch (e) { console.error(e); } }); },

  /* ---- 部品 ---- */
  part(o) {
    if (this.parts.length >= FX.PARTICLE_MAX) this.parts.shift();
    o.life = o.max = o.life || 0.4;
    o.drag = o.drag == null ? 4 : o.drag;
    o.delay = o.delay || 0;
    this.parts.push(o);
    return o;
  },
  sparks(x, y, nx, ny, n, spd, color, spread = 1.1, life = 0.35, w = 1) {
    const base = Math.atan2(ny, nx);
    for (let i = 0; i < n; i++) {
      const a = base + rand(-spread, spread), s = spd * rand(0.35, 1);
      this.part({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rand(0.6, 1.2), color, w: w * rand(0.6, 1.3), drag: 5 });
    }
  },
  dots(x, y, n, spd, color, size, life = 0.5, drag = 3) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = spd * rand(0.2, 1);
      this.part({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rand(0.6, 1.2), color, size: size * rand(0.6, 1.4), drag });
    }
  },
  ring(x, y, r0, r1, life, color, w = 0.012, delay = 0) {
    this.rings.push({ x, y, r0, r1, life, max: life, color, w, delay });
  },
  glow(x, y, r, life, color, delay = 0) { this.glows.push({ x, y, r, life, max: life, color, delay }); },
  text(s, x, y, color, size, life = 0.9, rise = 0.06) { this.texts.push({ s, x, y, color, size, life, max: life, rise }); },
  shake(px) { this.shakeAmp = Math.max(this.shakeAmp, px); },
  flashScreen(color, a, life) { this.flash = { color, a, life, max: life }; },
  denied(side) { this.denyT[side] = 0; Sound.denied(); },

  colorOf(owner) { return owner === Match.me ? COLORS.me : COLORS.opp; },

  /* ---- 出来事 ---- */
  event(type, a) {
    const L = Table.L, W = Table.W, pr = Table.pr;
    switch (type) {
      case 'mhit': {
        const [owner, power, x, y, nx, ny] = a, k = clamp(power / 3, 0, 1), col = this.colorOf(owner);
        this.sparks(x, y, nx, ny, 6 + Math.round(16 * k), (0.5 + 1.4 * k) * L, mix(col, '#ffffff', 0.4), 1.0, 0.3 + 0.15 * k, 1 + k);
        this.ring(x, y, pr * 0.8, pr * (2.4 + 3.2 * k), 0.28 + 0.12 * k, col, 0.014 + 0.01 * k);
        this.glow(x, y, pr * (2 + 3 * k), 0.14 + 0.08 * k, '#ffffff');
        this.malletPulse[owner] = 1;
        if (k > 0.45) this.shake(FX.SHAKE_HIT * k);
        if (k > 0.75) {
          this.ring(x, y, pr, pr * 7, 0.42, '#ffffff', 0.008, 0.04);   // 強打：白い大きな輪（文字は出さない）
        }
        break;
      }
      case 'mtouch': this.dots(a[2], a[3], 3, 0.15 * L, '#cfe3ff', pr * 0.12, 0.3); break;
      case 'hit': {
        const [kind, power, x, y, nx, ny] = a, k = clamp(power / 2.5, 0, 1);
        const col = { wall: COLORS.wall, pillar: STAGE_COLOR.pillar, bumper: STAGE_COLOR.bumper, spring: STAGE_COLOR.spring,
                      sweeper: STAGE_COLOR.mover, shutter: STAGE_COLOR.shutter, barrier: SKILL_TYPE.defense.color, puck: '#ffffff' }[kind] || '#ffffff';
        this.sparks(x, y, nx, ny, 3 + Math.round(10 * k), (0.3 + 0.9 * k) * L, col, 1.2, 0.28, 0.8 + k * 0.6);
        this.glow(x, y, pr * (1.4 + 2.2 * k), 0.18, col);
        if (kind === 'bumper' || kind === 'spring' || kind === 'barrier') this.ring(x, y, pr * 0.5, pr * (3 + 2 * k), 0.35, col, 0.012);
        if (kind === 'spring') this.springKick.push({ side: x < W / 2 ? 0 : 1, y, t: 0 });
        if (k > 0.5) this.shake(2 + 3 * k);
        this.flashShape(kind, x, y);
        break;
      }
      case 'warp': {
        const [x1, y1, x2, y2] = a, col = STAGE_COLOR.warp;
        this.beams.push({ x1, y1, x2, y2, life: 0.28, max: 0.28, color: col });
        for (const [x, y, d] of [[x1, y1, x1 < W / 2 ? 1 : -1], [x2, y2, x2 < W / 2 ? 1 : -1]]) {
          this.sparks(x, y, d, 0, 10, 0.7 * L, mix(col, '#ffffff', 0.3), 0.9, 0.35);
          this.ring(x, y, pr * 0.5, pr * 3.5, 0.35, col, 0.014);
          this.glow(x, y, pr * 3, 0.25, col);
        }
        break;
      }
      case 'pop': {
        const [x, y, owner] = a, col = SKILL_TYPE.attack.color;
        for (let i = 0; i < 12; i++) {
          const ang = rand(0, TAU), s = rand(0.2, 0.7) * L;
          this.part({ k: 'shard', x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, life: rand(0.3, 0.55), color: i % 2 ? col : '#ffffff', size: pr * rand(0.25, 0.5), rot: rand(0, TAU), spin: rand(-14, 14), drag: 4 });
        }
        this.ring(x, y, pr * 0.6, pr * 3, 0.3, col, 0.012);
        break;
      }
      case 'goal': {
        const [scorer, x] = a, gy = scorer === 0 ? 0 : L, dir = scorer === 0 ? 1 : -1;   // 入った側のゴールの位置と、台の内側の向き
        const col = this.colorOf(scorer);
        this.sparks(x, gy, 0, dir, 60, 1.8 * L, mix(col, '#ffffff', 0.35), 1.45, 0.75, 1.8);
        this.sparks(x, gy, 0, dir, 26, 2.6 * L, '#ffffff', 0.5, 0.5, 1.4);
        for (let i = 0; i < 34; i++) {
          const ang = Math.atan2(dir, 0) + rand(-1.4, 1.4), s = rand(0.4, 1.6) * L;
          this.part({ k: 'shard', x, y: gy, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, life: rand(0.6, 1.2),
                      color: pick([col, COLORS.ready, '#ffffff', mix(col, '#ffffff', 0.5)]), size: pr * rand(0.3, 0.7),
                      rot: rand(0, TAU), spin: rand(-12, 12), drag: 2.4 });
        }
        for (let i = 0; i < 3; i++) this.ring(x, gy, pr, pr * (6 + i * 4), 0.6 + i * 0.12, i === 1 ? '#ffffff' : col, 0.02 - i * 0.004, i * 0.07);
        this.glow(x, gy, W * 0.6, 0.6, col);
        this.dots(x, gy + dir * pr, 18, 0.3 * L, mix(col, '#ffffff', 0.2), pr * 0.5, 1.1, 1.5);
        this.shake(FX.SHAKE_GOAL);
        this.flashScreen(col, 0.38, 0.45);
        this.goalAnim = { scorer, t: 0 };
        this.texts = [];                                         // ゴールの文字と重ならないように
        this.scorePop[scorer] = 0;
        this.heat = 0;
        this.trails.clear();
        break;
      }
      case 'skill': break;                                     // 発動の瞬間の演出は出さない（いきなり使われるのが面白い）
      case 'shockwave': {                                      // 衝撃波：効果そのものが分かるよう、波の輪だけ
        const [owner, x, y] = a, col = SKILL_TYPE.defense.color;
        this.ring(x, y, Table.mr, SKILL.SHOCK_RANGE * L, 0.4, col, 0.012);
        this.ring(x, y, Table.mr, SKILL.SHOCK_RANGE * L * 0.7, 0.32, '#ffffff', 0.006, 0.04);
        break;
      }
      case 'shot': {
        const [owner, id, x, y, vx, vy] = a, sp = Math.hypot(vx, vy) || 1, nx = vx / sp, ny = vy / sp;
        const col = SKILL_TYPE.attack.color;
        if (id === 'fast') {
          this.sparks(x, y, nx, ny, 26, 2.2 * L, '#ffb15c', 0.45, 0.45, 1.8);
          this.sparks(x, y, -nx, -ny, 14, 0.8 * L, '#ff5b2e', 1.2, 0.5, 1.4);
          this.ring(x, y, pr, pr * 6, 0.4, '#ffd27a', 0.02);
        } else if (id === 'curve') {
          this.ring(x, y, pr, pr * 4.5, 0.45, col, 0.016);
          for (let i = 0; i < 16; i++) { const ang = i / 16 * TAU; this.part({ k: 'dot', x: x + Math.cos(ang) * pr * 2, y: y + Math.sin(ang) * pr * 2, vx: -Math.sin(ang) * 0.6 * L, vy: Math.cos(ang) * 0.6 * L, life: 0.4, color: col, size: pr * 0.3, drag: 3 }); }
        } else if (id === 'split') {
          this.glow(x, y, pr * 5, 0.3, '#ffffff');
          this.ring(x, y, pr, pr * 5, 0.35, col, 0.016);
          this.sparks(x, y, nx, ny, 18, 1.2 * L, '#ffe2bd', 0.4, 0.35);
        } else if (id === 'zigzag') {
          this.sparks(x, y, nx, ny, 16, 1.4 * L, '#fff27a', 0.9, 0.3, 1.2);
          this.glow(x, y, pr * 3, 0.2, '#ffe14d');
        } else if (id === 'mini') {
          this.ring(x, y, pr * 4, pr * 0.6, 0.3, col, 0.012);
          this.dots(x, y, 10, 0.4 * L, '#ffe2bd', pr * 0.2, 0.3, 5);
        } else if (id === 'vanish') {
          for (let i = 0; i < 14; i++) this.part({ k: 'smoke', x: x + rand(-1, 1) * pr, y: y + rand(-1, 1) * pr, vx: rand(-0.15, 0.15) * L, vy: rand(-0.15, 0.15) * L, life: rand(0.5, 0.9), color: '#c9b8ff', size: pr * rand(1, 2), drag: 2 });
          this.ring(x, y, pr, pr * 4, 0.4, '#c9b8ff', 0.012);
        }
        break;
      }
      case 'second': {
        const [x, y] = a, col = COLORS.ready;
        this.secondT = 0;
        for (let i = 0; i < 3; i++) this.ring(x, y, pr * 6 - i * pr, pr * 0.5, 0.5, i === 1 ? '#ffffff' : col, 0.012, i * 0.1);
        for (let i = 0; i < 24; i++) {
          const ang = rand(0, TAU), r = pr * rand(4, 7);
          this.part({ k: 'dot', x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r, vx: -Math.cos(ang) * r * 2.4, vy: -Math.sin(ang) * r * 2.4, life: 0.4, color: col, size: pr * 0.28, drag: 0 });
        }
        this.ring(x, y, pr, pr * 8, 0.6, col, 0.018, 0.45);
        this.flashScreen(col, 0.12, 0.3);
        break;
      }
      case 'rally': {
        const n = a[0];
        this.rallyPop = { n, t: 0 };
        if (n > 0 && n % 5 === 0) {
          this.ring(W / 2, L / 2, W * 0.1, W * 0.6, 0.6, COLORS.ready, 0.01);
          this.flashScreen(COLORS.ready, 0.1, 0.25);
        }
        break;
      }
      case 'full': {
        const owner = a[0];
        this.gaugeFullT[owner] = 0;
        for (const side of [0, 1]) {
          const c = triCenter(owner, side);
          this.dots(c.x, c.y, 14, 0.5 * L, COLORS.ready, Table.pr * 0.3, 0.6, 3);
          this.ring(c.x, c.y, Table.pr, Table.D * 0.9, 0.5, COLORS.ready, 0.012);
        }
        break;
      }
      case 'count':
        if (!a[1]) this.countAnim = { n: a[0], t: 0 };       // 得点後のサーブでは数字を出さない
        if (a[0] === 0) {                                     // 始まりの合図：中央から光の輪（文字は出さない）
          this.ring(W / 2, L / 2, pr, W * 0.55, 0.5, COLORS.ready, 0.014);
          this.ring(W / 2, L / 2, pr, W * 0.35, 0.4, '#ffffff', 0.008, 0.05);
        }
        break;
    }
  },

  /* 当たった柱やバンパーを光らせる（ゲストでも光るよう、位置から探す） */
  flashShape(kind, x, y) {
    let best = null, bd = Infinity;
    for (const s of Stage.shapes) {
      if (s.kind !== kind) continue;
      const d = segDist(x, y, s.ax, s.ay, s.bx, s.by).d - s.r;
      if (d < bd) { bd = d; best = s; }
    }
    if (best && bd < Table.pr * 1.5) best.flash = 1;
  },

  /* ---- 毎フレーム ---- */
  update(dt) {
    this.time += dt;
    const keep = [];
    for (const p of this.parts) {
      if (p.delay > 0) { p.delay -= dt; keep.push(p); continue; }
      p.life -= dt;
      if (p.life <= 0) continue;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k;
      if (p.k === 'home' && p.target) {                    // 目標へ吸い寄せられる粒
        const u = 1 - p.life / p.max, tx = p.target.x, ty = p.target.y;
        p.x = lerp(p.x, tx, clamp(u * u * 0.5 + dt * 6 * u, 0, 1));
        p.y = lerp(p.y, ty, clamp(u * u * 0.5 + dt * 6 * u, 0, 1));
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.spin) p.rot += p.spin * dt;
      keep.push(p);
    }
    this.parts = keep;
    const age = list => list.filter(r => { if (r.delay > 0) { r.delay -= dt; return true; } r.life -= dt; return r.life > 0; });
    this.rings = age(this.rings); this.glows = age(this.glows); this.beams = age(this.beams);
    this.texts = this.texts.filter(t => (t.life -= dt) > 0);
    this.springKick = this.springKick.filter(s => (s.t += dt) < 0.4);

    // 画面の揺れ
    this.shakeAmp *= Math.exp(-dt * 9);
    if (this.shakeAmp < 0.2) this.shakeAmp = 0;
    const a = rand(0, TAU);
    this.shakeX = Math.cos(a) * this.shakeAmp; this.shakeY = Math.sin(a) * this.shakeAmp;
    if (this.flash && (this.flash.life -= dt) <= 0) this.flash = null;
    this.updateMallets(dt);
    if (this.goalAnim) this.goalAnim.t += dt;
    if (this.countAnim) this.countAnim.t += dt;
    if (this.rallyPop) this.rallyPop.t += dt;
    this.secondT += dt;
    for (const o of [0, 1]) {
      this.scorePop[o] += dt; this.denyT[o] += dt; this.gaugeFullT[o] += dt;
      this.malletPulse[o] = Math.max(0, this.malletPulse[o] - dt * 5);
      const g = Match.shownGauge(o), s = this.gaugeShow[o];
      if (g > s + 0.001) { this.gaugeShow[o] = Math.min(g, s + dt * 1.2); this.gaugeSplash[o] = 1; }
      else if (g < s) this.gaugeShow[o] = Math.max(g, s - dt * 2.5);
      this.gaugeSplash[o] = Math.max(0, this.gaugeSplash[o] - dt * 1.5);
    }
    const target = clamp(Match.rally / TUNE.SECOND_PUCK_RALLY, 0, 1);
    this.heat += (target - this.heat) * (1 - Math.exp(-dt * 3));
    this.updateTrails();
  },

  /* マレットが出る・消える演出 */
  updateMallets(dt) {
    for (const o of [0, 1]) {
      const m = Physics.mallets[o];
      if (!m) continue;
      const on = !!m.active, col = this.colorOf(o), r = m.r;
      if (on && !this.wasActive[o]) {
        this.appearT[o] = 0;
        this.ring(m.x, m.y, r * 0.6, r * 2.4, 0.32, col, 0.014);
        this.dots(m.x, m.y, 10, 0.5 * Table.L, mix(col, '#ffffff', 0.4), Table.pr * 0.25, 0.35, 5);
        if (o === Match.me) Sound.appear();
      } else if (!on && this.wasActive[o]) {
        this.dots(m.x, m.y, 8, 0.35 * Table.L, col, Table.pr * 0.22, 0.3, 5);
      }
      this.wasActive[o] = on;
      this.appearT[o] += dt;
      this.present[o] = on ? Math.min(1, this.present[o] + dt / 0.12) : Math.max(0, this.present[o] - dt / 0.14);
      this.inactiveT[o] = on ? 0 : this.inactiveT[o] + dt;
    }
  },

  /* パックの残像：最近の位置を覚えておく */
  updateTrails() {
    const now = this.time, alive = new Set();
    for (const p of Physics.pucks) {
      alive.add(p.id);
      let tr = this.trails.get(p.id);
      if (!tr) { tr = []; this.trails.set(p.id, tr); }
      const last = tr[tr.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) > Table.L * 0.25) tr.length = 0;   // ワープ・出し直しでは線をつなげない
      tr.push({ x: p.x, y: p.y, t: now, s: Math.hypot(p.vx, p.vy) / Table.L });
      while (tr.length && now - tr[0].t > FX.TRAIL_TIME) tr.shift();
      if (Match.state === 'play' && Match.hitStop <= 0 && Skills.freeze <= 0) this.emitPuckFx(p);
    }
    for (const id of this.trails.keys()) if (!alive.has(id)) this.trails.delete(id);
  },

  /* パックが飛びながら出す粒（剛速球の火の粉・カーブの軌跡・床の効果） */
  emitPuckFx(p) {
    const sp = Math.hypot(p.vx, p.vy), L = Table.L;
    if (p.vis < 0.5) return;
    if (p.skill === 'fast' && p.boost > 1 && Math.random() < 0.9) {
      this.part({ k: 'dot', x: p.x + rand(-1, 1) * p.r * 0.6, y: p.y + rand(-1, 1) * p.r * 0.6, vx: -p.vx * 0.15 + rand(-0.1, 0.1) * L,
                  vy: -p.vy * 0.15 + rand(-0.1, 0.1) * L, life: rand(0.2, 0.4), color: pick(['#ffb15c', '#ff6a2e', '#ffe08a']), size: p.r * rand(0.3, 0.6), drag: 4 });
    }
    if (p.skill === 'zigzag' && Math.random() < 0.7) {
      const a = rand(0, TAU), s2 = rand(0.2, 0.6) * L;
      this.part({ k: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2, life: 0.15, color: '#fff27a', w: 0.8, drag: 6 });
    }
    if (p.curve && Math.random() < 0.6) {
      this.part({ k: 'dot', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.35, color: SKILL_TYPE.attack.color, size: p.r * 0.25, drag: 0 });
    }
    if (p.zoneArrow > 0 && Math.random() < 0.5) {
      this.part({ k: 'spark', x: p.x, y: p.y, vx: -p.vx * 0.3, vy: -p.vy * 0.3, life: 0.2, color: STAGE_COLOR.arrow, w: 0.8, drag: 4 });
    }
    if (p.zoneSlow > 0 && Math.random() < 0.4) {
      this.part({ k: 'dot', x: p.x + rand(-1, 1) * p.r, y: p.y + rand(-1, 1) * p.r, vx: 0, vy: 0, life: 0.5, color: '#bff7f7', size: p.r * 0.2, drag: 0 });
    }
    if (p.zoneArrow > 0) p.zoneArrow -= 1 / 60;
    if (p.zoneSlow > 0) p.zoneSlow -= 1 / 60;
    if (sp > 2.4 * L && Math.random() < 0.35 && !p.ghost) {
      this.part({ k: 'spark', x: p.x, y: p.y, vx: -p.vx * 0.2, vy: -p.vy * 0.2, life: 0.15, color: '#ffffff', w: 0.6, drag: 6 });
    }
  },
};

/* 必殺技ボタンの三角形の重心（owner 側、side 0＝左・1＝右） */
function triCenter(owner, side) {
  const { W, L, D } = Table, y = owner === 0 ? L - D / 3 : D / 3;
  return { x: side === 0 ? D / 3 : W - D / 3, y };
}
