'use strict';
/* =====================================================================
   必殺技のマーク（文字の代わりに使う記号）
   ゲージの三角形・発動の演出・試合前の紹介・選択画面で、同じマークを使う
     剛速球＝炎の尾を引くパック／カーブ＝曲がる矢印／分身＝3つに分かれる玉／消える球＝点線で消えかけた玉
     稲妻＝稲妻／ミニ球＝内向きの矢印と小さな玉／防壁＝盾／巨大化＝外向きの矢印／衝撃波＝広がる波
     重い腕＝重り／ゴール拡大＝広がるゴール／反転＝入れ替わる矢印
   c：描画先、(x,y)：中心、s：大きさ（直径の目安）、col：色
   ===================================================================== */
function drawSkillMark(c, id, x, y, s, col, opt = {}) {
  const lw = Math.max(1.2, s * 0.085), dark = 'rgba(4,8,24,.55)';
  c.save();
  c.translate(x, y);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const disk = (cx, cy, r, fill = col) => { c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fillStyle = fill; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = dark; c.stroke(); };
  if (opt.glow) {                                              // 満タンなどで光らせる
    const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 0.75);
    g.addColorStop(0, rgba(col, 0.55 * opt.glow)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, s * 0.75, 0, TAU); c.fill();
  }
  switch (id) {
    case 'fast': {                                             // 炎の尾を引くパック
      const r = s * 0.2, px = s * 0.2;
      c.beginPath();
      c.moveTo(-s * 0.5, -s * 0.02);
      c.quadraticCurveTo(-s * 0.1, -r * 1.25, px, -r);
      c.arc(px, 0, r, -Math.PI / 2, Math.PI / 2);
      c.quadraticCurveTo(-s * 0.1, r * 1.25, -s * 0.5, s * 0.02);
      c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = dark; c.stroke();
      c.strokeStyle = rgba('#ffffff', 0.85); c.lineWidth = lw * 0.7;
      c.beginPath(); c.moveTo(-s * 0.42, -s * 0.3); c.lineTo(-s * 0.12, -s * 0.3); c.moveTo(-s * 0.36, s * 0.3); c.lineTo(-s * 0.08, s * 0.3); c.stroke();
      disk(px, 0, r * 0.62, col === '#fffdf2' ? '#ffd23f' : '#ffffff');
      break;
    }
    case 'curve': {                                            // 曲がる矢印
      c.strokeStyle = col; c.lineWidth = lw * 1.5;
      c.beginPath(); c.moveTo(-s * 0.3, s * 0.38); c.quadraticCurveTo(s * 0.55, s * 0.2, s * 0.05, -s * 0.3); c.stroke();
      c.fillStyle = col;
      c.save(); c.translate(s * 0.05, -s * 0.3); c.rotate(-2.3);
      c.beginPath(); c.moveTo(s * 0.2, 0); c.lineTo(-s * 0.06, -s * 0.15); c.lineTo(-s * 0.06, s * 0.15); c.closePath(); c.fill();
      c.restore();
      disk(-s * 0.3, s * 0.38, s * 0.12, '#ffffff');
      break;
    }
    case 'split': {                                            // 3つに分かれる玉（本物は1つ）
      c.strokeStyle = rgba(col, 0.8); c.lineWidth = lw * 0.6;
      c.beginPath();
      for (const a of [-0.55, 0, 0.55]) { c.moveTo(0, s * 0.4); c.lineTo(Math.sin(a) * s * 0.5, s * 0.4 - Math.cos(a) * s * 0.62); }
      c.stroke();
      for (const a of [-0.55, 0.55]) {                       // 左右は半透明の偽物
        const cx = Math.sin(a) * s * 0.5, cy = s * 0.4 - Math.cos(a) * s * 0.62;
        c.beginPath(); c.arc(cx, cy, s * 0.15, 0, TAU); c.fillStyle = rgba(col, 0.4); c.fill();
        c.strokeStyle = col; c.lineWidth = lw * 0.7; c.stroke();
      }
      disk(0, s * 0.4 - s * 0.62, s * 0.17, col);
      break;
    }
    case 'vanish': {                                           // 点線になって消えかけた玉
      c.beginPath(); c.arc(-s * 0.08, 0, s * 0.3, Math.PI * 0.5, Math.PI * 1.5); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = dark; c.stroke();
      c.setLineDash([lw * 0.9, lw * 1.1]); c.strokeStyle = col; c.lineWidth = lw;
      c.beginPath(); c.arc(-s * 0.08, 0, s * 0.3, -Math.PI * 0.5, Math.PI * 0.5); c.stroke(); c.setLineDash([]);
      c.fillStyle = col;
      for (const [dx, dy, r] of [[0.36, -0.14, 0.05], [0.44, 0.08, 0.04], [0.33, 0.22, 0.03]]) { c.beginPath(); c.arc(dx * s, dy * s, r * s, 0, TAU); c.fill(); }
      break;
    }
    case 'wall': {                                             // 盾
      const w = s * 0.42, h = s * 0.5;
      c.beginPath();
      c.moveTo(0, -h); c.quadraticCurveTo(w * 0.6, -h * 0.75, w, -h * 0.8);
      c.lineTo(w, -h * 0.05); c.quadraticCurveTo(w * 0.9, h * 0.6, 0, h);
      c.quadraticCurveTo(-w * 0.9, h * 0.6, -w, -h * 0.05); c.lineTo(-w, -h * 0.8);
      c.quadraticCurveTo(-w * 0.6, -h * 0.75, 0, -h); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = dark; c.stroke();
      c.fillStyle = 'rgba(4,8,24,.45)';                       // 横に伸びる壁（白で描いたときも見えるよう濃い色）
      c.fillRect(-w * 0.62, -h * 0.2, w * 1.24, h * 0.3);
      break;
    }
    case 'zigzag': {                                           // 稲妻
      c.beginPath();
      c.moveTo(s * 0.12, -s * 0.5); c.lineTo(-s * 0.26, s * 0.06); c.lineTo(-s * 0.02, s * 0.06);
      c.lineTo(-s * 0.14, s * 0.5); c.lineTo(s * 0.28, -s * 0.08); c.lineTo(s * 0.04, -s * 0.08); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = dark; c.stroke();
      break;
    }
    case 'mini': {                                             // 小さくなる玉（内向きの矢印）
      c.strokeStyle = rgba(col, 0.55); c.lineWidth = lw * 0.6; c.setLineDash([lw, lw * 0.9]);
      c.beginPath(); c.arc(0, 0, s * 0.42, 0, TAU); c.stroke(); c.setLineDash([]);
      c.strokeStyle = col; c.lineWidth = lw;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, ox = Math.cos(a), oy = Math.sin(a);
        c.beginPath(); c.moveTo(ox * s * 0.4, oy * s * 0.4); c.lineTo(ox * s * 0.22, oy * s * 0.22);
        c.moveTo(ox * s * 0.22 + oy * s * 0.07, oy * s * 0.22 - ox * s * 0.07); c.lineTo(ox * s * 0.22, oy * s * 0.22); c.lineTo(ox * s * 0.22 - oy * s * 0.07, oy * s * 0.22 + ox * s * 0.07);
        c.stroke();
      }
      disk(0, 0, s * 0.13, '#ffffff');
      break;
    }
    case 'giant': {                                            // 大きくなるマレット（外向きの矢印）
      disk(0, 0, s * 0.24, col);
      disk(0, 0, s * 0.1, '#ffffff');
      c.strokeStyle = col; c.lineWidth = lw;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, ox = Math.cos(a), oy = Math.sin(a), e = s * 0.48;
        c.beginPath(); c.moveTo(ox * s * 0.31, oy * s * 0.31); c.lineTo(ox * e, oy * e);
        c.moveTo(ox * e - ox * s * 0.1 + oy * s * 0.07, oy * e - oy * s * 0.1 - ox * s * 0.07); c.lineTo(ox * e, oy * e); c.lineTo(ox * e - ox * s * 0.1 - oy * s * 0.07, oy * e - oy * s * 0.1 + ox * s * 0.07);
        c.stroke();
      }
      break;
    }
    case 'shock': {                                            // 衝撃波（はじける輪と光の筋）
      c.strokeStyle = col; c.lineWidth = lw * 1.3;
      c.beginPath(); c.arc(0, 0, s * 0.22, 0, TAU); c.stroke();
      c.lineWidth = lw * 0.9;
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + Math.PI / 8, r0 = s * 0.32, r1 = s * (i % 2 ? 0.44 : 0.5);
        c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke();
      }
      disk(0, 0, s * 0.1, col);
      break;
    }
    case 'widegoal': {                                         // 広がるゴール（枠と外向きの矢印）
      c.strokeStyle = col; c.lineWidth = lw * 1.3;
      c.beginPath(); c.moveTo(-s * 0.2, -s * 0.05); c.lineTo(-s * 0.2, s * 0.3); c.lineTo(s * 0.2, s * 0.3); c.lineTo(s * 0.2, -s * 0.05); c.stroke();
      c.fillStyle = rgba(col, 0.35); c.fillRect(-s * 0.2, s * 0.02, s * 0.4, s * 0.28);
      c.lineWidth = lw;
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(d * s * 0.08, -s * 0.28); c.lineTo(d * s * 0.46, -s * 0.28);
        c.moveTo(d * s * 0.36, -s * 0.38); c.lineTo(d * s * 0.46, -s * 0.28); c.lineTo(d * s * 0.36, -s * 0.18); c.stroke();
      }
      break;
    }
    case 'mirror': {                                           // 左右が入れ替わる矢印
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw * 1.2;
      const arrow = (y, d) => {
        c.beginPath(); c.moveTo(-d * s * 0.36, y); c.lineTo(d * s * 0.22, y); c.stroke();
        c.beginPath(); c.moveTo(d * s * 0.42, y); c.lineTo(d * s * 0.18, y - s * 0.13); c.lineTo(d * s * 0.18, y + s * 0.13); c.closePath(); c.fill();
      };
      arrow(-s * 0.16, 1); arrow(s * 0.16, -1);
      break;
    }
    case 'heavy': {                                            // 重り
      c.strokeStyle = col; c.lineWidth = lw * 1.3;
      c.beginPath(); c.arc(0, -s * 0.22, s * 0.16, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      c.beginPath();
      c.moveTo(-s * 0.24, -s * 0.18); c.lineTo(s * 0.24, -s * 0.18); c.lineTo(s * 0.4, s * 0.4); c.lineTo(-s * 0.4, s * 0.4); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = dark; c.stroke();
      c.fillStyle = 'rgba(4,8,24,.4)';
      c.beginPath(); c.moveTo(-s * 0.14, s * 0.06); c.lineTo(s * 0.14, s * 0.06); c.lineTo(s * 0.18, s * 0.2); c.lineTo(-s * 0.18, s * 0.2); c.closePath(); c.fill();
      break;
    }
  }
  c.restore();
}
