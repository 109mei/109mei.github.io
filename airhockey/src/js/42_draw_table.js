'use strict';
/* =====================================================================
   台の描画
   動かない部分（背景・台の面・模様・線）は、画面の大きさやステージが変わったときだけ作り直して貼る（テーマは 42a_theme.js）
   ===================================================================== */
const TableArt = {
  cv: null, key: '',

  base() {
    const key = [Layout.vw, Layout.vh, Layout.dpr, Table.W.toFixed(2), Layout.flip, Layout.scale.toFixed(4), Layout.ox.toFixed(1), Layout.oy.toFixed(1), Stage.id, Match.me].join('|');
    if (this.cv && this.key === key) return this.cv;
    this.key = key;
    if (!this.cv) this.cv = document.createElement('canvas');
    const c = this.cv;
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    withCtx(g, () => {
      const th = theme();
      Layout.applyScreen(g);
      paintThemeBackground(g, th, Layout.vw, Layout.vh);              // 台の外（余白）
      Layout.applyTable(g);
      paintThemeSurface(g, th);                                        // 台の面
    });
    return c;
  },
};

/* ラリーで台が熱を帯びていく：中央線と円が光る */
function drawHeat(t) {
  const { W, L } = Table, h = Fx.heat;
  if (h < 0.02) return;
  const col = mix('#5b8cff', '#ffcf3f', h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(col, 0.25 + 0.45 * h);
  ctx.lineWidth = W * (0.006 + 0.01 * h);
  const pulse = 1 + 0.04 * Math.sin(t * (4 + 8 * h)) * h;
  ctx.beginPath(); ctx.moveTo(0, L / 2); ctx.lineTo(W, L / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, L / 2, W * 0.15 * pulse, 0, TAU); ctx.stroke();
  glowAt(W / 2, L / 2, W * 0.35 * h, col, 0.35 * h);
  ctx.restore();
}

/* ゴールの口：守る人の色で光る。台の外へにじむ */
function drawGoals(t) {
  const { W, L } = Table;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const o of [0, 1]) {
    const gh = Table.goalHalf[o], y = Table.goalY(o), dir = o === 0 ? 1 : -1, col = ownerColor(o);
    const g = Fx.goalAnim && Fx.goalAnim.scorer !== o && Fx.goalAnim.t < 1 ? 1 - Fx.goalAnim.t : 0;   // 入れられたゴールが光る
    const depth = Table.pr * 2.2;
    const lg = ctx.createLinearGradient(0, y, 0, y + dir * depth);
    lg.addColorStop(0, rgba(col, 0.45 + 0.5 * g)); lg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = lg;
    ctx.fillRect(W / 2 - gh, Math.min(y, y + dir * depth), gh * 2, depth);
    const lg2 = ctx.createLinearGradient(0, y, 0, y - dir * depth * 1.6);
    lg2.addColorStop(0, rgba(col, 0.22 + 0.4 * g)); lg2.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = lg2;
    ctx.fillRect(W / 2 - gh, Math.min(y, y - dir * depth * 1.6), gh * 2, depth * 1.6);
    ctx.strokeStyle = rgba(mix(col, '#ffffff', 0.4), 0.85);
    ctx.lineWidth = W * 0.008;
    ctx.beginPath(); ctx.moveTo(W / 2 - gh, y); ctx.lineTo(W / 2 + gh, y); ctx.stroke();
    if (Skills.state && Skills.state.wide[o] > 0) {              // ゴール拡大：妨害の色で両端が点滅
      const left = Skills.state.wide[o], a = left < 0.6 ? Math.abs(Math.sin(t * 22)) : 0.7 + 0.3 * Math.sin(t * 8);
      const dc = SKILL_TYPE.disrupt.color;
      for (const sx of [-1, 1]) glowAt(W / 2 + sx * gh, y, Table.pr * 1.8, dc, a);
      ctx.fillStyle = rgba(dc, 0.25 * a);
      ctx.fillRect(W / 2 - gh, Math.min(y, y + dir * depth), gh * 2, depth);
      ctx.fillStyle = rgba(dc, 0.18 * a);                                   // 台の内側にも、広がったゴールの幅を見せる
      ctx.fillRect(W / 2 - gh, Math.min(y, y - dir * depth * 0.8), gh * 2, depth * 0.8);
      ctx.strokeStyle = rgba(mix(dc, '#ffffff', 0.35), 0.9 * a); ctx.lineWidth = W * 0.012; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(W / 2 - gh, y); ctx.lineTo(W / 2 + gh, y); ctx.stroke();
      const cs = Table.pr * 0.55, cy = y - dir * Table.pr * 1.1, sh = (t * 2) % 1;   // 外へ向かって流れる「く」の字（広がっている印）
      ctx.lineWidth = W * 0.007; ctx.lineJoin = 'round';
      for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) {
        const k = (i + sh) / 2, cx = W / 2 + sx * (gh * 0.45 + gh * 0.4 * k);
        ctx.strokeStyle = rgba(mix(dc, '#ffffff', 0.4), a * Math.sin(Math.PI * k));
        ctx.beginPath(); ctx.moveTo(cx - sx * cs * 0.5, cy - cs * 0.7); ctx.lineTo(cx + sx * cs * 0.5, cy); ctx.lineTo(cx - sx * cs * 0.5, cy + cs * 0.7); ctx.stroke();
      }
    }
    if (Stage.id === 'pulse') {                                  // ゆらぐゴール：両端の印
      for (const sx of [-1, 1]) glowAt(W / 2 + sx * gh, y, Table.pr * 1.4, col, 0.6 + 0.3 * Math.sin(t * 6));
    }
  }
  ctx.restore();
}

