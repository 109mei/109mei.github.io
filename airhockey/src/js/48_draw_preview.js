'use strict';
/* =====================================================================
   選択画面の絵：ステージの見本（本物と同じ描き方で小さく）。必殺技のマークは 49_marks.js
   ===================================================================== */

/* ステージの見本。起動時に1回だけ描く（台とステージを一時的に組み立てて描く） */
function renderStagePreview(cv, id) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = cv.clientWidth || 96, ch = cv.clientHeight || 150;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  const g = cv.getContext('2d');
  Table.setup(GEO.TABLE_LEN * 0.56);
  Stage.load(id);
  Stage.set(id === 'shutter' ? 3.2 : 1.3);
  Table.clampGoal(); Table.buildWalls();
  const { W, L } = Table, k = Math.min(cw / W, ch / L) * dpr;
  withCtx(g, () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(k, 0, 0, k, (cv.width - W * k) / 2, (cv.height - L * k) / 2);
    paintThemeSurface(g, STAGE_THEME[id] || STAGE_THEME.pillars);
    drawStageDecor(1.3);
    drawStageFloor(1.3);
    drawGoals(1.3);
    drawWalls(1.3);
    drawStageShapes(1.3);
    const m0 = Physics.makeMallet(0, W * 0.5, L * 0.84), m1 = Physics.makeMallet(1, W * 0.5, L * 0.16);
    drawMallet(m0, 0); drawMallet(m1, 0);
    const p = Physics.newPuck(W * 0.62, L * 0.62);
    drawPuck(p);
    if (Stage.dark) {                                         // 暗闇：マレットの周りだけ明るい
      g.save();
      tablePath(g); g.clip();
      g.fillStyle = 'rgba(1,2,8,.85)';
      g.beginPath(); g.rect(0, 0, W, L);
      for (const m of [m0, m1]) { g.moveTo(m.x + m.r * 2.6, m.y); g.arc(m.x, m.y, m.r * 2.6, 0, TAU, true); }
      g.fill();
      g.restore();
      drawMallet(m0, 0); drawMallet(m1, 0);
    }
  });
}
