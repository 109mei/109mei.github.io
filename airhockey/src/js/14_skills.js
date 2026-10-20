'use strict';
/* =====================================================================
   必殺技
   - 攻撃（剛速球・カーブ・分身・消える球・稲妻・ミニ球）：押したあと、次に弾いたショットにかかる
   - 守り（防壁・巨大化・衝撃波）・妨害（重い腕・ゴール拡大・反転）：押した瞬間に効く
   技はいきなり使われるのが面白いので、発動の瞬間の演出（止まる・揺れる・音）は出さない。
   効いている間の様子（壁・大きなマレット・重り など）だけが見える。
   状態は Skills.state にまとめる（オンラインではホストから送る）。数値は、その効果を受けている人ごと
   ===================================================================== */
const Skills = {
  state: null,
  freeze: 0,                                                       // 発動で止まる残り時間（いまは 0 のまま）

  fresh() { return { armed: [null, null], wall: [0, 0], heavy: [0, 0], giant: [0, 0], wide: [0, 0], mirror: [0, 0] }; },
  reset() { this.state = this.fresh(); this.freeze = 0; },
  /* 得点後の仕切り直し：時間で効く技は消える。構え中の技は次のショットまで持ち越す */
  resetPoint() {
    const armed = this.state.armed;
    this.state = this.fresh();
    this.state.armed = armed;
    this.freeze = 0;
    this.applyMallets(0);
  },

  /* 防壁：ゴールの口をふさぐ壁 */
  shapes() {
    const out = [];
    for (const owner of [0, 1]) {
      if (this.state.wall[owner] <= 0) continue;
      const gy = Table.goalY(owner), gh = Table.goalHalf[owner], cx = Table.W / 2;
      out.push({ ax: cx - gh - Table.pr * 0.3, ay: gy, bx: cx + gh + Table.pr * 0.3, by: gy, r: Table.W * SKILL.WALL_THICK,
                 vx: 0, vy: 0, e: TUNE.WALL_RESTITUTION, kind: 'barrier', owner });
    }
    return out;
  },
  /* ゴール拡大：そのプレイヤーのゴールの幅の倍率 */
  goalScale(o) { return this.state.wide[o] > 0 ? SKILL.WIDE_SCALE : 1; },

  update(dt) {
    const s = this.state;
    for (const k of ['wall', 'heavy', 'giant', 'wide', 'mirror']) for (const o of [0, 1]) s[k][o] = Math.max(0, s[k][o] - dt);
    this.applyMallets(dt);
    this.updateVanish();
    this.freeze = Math.max(0, this.freeze - dt);
  },
  /* そのプレイヤーのマレットの（なろうとしている）大きさ。巨大化中は大きい */
  malletR(o) { return Table.mr * (this.state.giant[o] > 0 ? SKILL.GIANT_SCALE : 1); },
  /* マレットへの効果：重い腕・反転・巨大化（大きさはなめらかに変える） */
  applyMallets(dt) {
    const s = this.state;
    for (const m of Physics.mallets) {
      m.heavy = s.heavy[m.owner] > 0;
      m.mirror = s.mirror[m.owner] > 0;
      const target = this.malletR(m.owner);
      m.r = dt > 0 ? m.r + (target - m.r) * (1 - Math.exp(-dt * 12)) : target;
      if (Math.abs(m.r - target) < 0.05) m.r = target;
    }
  },
  /* 消える球：飛んだ距離で見え方が変わる */
  updateVanish() {
    for (const p of Physics.pucks) {
      if (!p.vanish) { p.vis = 1; continue; }
      const k = p.travel / Table.L;
      p.vis = k < SKILL.VANISH_FROM ? 1
        : k < SKILL.VANISH_FULL ? 1 - (k - SKILL.VANISH_FROM) / (SKILL.VANISH_FULL - SKILL.VANISH_FROM)
        : k < SKILL.VANISH_BACK ? 0
        : k < SKILL.VANISH_END ? (k - SKILL.VANISH_BACK) / (SKILL.VANISH_END - SKILL.VANISH_BACK) : 1;
    }
  },

  /* その技をいま使えるか。衝撃波はマレットから出るので、マレットが出ている（指を置いている）ときだけ */
  canActivate(owner) {
    const m = Physics.mallets[owner];
    if (Match.skill[owner] === 'shock') return !!(m && m.active);
    return true;
  },

  /* ボタンが押されたとき（ゲージが満タンで、プレー中だけ Match から呼ばれる） */
  activate(owner) {
    const id = Match.skill[owner], sk = SKILLS.find(s => s.id === id);
    if (!sk) return;
    const s = this.state, foe = 1 - owner;
    if (sk.type === 'attack') s.armed[owner] = id;
    else if (id === 'wall') s.wall[owner] = SKILL.WALL_TIME;
    else if (id === 'giant') s.giant[owner] = SKILL.GIANT_TIME;
    else if (id === 'shock') this.shock(owner);
    else if (id === 'heavy') s.heavy[foe] = SKILL.HEAVY_TIME;
    else if (id === 'widegoal') s.wide[foe] = SKILL.WIDE_TIME;
    else if (id === 'mirror') s.mirror[foe] = SKILL.MIRROR_TIME;
    this.applyMallets(0);
    this.freeze = SKILL.FREEZE;
    Events.emit('skill', owner, id);
  },

  /* 衝撃波：近くのパックを、相手の陣地のほうへ吹き飛ばす（自分のゴールへは飛ばさない） */
  shock(owner) {
    const m = Physics.mallets[owner], L = Table.L, R = SKILL.SHOCK_RANGE * L, toward = owner === 0 ? -1 : 1;
    if (!m || !m.active) return;
    Events.emit('shockwave', owner, m.x, m.y);
    for (const p of Physics.pucks) {
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
      if (d > R) continue;
      let nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : toward;
      if (ny * toward < 0.45) { ny = toward * 0.75; nx = Math.sign(nx || 1) * Math.sqrt(1 - ny * ny); }   // 相手の陣地のほうへ向け直す
      const k = SKILL.SHOCK_POWER * L * (0.5 + 0.5 * (1 - d / R));
      p.vx = nx * k; p.vy = ny * k;
      clampSpeed(p);
      if (!p.ghost) p.lastHit = owner;
    }
  },

  /* パックにかかっているショットの効果を消す（打ち返したとき・中央から出し直すとき） */
  clearShot(p) {
    p.boost = 1; p.curve = 0; p.vanish = false; p.vis = 1; p.travel = 0; p.zig = null; p.r = Table.pr; p.skill = null;
  },

  /* マレットでパックを打ち返したとき。前のショットの効果を消し、構えていた技をかける */
  onMalletHit(p, m) {
    this.clearShot(p);
    for (const q of Physics.pucks) if (q.ghost && q.owner !== m.owner) { q.dead = true; Events.emit('pop', q.x, q.y, q.owner); }
    const id = this.state.armed[m.owner];
    if (!id) return;
    this.state.armed[m.owner] = null;
    this.applyShot(id, p, m);
    Events.emit('shot', m.owner, id, p.x, p.y, p.vx, p.vy);
  },

  applyShot(id, p, m) {
    const rot = (q, a) => {
      const c = Math.cos(a), s = Math.sin(a), vx = q.vx * c - q.vy * s, vy = q.vx * s + q.vy * c;
      q.vx = vx; q.vy = vy;
    };
    p.skill = id; p.skillOwner = m.owner;
    if (id === 'fast') {                              // 剛速球：上限の速さで飛ぶ
      p.boost = SKILL.FAST_BOOST;
      let sp = Math.hypot(p.vx, p.vy);
      if (sp < 1e-6) { p.vx = p.x - m.x; p.vy = p.y - m.y; sp = Math.hypot(p.vx, p.vy) || 1; }
      const k = Physics.maxSpeed(p) / sp;
      p.vx *= k; p.vy *= k;
    } else if (id === 'curve') {                      // カーブ：振った向きと逆へ曲がって戻ってくる。真っすぐ打てば中央へ曲がる
      const lateral = m.vx * (m.owner === 0 ? 1 : -1);  // 打った人から見て右へ振ったら正
      let dir;
      if (Math.abs(lateral) > 0.25 * Table.L) dir = lateral > 0 ? -1 : 1;
      else dir = (p.x > Table.W / 2 ? -1 : 1) * (m.owner === 0 ? 1 : -1);
      p.curve = dir * SKILL.CURVE_RATE;
    } else if (id === 'split') {                      // 分身：3つに分かれる。本物の向きはランダム
      const a = SKILL.SPLIT_ANGLE, offs = [-a, 0, a];
      for (let i = offs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [offs[i], offs[j]] = [offs[j], offs[i]]; }
      rot(p, offs[0]);
      for (let i = 1; i < 3; i++) {
        const g = Physics.newPuck(p.x, p.y, p.vx, p.vy);
        rot(g, offs[i] - offs[0]);
        g.ghost = true; g.owner = m.owner; g.life = SKILL.SPLIT_LIFE; g.lastHit = p.lastHit;
        g.skill = 'split'; g.skillOwner = m.owner;
        Physics.pucks.push(g);
      }
    } else if (id === 'vanish') {                     // 消える球：途中で見えなくなる
      p.vanish = true; p.travel = 0;
    } else if (id === 'zigzag') {                     // 稲妻：一定の間隔で左右に折れ曲がる（最初は半分だけ曲げて、元の向きを中心にジグザグ）
      p.zig = { t: SKILL.ZIG_PERIOD * 0.5, dir: Math.random() < 0.5 ? 1 : -1, first: true };
    } else if (id === 'mini') {                       // ミニ球：パックが小さくなる（当たり判定も小さい）
      p.r = Table.pr * SKILL.MINI_SCALE;
    }
  },

  /* 稲妻の折れ曲がり（物理の細かい1歩ごとに呼ばれる） */
  stepZig(p, h) {
    const z = p.zig;
    z.t -= h;
    if (z.t > 0) return;
    const a = (z.first ? SKILL.ZIG_ANGLE / 2 : SKILL.ZIG_ANGLE) * z.dir;
    const c = Math.cos(a), s = Math.sin(a), vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
    p.vx = vx; p.vy = vy;
    z.dir = -z.dir; z.first = false; z.t += SKILL.ZIG_PERIOD;
  },
};
Skills.reset();
