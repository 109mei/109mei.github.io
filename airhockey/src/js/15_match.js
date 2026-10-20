'use strict';
/* =====================================================================
   試合の進行
   mode: 'cpu'（ひとり）／'host'（オンラインで部屋を作った側。物理を担当）／'guest'（参加した側。表示と入力だけ）
   プレイヤー番号：0＝台の下側（CPU戦の自分・ホスト）、1＝台の上側（CPU・ゲスト）
   ===================================================================== */
const Match = {
  active: false, paused: false,
  mode: 'cpu',
  me: 0,
  state: 'idle',            // idle / countdown / play / goal / over
  timer: 0, t: 0,
  score: [0, 0],
  rally: 0,
  gauge: [0, 0],
  skill: ['fast', 'fast'],
  stageId: 'pillars',
  server: 0,
  second: false,
  pendingSecond: false,
  intro: true,
  hitStop: 0,
  stall: 0,
  lastGoal: null,           // { scorer, x, t }
  opts: null,

  start(opts) {
    this.opts = opts;
    this.mode = opts.mode;
    this.me = opts.mode === 'guest' ? 1 : 0;
    this.skill = opts.skills.slice();
    this.stageId = opts.stage;
    Layout.locked = false;
    if (this.mode === 'guest') Layout.setTableFromAspect(opts.aspect, true);
    else Layout.setTableFromView();
    Layout.locked = true;
    Table.setup(Layout.W);
    Stage.load(this.stageId);
    this.score = [0, 0];
    this.gauge = [0, 0];
    this.t = 0;
    this.paused = false;
    Physics.mallets = [0, 1].map(o => Physics.makeMallet(o, Table.W / 2, o === 0 ? Table.L * 0.82 : Table.L * 0.18));
    for (const m of Physics.mallets) m.active = this.mode === 'cpu' && m.owner === 1;   // 人のマレットは、指を置くまで出てこない
    Physics.nextId = 1;
    Skills.reset();
    Input.reset();
    CPU.reset();
    if (typeof Fx !== 'undefined') Fx.reset();
    this.active = true;
    this.resetPoint(opts.server != null ? opts.server : (Math.random() < 0.5 ? 0 : 1));
    this.state = 'countdown';
    this.intro = true;
    this.timer = FLOW.COUNTDOWN;
    this.lastCount = FLOW.COUNTDOWN + 1;
    Game.enterMatch();
  },

  /* 次のサーブの準備：パックを1個、サーブする側の陣地に置く */
  resetPoint(server) {
    this.server = server;
    this.rally = 0;
    Physics.rally = 0;
    this.second = false;
    this.pendingSecond = false;
    this.hitStop = 0;
    this.stall = 0;
    const { W, L } = Table;
    for (const m of Physics.mallets) {
      const cpu = this.mode === 'cpu' && m.owner === 1;
      if (cpu || !m.active) {                        // CPU と、消えている（指を離している）マレットは定位置へ。指で持っているマレットはそのまま
        m.x = m.px = m.tx = W / 2;
        m.y = m.py = m.ty = m.owner === 0 ? L * 0.82 : L * 0.18;
      }
      m.vx = m.vy = m.ivx = m.ivy = 0;
    }
    Skills.resetPoint();
    Physics.pucks = this.mode === 'guest' ? [] : [Physics.newPuck(W / 2, server === 0 ? L * 0.64 : L * 0.36)];
    Stage.load(this.stageId);
    Table.buildWalls();
  },

  /* 画面に出すゲージ。相手が攻撃の技を構えている間は、満タンのまま見せる（構えたことを相手に知らせない） */
  shownGauge(o) {
    if (o !== this.me && Skills.state && Skills.state.armed[o]) return 1;
    return this.gauge[o];
  },

  /* マレットでパックを打ち返したとき（物理から呼ばれる） */
  onMalletHit(p, m, power, nx, ny) {
    if (p.lastHit !== m.owner) {                     // 両者の打ち返しだけをラリーに数える
      this.rally++;
      Physics.rally = this.rally;
      Events.emit('rally', this.rally);
      if (this.rally >= TUNE.SECOND_PUCK_RALLY && !this.second) this.pendingSecond = true;
    }
    p.lastHit = m.owner;
    Skills.onMalletHit(p, m);
    const before = this.gauge[m.owner];
    this.gauge[m.owner] = Math.min(1, before + TUNE.GAUGE_PER_HIT);
    if (before < 1 && this.gauge[m.owner] >= 1) Events.emit('full', m.owner);
    if (power > FX.HITSTOP_POWER) this.hitStop = Math.max(this.hitStop, Math.min(FX.HITSTOP_MAX, 0.012 * power));
    Events.emit('mhit', m.owner, power, p.x - nx * p.r, p.y - ny * p.r, nx, ny);
  },

  /* 必殺技ボタン。ゲージが満タンで、プレー中だけ発動する */
  pressSkill(owner) {
    if (this.state !== 'play' || this.gauge[owner] < 1 || !Skills.canActivate(owner)) return false;
    this.gauge[owner] = 0;
    Skills.activate(owner);
    return true;
  },

  /* 中央の近くで、柱・往復する壁・マレット・ほかのパックに重ならない場所（重なって出ると、はじかれて跳ぶため） */
  freeSpot(x, y) {
    const { W, L, pr } = Table;
    const clear = (cx, cy) => {
      for (const o of Stage.shapes) {
        if (o.off) continue;
        const margin = pr * 0.4 + Math.hypot(o.vx || 0, o.vy || 0) * 0.25;   // 動く壁は、少し先まで空けておく
        if (segDist(cx, cy, o.ax, o.ay, o.bx, o.by).d < pr + o.r + margin) return false;
      }
      for (const m of Physics.mallets) if (m.active && Math.hypot(cx - m.x, cy - m.y) < pr + m.r + pr * 0.4) return false;
      for (const q of Physics.pucks) if (!q.ghost && Math.hypot(cx - q.x, cy - q.y) < pr * 2.4) return false;
      return true;
    };
    for (const dy of [0, -0.07, 0.07, -0.13, 0.13]) for (const dx of [0, -0.14, 0.14, -0.26, 0.26, -0.36, 0.36]) {
      const cx = clamp(x + dx * W, pr * 1.2, W - pr * 1.2), cy = y + dy * L;
      if (clear(cx, cy)) return { x: cx, y: cy };
    }
    return { x, y };
  },

  /* ラリーが続いたら、中央から2個目のパックを出す */
  spawnSecond() {
    this.pendingSecond = false;
    this.second = true;
    const { W, L } = Table, dir = Math.random() < 0.5 ? -1 : 1;
    const at = this.freeSpot(W / 2 + rand(-0.12, 0.12) * W, L / 2);
    const p = Physics.newPuck(at.x, at.y, rand(-0.15, 0.15) * L, dir * 0.45 * L);
    p.born = 0.6;
    Physics.pucks.push(p);
    Events.emit('second', p.x, p.y);
  },

  onGoal(scorer, x) {
    this.score[scorer]++;
    this.lastGoal = { scorer, x: clamp(x, 0, Table.W), t: this.t };
    Physics.pucks = [];
    this.pendingSecond = false;
    this.server = 1 - scorer;                        // 失点した側からサーブ
    this.state = 'goal';
    this.timer = FLOW.GOAL_PAUSE;
    Events.emit('goal', scorer, this.lastGoal.x);
  },

  /* 1フレーム進める（CPU戦とホスト） */
  update(dt) {
    if (!this.active || this.paused) return;
    this.t += dt;
    Physics.rally = this.rally;
    Skills.update(dt);
    if (this.mode === 'cpu') CPU.update(dt);
    Physics.updateMallets(dt);
    Table.updateGoals(dt);                         // ゴール拡大の幅をなめらかに変える
    Table.buildWalls();
    switch (this.state) {
      case 'countdown': {
        this.timer -= dt;
        const n = Math.max(0, Math.ceil(this.timer));
        if (this.intro && n < this.lastCount) { this.lastCount = n; Events.emit('count', n); }
        if (this.timer <= 0) { this.state = 'play'; if (!this.intro) Events.emit('count', 0, 1); }   // 得点後のサーブ：音だけ
        Stage.update(dt);
        break;
      }
      case 'play': {
        if (Skills.freeze > 0 || this.hitStop > 0) {   // 必殺技の発動・強打で、パックが一瞬止まる
          this.hitStop = Math.max(0, this.hitStop - dt);
          Stage.update(dt * 0.15);
          break;
        }
        const scorer = Physics.step(dt);
        Stage.update(dt);
        if (scorer >= 0) {
          const sp = Physics.pucks.find(p => p.scored === scorer);
          this.onGoal(scorer, sp ? sp.x : Table.W / 2);
        } else {
          if (this.pendingSecond) this.spawnSecond();
          this.checkStall(dt);
        }
        break;
      }
      case 'goal':
        this.timer -= dt;
        Stage.update(dt);
        if (this.timer <= 0) {
          if (Math.max(this.score[0], this.score[1]) >= TUNE.WIN_SCORE) this.finish();
          else { this.resetPoint(this.server); this.state = 'countdown'; this.intro = false; this.timer = FLOW.SERVE_WAIT; }
        }
        break;
    }
  },

  /* パックがほとんど動かないまま時間がたったら、中央から出し直す（置きっぱなし対策） */
  checkStall(dt) {
    const real = Physics.pucks.filter(p => !p.ghost);
    const slow = real.length && real.every(p => Math.hypot(p.vx, p.vy) < 0.04 * Table.L);
    this.stall = slow ? this.stall + dt : 0;
    if (this.stall > PHYS.STALL_TIME) {
      this.stall = 0;
      const p = real[0];
      Skills.clearShot(p);                           // ミニ球・稲妻などの効果は残さない
      const others = Physics.pucks; Physics.pucks = Physics.pucks.filter(q => q !== p);   // 自分自身とは比べない
      const at = this.freeSpot(Table.W / 2, Table.L / 2);
      Physics.pucks = others;
      p.x = at.x; p.y = at.y;
      p.vx = rand(-0.1, 0.1) * Table.L; p.vy = (Math.random() < 0.5 ? -1 : 1) * 0.3 * Table.L;
      p.trail.length = 0;
      Events.emit('second', p.x, p.y);
    }
  },

  finish() {
    this.state = 'over';
    this.active = false;
    const winner = this.score[0] > this.score[1] ? 0 : 1;
    Events.emit('over', winner);
    if (this.mode === 'host') Net.onMatchOver();
    Game.exitMatch();
    UI.showResult(winner === this.me, this.score[this.me], this.score[1 - this.me]);
  },

  /* 試合をやめる（タイトルへ） */
  abort() {
    this.active = false;
    this.state = 'idle';
    Physics.pucks = [];
    Game.exitMatch();
  },
};
