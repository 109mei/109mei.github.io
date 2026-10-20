'use strict';
/* =====================================================================
   暗いステージの滑走音
   パックごとに、こすれる音（ノイズ）と、かすかな音程（三角波）を鳴らし続ける
   - パックの横の位置で左右に振る（左にあれば左から）
   - 自分のマレットに近いほど大きく、速いほど高く
   ===================================================================== */
const Slide = {
  ch: new Map(),            // パックのID → 音のつながり

  make() {
    const ac = Sound.ac;
    const src = ac.createBufferSource();
    src.buffer = Sound.noiseBuf; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.value = 600;
    const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 200;
    const og = ac.createGain(); og.gain.value = 0.22;
    const gain = ac.createGain(); gain.gain.value = 0;
    src.connect(bp); bp.connect(gain);
    osc.connect(og); og.connect(gain);
    let pan = null;
    if (ac.createStereoPanner) { pan = ac.createStereoPanner(); gain.connect(pan); pan.connect(Sound.bus); }
    else gain.connect(Sound.bus);
    src.start(0, Math.random() * 1.5); osc.start();
    return { src, bp, osc, gain, pan, gone: 0 };
  },
  kill(id, c) {
    try { c.src.stop(); c.osc.stop(); c.gain.disconnect(); } catch (e) { /* もう止まっている */ }
    this.ch.delete(id);
  },

  update(dt) {
    if (!Sound.ac || !Sound.noiseBuf) return;
    const t = Sound.ac.currentTime, L = Table.L;
    const on = Sound.ready() && Game.state === 'match' && Stage.dark && Match.active && !Match.paused &&
               (Match.state === 'play' || Match.state === 'countdown');
    const seen = new Set();
    if (on) {
      for (const p of Physics.pucks) {
        let c = this.ch.get(p.id);
        if (!c) { if (this.ch.size >= 5) continue; c = this.make(); this.ch.set(p.id, c); }
        seen.add(p.id);
        c.gone = 0;
        const s = Math.hypot(p.vx, p.vy) / L;
        const q = Sound.place(p.x, p.y);
        const moving = clamp((s - 0.02) / 0.25, 0, 1);
        const vol = 0.2 * q.vol * moving * (0.45 + 0.55 * clamp(s / 2.5, 0, 1));
        c.gain.gain.setTargetAtTime(vol, t, 0.03);
        c.tf = 420 + 1900 * clamp(s / 3, 0, 1);                 // こすれる音の高さ（速いほど高い）
        c.bp.frequency.setTargetAtTime(c.tf, t, 0.04);
        c.osc.frequency.setTargetAtTime(160 + 340 * clamp(s / 3, 0, 1), t, 0.04);
        if (c.pan) c.pan.pan.setTargetAtTime(q.pan, t, 0.03);
      }
    }
    for (const [id, c] of this.ch) {
      if (seen.has(id)) continue;
      c.gain.gain.setTargetAtTime(0, t, 0.03);
      c.gone += dt;
      if (c.gone > 0.4) this.kill(id, c);
    }
  },
};
