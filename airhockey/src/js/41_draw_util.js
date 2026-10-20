'use strict';
/* =====================================================================
   描画の道具：光の玉・影の玉を前もって作っておき、拡大して貼る（毎回グラデーションを作らず軽くする）
   ===================================================================== */
const Sprites = {
  cache: new Map(),
  make(key, size, paint) {
    let c = this.cache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = size;
      paint(c.getContext('2d'), size);
      this.cache.set(key, c);
    }
    return c;
  },
  /* 中心が明るく、外へ消えていく光 */
  glow(color) {
    return this.make('g' + color, 96, (g, s) => {
      const c = rgb(color), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(0.18, `rgba(${c},.75)`);
      gr.addColorStop(0.45, `rgba(${c},.22)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  },
  /* やわらかい影 */
  shadow() {
    return this.make('shadow', 96, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(0,0,8,.62)'); gr.addColorStop(0.55, 'rgba(0,0,8,.38)'); gr.addColorStop(1, 'rgba(0,0,8,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  },
};

/* 光の玉を貼る（加算で重ねると明るくなる） */
function glowAt(x, y, r, color, alpha = 1) {
  if (alpha <= 0.003 || r <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(Sprites.glow(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/* 光の向き：画面の左上から照らす。台を180°回したゲストでも、画面上で同じ向きになるようにする */
const lightSign = () => (Layout.flip ? -1 : 1);

/* 台から浮いて見える影（高さ h：大きいほど影が離れる） */
function shadowAt(x, y, r, h = 0.3, alpha = 1) {
  const s = lightSign(), off = r * h;
  ctx.globalAlpha = alpha;
  ctx.drawImage(Sprites.shadow(), x + s * off * 0.6 - r * 1.25, y + s * off - r * 1.25, r * 2.5, r * 2.5);
  ctx.globalAlpha = 1;
}

function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }

/* 台の外形（八角形）のパス */
function tablePath(c = ctx) {
  const { W, L, D } = Table;
  c.beginPath();
  c.moveTo(D, 0); c.lineTo(W - D, 0); c.lineTo(W, D); c.lineTo(W, L - D);
  c.lineTo(W - D, L); c.lineTo(D, L); c.lineTo(0, L - D); c.lineTo(0, D); c.closePath();
}

/* 台の座標の点を画面の座標へ（揺れも足す） */
function scr(x, y) {
  const p = Layout.toScreen(x, y);
  p.x += Fx.shakeX; p.y += Fx.shakeY;
  return p;
}
/* 台の座標で描く準備（揺れも反映） */
function tableTransform() {
  Layout.applyTable(ctx);
  const d = Layout.dpr, m = ctx.getTransform();
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e + Fx.shakeX * d, m.f + Fx.shakeY * d);
}
function screenTransform(withShake = true) {
  const d = Layout.dpr;
  ctx.setTransform(d, 0, 0, d, withShake ? Fx.shakeX * d : 0, withShake ? Fx.shakeY * d : 0);
}

const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",Meiryo,system-ui,sans-serif';
function font(px, weight = 800) { return `${weight} ${Math.max(1, px).toFixed(1)}px ${FONT}`; }

/* 縁取りつきの文字 */
function outlinedText(s, x, y, px, fill, stroke = 'rgba(4,8,24,.85)', lw = 0.16) {
  ctx.font = font(px);
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

function ownerColor(o) { return o === Match.me ? COLORS.me : COLORS.opp; }
