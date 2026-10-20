'use strict';
/* =====================================================================
   1フレームの描画の順番
   台（下地）→ 床 → ゴール → 点数 → 壁 → 仕掛け → 防壁 → 残像・パック → マレット → 粒
   暗いステージでは、粒まで描いてから暗くし、明かりの中のパックとマレットを上に描く
   最後に画面に重ねる表示（ゲージ・数字・技のマーク・フラッシュ）
   ===================================================================== */
function drawWorld(t) {
  const d = Layout.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#04070f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(TableArt.base(), Fx.shakeX * d, Fx.shakeY * d);
  tableTransform();
  drawHeat(t);
  drawStageDecor(t);
  if (!Stage.dark) drawAmbient(t);
  drawStageFloor(t);
  drawGoals(t);
  if (!Stage.dark) drawScores();
  tableTransform();
  drawWalls(t);
  drawStageShapes(t);
  drawBarriers(t);
  const pucks = Physics.pucks;
  if (!Stage.dark) {
    for (const p of pucks) drawTrail(p);
    drawFxWorld();                                   // 火花や光はパックとマレットの下に描く（強打の光でパックが見えなくならないように）
    for (const p of pucks) drawPuck(p);
    for (const m of Physics.mallets) drawMallet(m, t);
  } else {
    drawFxWorld();
    drawDarkMask(t);
    drawScores();
    tableTransform();
    for (const p of pucks) drawTrail(p, 1, darkLightAt);
    for (const p of pucks) { const a = darkPuckAlpha(p); if (a > 0.01) drawPuck(p, a); }
    for (const m of Physics.mallets) drawMallet(m, t);
  }
}

function drawMatch(t) {
  drawWorld(t);
  drawGauges(t);
  drawTexts();
  drawRally(t);
  drawTouchHint(t);
  drawCountdown(t);
  drawGoalAnim(t);
  drawFlash();
}

/* =====================================================================
   タイトルなどの背景：本物の台の上を、パックがステージの仕掛けに当たりながら滑り続ける
   ===================================================================== */
const Attract = {
  stages: ['pillars', 'sweeper', 'spring', 'boost', 'warp', 'shutter', 'pulse'],
  idx: 0, timer: 0, on: false,

  start() {
    Layout.locked = false;
    Layout.setTableFromView();
    Table.setup(Layout.W);
    Match.me = 0;
    Match.rally = 0; Match.state = 'idle'; Match.gauge = [0, 0];
    Physics.rally = 4;
    Physics.mallets = [];
    Skills.reset();
    Fx.reset();
    this.idx = (Math.random() * this.stages.length) | 0;
    this.load();
    this.on = true;
  },
  load() {
    Stage.load(this.stages[this.idx]);
    Physics.pucks = [0, 1, 2].map(() => this.spawn());
    this.timer = 9;
  },
  spawn() {
    const { W, L } = Table, a = rand(0, TAU), s = rand(0.7, 1.3) * L;
    return Physics.newPuck(W * rand(0.3, 0.7), L * rand(0.3, 0.7), Math.cos(a) * s, Math.sin(a) * s);
  },
  update(dt) {
    if (!this.on) return;
    if (Table.W !== Layout.W) { Table.setup(Layout.W); this.load(); }
    this.timer -= dt;
    if (this.timer <= 0) { this.idx = (this.idx + 1) % this.stages.length; this.load(); }
    const sc = Physics.step(dt);
    Stage.update(dt);
    if (sc >= 0) {                                      // ゴールに入ったら、中央からまた出す
      Physics.pucks = Physics.pucks.filter(p => p.scored == null);
      const p = this.spawn(); p.x = Table.W / 2; p.y = Table.L / 2;
      Physics.pucks.push(p);
      Fx.ring(p.x, p.y, Table.pr, Table.pr * 5, 0.5, COLORS.ready, 0.012);
    }
    for (const p of Physics.pucks) {                    // ゆっくりになったら、軽く押し直す
      const s = Math.hypot(p.vx, p.vy);
      if (s < 0.6 * Table.L) { const k = 1 + dt * 0.8; p.vx *= k; p.vy *= k; if (s < 1) { p.vx = Table.L * 0.5; } }
    }
  },
  draw(t) {
    drawWorld(t);
    screenTransform(false);
    ctx.fillStyle = UI.screen === 'title' ? 'rgba(3,6,16,.3)' : 'rgba(3,6,16,.62)';   // メニューの文字が読みやすいよう、背景を暗く
    ctx.fillRect(0, 0, Layout.vw, Layout.vh);
  },
};
