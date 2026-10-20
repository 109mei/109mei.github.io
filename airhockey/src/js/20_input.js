'use strict';
/* =====================================================================
   操作（マルチタッチ）
   - 指ごとに識別する。必殺技ボタン（自分の側の三角形）の中で触り始めた指だけがボタン
   - それ以外の最初の指がマレット用。指を置くと、指の少し上にマレットが現れ（指で隠れない）、そこから指が動いた分だけ動く
   - マレット用の指を離したとき、ほかに触れている指があれば、その指がマレット用を引き継ぐ。指がなくなるとマレットは消える（パックは素通り）
   ===================================================================== */
const Input = {
  fingers: new Map(),       // pointerId → { role: 'mallet' | 'button' | 'idle', x, y }
  malletId: null,

  reset() {
    this.fingers.clear(); this.malletId = null;
    this.hide();
  },
  /* 自分のマレットを消す（指を離したとき） */
  hide() {
    const m = Physics.mallets[Match.me];
    if (m && Game.state === 'match') { m.active = false; m.vx = m.vy = m.ivx = m.ivy = 0; }
  },
  /* 指の少し上にマレットを出す（指でマレットが隠れないように） */
  show(sx, sy) {
    const m = Physics.mallets[Match.me];
    if (!m || !this.active()) return;
    const t = Layout.toTable(sx, sy - (Math.max(m.r, Skills.malletR(Match.me)) * Layout.scale + 34));   // 巨大化中は、大きくなった分だけ上に出す
    const c = Table.clampMallet(Match.me, t.x, t.y, m.r);
    m.x = m.px = m.tx = c.x; m.y = m.py = m.ty = c.y;
    m.vx = m.vy = m.ivx = m.ivy = 0;
    m.active = true;
  },

  active() { return Game.state === 'match' && Match.active && !Match.paused; },

  down(e) {
    if (Game.state !== 'match') return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 取れなくても動く */ }
    Sound.unlock();
    const id = e.pointerId, t = Layout.toTable(e.clientX, e.clientY);
    if (Table.inButton(Match.me, t.x, t.y)) {
      this.fingers.set(id, { role: 'button', x: e.clientX, y: e.clientY });
      this.pressButton(t.x);
      return;
    }
    const role = this.malletId == null ? 'mallet' : 'idle';
    if (role === 'mallet') { this.malletId = id; this.show(e.clientX, e.clientY); }
    this.fingers.set(id, { role, x: e.clientX, y: e.clientY });
  },

  move(e) {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    if (e.cancelable) e.preventDefault();
    const dx = e.clientX - f.x, dy = e.clientY - f.y;
    f.x = e.clientX; f.y = e.clientY;
    if (f.role !== 'mallet' || !this.active()) return;
    const m = Physics.mallets[Match.me];
    if (!m) return;
    if (!m.active) { this.show(e.clientX, e.clientY); return; }   // 一時停止明けなどで消えていたら、指の上に出す
    const d = Layout.deltaToTable(dx, dy);
    if (m.mirror) d.x = -d.x;                                     // 反転：左右の操作が逆になる
    const c = Table.clampMallet(Match.me, m.tx + d.x, m.ty + d.y, m.r);
    m.tx = c.x; m.ty = c.y;
  },

  up(e) {
    const id = e.pointerId;
    if (!this.fingers.has(id)) return;
    this.fingers.delete(id);
    if (id === this.malletId) {
      this.malletId = null;
      for (const [k, g] of this.fingers) if (g.role === 'idle') { g.role = 'mallet'; this.malletId = k; break; }   // 残っている指が引き継ぐ（マレットはそのまま）
      if (this.malletId == null) this.hide();                                                                   // 指がなくなったら消える
    }
  },

  /* 必殺技ボタン */
  pressButton(x) {
    if (!this.active()) return;
    const side = x < Table.W / 2 ? 0 : 1;
    if (Match.mode === 'guest') {
      if (Match.gauge[Match.me] >= 1 && Match.state === 'play' && Skills.canActivate(Match.me)) Net.sendPress();
      else Fx.denied(side);
      return;
    }
    if (!Match.pressSkill(Match.me)) Fx.denied(side);
  },

  init() {
    canvas.addEventListener('pointerdown', e => this.down(e), { passive: false });
    window.addEventListener('pointermove', e => this.move(e), { passive: false });
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', e => this.up(e));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
  },
};
