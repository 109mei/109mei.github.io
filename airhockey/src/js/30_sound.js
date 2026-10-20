'use strict';
/* =====================================================================
   効果音（すべて Web Audio API で合成する。音声ファイルは使わない）
   - ブラウザの自動再生制限があるので、最初のタップで音を有効にする
   - iPhone のマナーモードでも鳴るよう、対応環境では navigator.audioSession.type = "playback"
   - 当たった位置に合わせて左右に振る。暗いステージでは左右の振りを大きくし、自分のマレットに近いほど大きくする
   ===================================================================== */
const Sound = {
  ac: null, master: null, bus: null, noiseBuf: null,
  unlocked: false,
  on: store.get('sound', true),

  init() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 未対応 */ }
    const u = () => this.unlock();
    window.addEventListener('pointerdown', u, true);
    window.addEventListener('touchend', u, true);
    window.addEventListener('keydown', u, true);
    Events.on((type, a) => { try { this.event(type, a); } catch (e) { /* 音で止めない */ } });
  },

  unlock() {
    try {
      if (!this.ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ac = new AC({ latencyHint: 'interactive' });
        const comp = this.ac.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 5;
        comp.attack.value = 0.003; comp.release.value = 0.2;
        this.master = this.ac.createGain();
        this.master.gain.value = this.on ? 0.9 : 0;
        this.master.connect(comp); comp.connect(this.ac.destination);
        this.bus = this.master;
        const len = this.ac.sampleRate * 2, buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
      }
      if (this.ac.state !== 'running') { const r = this.ac.resume(); if (r && r.catch) r.catch(() => {}); }   // suspended・interrupted（iOS）から戻す
      if (!this.unlocked) {                              // 無音を1回鳴らして、iOS で音を出せる状態にする
        const b = this.ac.createBuffer(1, 1, 22050), s = this.ac.createBufferSource();
        s.buffer = b; s.connect(this.ac.destination); s.start(0);
        this.unlocked = true;
      }
    } catch (e) { /* 音が出せない環境でも遊べる */ }
  },

  setOn(v) {
    this.on = v; store.set('sound', v);
    if (this.master) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ac.currentTime, 0.02);
  },
  ready() { return this.ac && this.ac.state === 'running' && this.on; },

  /* 出口：音量 → 左右 → 全体 */
  out(vol, pan, t) {
    const g = this.ac.createGain();
    g.gain.value = vol;
    if (this.ac.createStereoPanner) {
      const p = this.ac.createStereoPanner();
      p.pan.setValueAtTime(clamp(pan || 0, -1, 1), t || this.ac.currentTime);
      g.connect(p); p.connect(this.bus);
      g.panner = p;
    } else g.connect(this.bus);
    return g;
  },
  /* 音の高さが変わる単音 */
  tone(o) {
    const ac = this.ac, t = ac.currentTime + (o.delay || 0), dur = o.dur || 0.1;
    const osc = ac.createOscillator(), env = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + dur * (o.glide || 1));
    if (o.detune) osc.detune.value = o.detune;
    const a = o.attack || 0.004;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + a);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = env;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; env.connect(f); node = f; }
    osc.connect(env);
    node.connect(this.out(o.vol, o.pan, t));
    if (o.lfo) {                                        // 音のゆれ（バネ・妨害の音）
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = o.lfo[0]; lg.gain.value = o.lfo[1];
      l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    osc.start(t); osc.stop(t + dur + 0.05);
  },
  /* ノイズ（こすれ・破裂・風） */
  noise(o) {
    const ac = this.ac, t = ac.currentTime + (o.delay || 0), dur = o.dur || 0.1;
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), env = ac.createGain();
    src.buffer = this.noiseBuf;
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = o.Q || 1;
    const a = o.attack || 0.002;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + a);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(env);
    const out = this.out(o.vol, o.pan, t);
    if (o.pan2 != null && out.panner) out.panner.pan.linearRampToValueAtTime(clamp(o.pan2, -1, 1), t + dur);
    env.connect(out);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  },
  chord(notes, o) { notes.forEach((f, i) => this.tone(Object.assign({}, o, { f0: f, delay: (o.delay || 0) + i * (o.step || 0) }))); },

  /* 位置から、左右の振りと距離の音量を決める */
  place(x, y) {
    const W = Table.W || 1, L = Table.L, dark = Stage.dark && Game.state === 'match';
    let pan = (x / W) * 2 - 1;
    if (Layout.flip) pan = -pan;
    pan *= dark ? 0.95 : 0.4;
    let vol = 1;
    const m = Physics.mallets[Match.me];
    if (m && y != null) {
      const d = Math.hypot(x - m.x, y - m.y) / L;
      vol = dark ? 0.12 + 0.88 * Math.exp(-d * 3.2) : 0.7 + 0.3 * Math.exp(-d * 2);
    }
    return { pan, vol };
  },

  event(type, a) {
    if (!this.ready() || Game.state !== 'match') return;
    switch (type) {
      case 'mhit': return this.malletHit(a[0], a[1], a[2], a[3]);
      case 'mtouch': { const q = this.place(a[2], a[3]); return this.noise({ f0: 900, filter: 'lowpass', dur: 0.04, vol: 0.12 * q.vol, pan: q.pan }); }
      case 'hit': return this.objectHit(a[0], a[1], a[2], a[3]);
      case 'warp': return this.warp(a[0], a[1], a[2]);
      case 'pop': { const q = this.place(a[0], a[1]);
        this.tone({ f0: 420, f1: 1500, dur: 0.09, vol: 0.28 * q.vol, pan: q.pan });
        return this.noise({ f0: 3000, dur: 0.05, vol: 0.12 * q.vol, pan: q.pan, Q: 2 }); }
      case 'goal': return this.goal(a[0], a[1]);
      case 'skill': return;                                   // 発動の瞬間は鳴らさない（いきなり使われるのが面白い）
      case 'shockwave': { const q = this.place(a[1], a[2]);
        this.tone({ f0: 120, f1: 45, dur: 0.35, vol: 0.4 * q.vol, pan: q.pan });
        return this.noise({ f0: 600, f1: 3000, dur: 0.3, vol: 0.3 * q.vol, pan: q.pan, Q: 2 }); }
      case 'shot': return this.shot(a[0], a[1], a[2], a[3]);
      case 'second':
        this.tone({ f0: 880, dur: 0.12, vol: 0.18, type: 'square', lp: 2500 });
        this.tone({ f0: 660, dur: 0.12, vol: 0.18, type: 'square', lp: 2500, delay: 0.14 });
        this.tone({ f0: 880, dur: 0.12, vol: 0.18, type: 'square', lp: 2500, delay: 0.28 });
        return this.tone({ f0: 1400, f1: 200, dur: 0.5, vol: 0.2, delay: 0.42 });
      case 'rally':
        if (a[0] > 0 && a[0] % 5 === 0) this.chord([1568, 2093, 2637], { dur: 0.18, vol: 0.09, step: 0.05, type: 'triangle' });
        return;
      case 'full':
        if (a[0] === Match.me) return this.chord([1319, 1661, 1976, 2637], { dur: 0.25, vol: 0.12, step: 0.06, type: 'triangle' });
        return this.chord([988, 784], { dur: 0.22, vol: 0.1, step: 0.09, type: 'triangle' });
      case 'count':
        if (a[0] > 0) return this.tone({ f0: 660, dur: 0.14, vol: 0.2, type: 'triangle' });
        if (a[1]) return this.tone({ f0: 990, dur: 0.18, vol: 0.14, type: 'triangle' });   // 得点後のサーブ：短い合図
        this.tone({ f0: 1320, dur: 0.35, vol: 0.2, type: 'triangle' });
        return this.noise({ f0: 2000, f1: 6000, dur: 0.25, vol: 0.08 });
      case 'over': return this.fanfare(a[0] === Match.me);
    }
  },

  malletHit(owner, power, x, y) {
    const k = clamp(power / 3, 0, 1), q = this.place(x, y), v = q.vol;
    const base = owner === Match.me ? 1 : 0.92;
    this.tone({ f0: (170 + 140 * k) * base, f1: 60, dur: 0.13 + 0.05 * k, vol: (0.32 + 0.4 * k) * v, pan: q.pan });
    this.noise({ f0: 1800 + 2600 * k, dur: 0.045, vol: (0.2 + 0.35 * k) * v, pan: q.pan, Q: 1.3 });
    if (k > 0.55) {                                     // 強打：破裂音と低い響き
      this.noise({ f0: 5000, filter: 'highpass', dur: 0.09, vol: 0.22 * k * v, pan: q.pan });
      this.tone({ f0: 90, f1: 40, dur: 0.3, vol: 0.35 * k * v, pan: q.pan });
    }
  },

  objectHit(kind, power, x, y) {
    const k = clamp(power / 2.5, 0.08, 1), q = this.place(x, y), v = q.vol * k, pan = q.pan;
    switch (kind) {
      case 'wall':                                     // 木をたたくような短い音
        this.tone({ f0: 330, f1: 210, dur: 0.07, vol: 0.32 * v, pan });
        this.noise({ f0: 1500, dur: 0.04, vol: 0.22 * v, pan, Q: 2 });
        break;
      case 'pillar':                                   // 金属の柱：キンと響く
        [[880, 0.45, 0.2], [2430, 0.3, 0.1], [4750, 0.16, 0.06]].forEach(([f, d, a]) => this.tone({ f0: f, dur: d, vol: a * 1.6 * v, pan }));
        break;
      case 'bumper':                                   // バンパー：ボヨン
        this.tone({ f0: 260, f1: 760, dur: 0.18, vol: 0.38 * v, pan, glide: 0.6 });
        this.tone({ f0: 520, f1: 1100, dur: 0.12, vol: 0.12 * v, pan, type: 'triangle' });
        break;
      case 'spring':                                   // バネ：ビヨーン
        this.tone({ f0: 620, f1: 240, dur: 0.38, vol: 0.32 * v, pan, lfo: [26, 90], type: 'triangle' });
        break;
      case 'sweeper':                                  // 動く壁：重いドン
        this.tone({ f0: 150, f1: 80, dur: 0.14, vol: 0.45 * v, pan });
        this.noise({ f0: 700, filter: 'lowpass', dur: 0.08, vol: 0.25 * v, pan });
        break;
      case 'shutter':                                  // シャッター：ガシャン
        this.tone({ f0: 240, dur: 0.07, vol: 0.18 * v, pan, type: 'square', lp: 1800 });
        this.noise({ f0: 3200, dur: 0.12, vol: 0.3 * v, pan, Q: 3 });
        this.tone({ f0: 1900, dur: 0.15, vol: 0.08 * v, pan });
        break;
      case 'barrier':                                  // 防壁：ビッと弾く
        this.tone({ f0: 1100, f1: 300, dur: 0.16, vol: 0.2 * v, pan, type: 'sawtooth', lp: 3000 });
        this.noise({ f0: 6000, filter: 'highpass', dur: 0.08, vol: 0.15 * v, pan });
        break;
      case 'puck':                                     // パック同士：カチッ
        this.tone({ f0: 1900, dur: 0.035, vol: 0.2 * v, pan });
        this.noise({ f0: 5200, dur: 0.03, vol: 0.18 * v, pan, Q: 2 });
        break;
      default:
        this.noise({ f0: 1200, dur: 0.05, vol: 0.2 * v, pan });
    }
  },

  warp(x1, y, x2) {
    const a = this.place(x1, y), b = this.place(x2, y);
    this.noise({ f0: 350, f1: 3200, dur: 0.32, vol: 0.3 * a.vol, pan: a.pan, pan2: b.pan, Q: 3 });
    this.tone({ f0: 260, f1: 1300, dur: 0.28, vol: 0.12 * a.vol, pan: b.pan, type: 'triangle' });
  },

  goal(scorer, x) {
    const mine = scorer === Match.me;
    this.noise({ f0: 2400, f1: 160, filter: 'lowpass', dur: 0.9, vol: 0.55, attack: 0.005 });
    this.tone({ f0: 110, f1: 38, dur: 0.6, vol: 0.5 });
    if (mine) this.chord([523, 659, 784, 1047], { dur: 0.45, vol: 0.13, step: 0.08, type: 'triangle', delay: 0.1 });
    else this.chord([392, 311, 262], { dur: 0.42, vol: 0.12, step: 0.12, type: 'triangle', delay: 0.12 });
  },

  shot(owner, id, x, y) {
    const q = this.place(x, y);
    if (id === 'fast') {
      this.tone({ f0: 80, f1: 35, dur: 0.4, vol: 0.5 * q.vol, pan: q.pan });
      this.noise({ f0: 3500, f1: 500, filter: 'lowpass', dur: 0.6, vol: 0.35 * q.vol, pan: q.pan });
    } else if (id === 'curve') {
      this.noise({ f0: 900, f1: 4200, dur: 0.35, vol: 0.28 * q.vol, pan: q.pan, Q: 5 });
    } else if (id === 'split') {
      [1500, 1620, 1760].forEach((f, i) => this.tone({ f0: f, dur: 0.35, vol: 0.09 * q.vol, pan: q.pan, delay: i * 0.03, type: 'triangle' }));
    } else if (id === 'zigzag') {                     // 稲妻：バチッ
      this.noise({ f0: 4000, filter: 'highpass', dur: 0.12, vol: 0.3 * q.vol, pan: q.pan });
      this.tone({ f0: 900, f1: 300, dur: 0.12, vol: 0.12 * q.vol, pan: q.pan, type: 'sawtooth', lp: 4000, lfo: [60, 300] });
    } else if (id === 'mini') {                       // ミニ球：シュッと縮む
      this.tone({ f0: 1400, f1: 2600, dur: 0.12, vol: 0.12 * q.vol, pan: q.pan, type: 'triangle' });
    } else if (id === 'vanish') {
      this.tone({ f0: 1300, f1: 380, dur: 0.55, vol: 0.14 * q.vol, pan: q.pan, attack: 0.08, type: 'triangle' });
    }
  },

  fanfare(win) {
    if (win) {
      this.chord([523, 659, 784], { dur: 0.22, vol: 0.14, step: 0.12, type: 'triangle' });
      this.chord([1047, 1319, 1568], { dur: 0.9, vol: 0.1, step: 0, type: 'triangle', delay: 0.4 });
    } else {
      this.chord([440, 415, 392, 330], { dur: 0.4, vol: 0.12, step: 0.2, type: 'triangle' });
    }
  },
  appear() { if (this.ready() && Game.state === 'match') this.tone({ f0: 520, f1: 900, dur: 0.07, vol: 0.08, type: 'triangle' }); },
  ui() { if (this.ready()) this.tone({ f0: 1250, f1: 900, dur: 0.05, vol: 0.1, type: 'triangle' }); },
  denied() { if (this.ready()) this.tone({ f0: 150, dur: 0.09, vol: 0.12, type: 'square', lp: 800 }); },
};