/* 壁：細い光る線。台の形そのものが画面の縁になる */
function drawWalls(t) {
  const { W, L, D } = Table, wc = theme().wall;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const w of Table.walls) {
    if (w.kind === 'spring') { drawSpringWall(w, t); continue; }
    if (w.kind === 'warp') { drawPortalWall(w, t); continue; }
    ctx.strokeStyle = rgba(wc, 0.22);
    ctx.lineWidth = W * 0.022;
    ctx.beginPath(); ctx.moveTo(w.ax, w.ay); ctx.lineTo(w.bx, w.by); ctx.stroke();
    ctx.strokeStyle = rgba(wc, 0.9);
    ctx.lineWidth = W * 0.007;
    ctx.beginPath(); ctx.moveTo(w.ax, w.ay); ctx.lineTo(w.bx, w.by); ctx.stroke();
  }
  // ゴールポスト
  for (const o of [0, 1]) {
    const gh = Table.goalHalf[o], y = Table.goalY(o);
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#dfe8ff';
      circle(W / 2 + sx * gh, y, W * 0.011); ctx.fill();
    }
  }
  ctx.restore();
}

/* 点数：台の上に半透明で大きく。自分の点は下半分、相手の点は上半分。入った瞬間に弾む */
function drawScores() {
  if (Game.state !== 'match') return;
  const { W, L } = Table;
  screenTransform();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const o of [0, 1]) {
    const p = scr(W / 2, o === 0 ? L * 0.75 : L * 0.25);        // プレイヤー0の陣地は台の下半分（ゲストの画面では上に見える）
    const pop = Fx.scorePop[o], k = pop < 0.6 ? 1 + 0.6 * Math.sin(Math.PI * Math.min(1, pop / 0.6)) * (1 - pop / 0.6) * 1.5 : 1;
    const px = W * 0.42 * Layout.scale * k;
    const a = pop < 0.6 ? 0.55 - 0.35 * (pop / 0.6) : 0.2;
    ctx.globalAlpha = a;
    ctx.font = font(px, 900);
    ctx.fillStyle = ownerColor(o);
    ctx.fillText(String(Match.score[o]), p.x, p.y);
    ctx.globalAlpha = 1;
  }
}

/* 台の上をただよう、かすかな光の粒（空気が流れている感じ） */
function drawAmbient(t) {
  const { W, L } = Table;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const sx = (i * 0.618034) % 1, sy = (i * 0.414214 + 0.13) % 1, sp = 0.012 + (i % 5) * 0.004;
    const x = W * ((sx + Math.sin(t * 0.3 + i) * 0.03) % 1), y = L * ((sy + t * sp) % 1);
    const tw = 0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.17) + i * 2.1);
    glowAt(x, y, W * 0.018, i % 3 ? theme().ambient : '#ffffff', 0.16 * tw);
  }
  ctx.restore();
}
