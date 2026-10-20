'use strict';
/* =====================================================================
   ステージごとの動く飾り（台の座標。仕掛けの下に描く）
   どれもプレーの邪魔にならないよう、うすく・ゆっくり動かす
   ===================================================================== */
function drawStageDecor(t) {
  const { W, L } = Table, th = theme();
  ctx.save();
  switch (th.pattern) {
    case 'hex': {                                                     // コア：中央の柱から、ゆっくり広がる光の輪
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const k = ((t * 0.35 + i * 0.5) % 1);
        ctx.strokeStyle = rgba(th.line, 0.16 * (1 - k)); ctx.lineWidth = W * 0.006;
        circle(W / 2, L / 2, W * (0.08 + k * 0.5)); ctx.stroke();
      }
      break;
    }
    case 'plate': {                                                   // 工場：中央線のレールと、流れる誘導灯
      ctx.strokeStyle = 'rgba(20,24,32,.9)'; ctx.lineWidth = W * 0.03;
      ctx.beginPath(); ctx.moveTo(0, L / 2); ctx.lineTo(W, L / 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,210,230,.35)'; ctx.lineWidth = W * 0.004;
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, L / 2 + d * W * 0.012); ctx.lineTo(W, L / 2 + d * W * 0.012); ctx.stroke(); }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = ((t * 0.12 + i / 6) % 1) * W;
        glowAt(x, L / 2, W * 0.02, '#ffc94d', 0.6);
      }
      break;
    }
    case 'leaf': {                                                    // 森：ふわふわ漂う蛍
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const x = W * (((i * 0.618) + Math.sin(t * 0.4 + i * 1.7) * 0.06) % 1 + 1) % W, y = L * (((i * 0.37) + Math.cos(t * 0.3 + i) * 0.05 + 1) % 1);
        const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * (1.5 + (i % 4) * 0.4) + i * 2));
        glowAt(x % W, y, W * 0.02, th.ambient, 0.5 * tw);
      }
      break;
    }
    case 'track': {                                                   // サーキット：ゴールへ向かって流れる光の筋
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = W * 0.006; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {                                  // 先が明るく、尾がうすい（グラデーションを毎回作らず、2段の線で描く）
        const x = W * (0.12 + ((i * 0.37) % 0.76)), k = ((t * 0.5 + i * 0.23) % 1), dir = i % 2 ? 1 : -1;
        const y = dir > 0 ? L * (0.5 + k * 0.5) : L * (0.5 - k * 0.5), a = 0.22 * (1 - k);
        ctx.strokeStyle = rgba(th.ambient, a);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - dir * L * 0.035); ctx.stroke();
        ctx.strokeStyle = rgba(th.ambient, a * 0.35);
        ctx.beginPath(); ctx.moveTo(x, y - dir * L * 0.035); ctx.lineTo(x, y - dir * L * 0.08); ctx.stroke();
      }
      break;
    }
    case 'stars': {                                                   // 宇宙：またたく星と、ゆっくり回る渦
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const x = ((i * 0.7548776 + 0.3) % 1) * W, y = ((i * 0.5698403 + 0.41) % 1) * L;
        const tw = Math.max(0, Math.sin(t * (1 + (i % 5) * 0.3) + i * 3));
        glowAt(x, y, W * 0.009, '#b9c6ff', 0.45 * tw * tw);          // パックと見まちがえないよう、小さく青白く
      }
      ctx.strokeStyle = rgba(th.line, 0.14); ctx.lineWidth = W * 0.005;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let a = 0; a < TAU * 0.9; a += 0.1) { const r = W * (0.04 + a * 0.035), ang = a + t * 0.25 + k * TAU / 3; const px = W / 2 + Math.cos(ang) * r, py = L / 2 + Math.sin(ang) * r; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
      break;
    }
    case 'concrete': {                                                // 要塞：ゴールポストのランプ。ふだんはかすかに、閉まる前は点滅して知らせる（形のある物は置かない）
      const info = Stage.shutterInfo || { warn: 0, cover: 0 };
      ctx.globalCompositeOperation = 'lighter';
      for (const o of [0, 1]) {
        for (const sx of [-1, 1]) {
          const hot = info.warn > 0 && sx === Math.sign(info.side) ? info.warn * (0.5 + 0.5 * Math.sin(t * 28)) : 0;   // ふさがる側のポストだけ
          glowAt(W / 2 + sx * Table.goalHalf[o], Table.goalY(o), W * (0.03 + 0.06 * hot), '#ffb020', 0.12 + 0.88 * hot);
        }
      }
      break;
    }
    case 'monitor': {                                                 // 鼓動：中央線を走る心電図。ゴールの幅の変化に合わせて脈打つ
      const ph = (Stage.t / STG.PULSE_PERIOD) % 1, beatX = ((t * 0.45) % 1) * W;
      ctx.strokeStyle = rgba(th.line, 0.55); ctx.lineWidth = W * 0.006; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= W; x += W / 120) {
        const d = x - beatX, spike = Math.abs(d) < W * 0.06 ? Math.sin(d / (W * 0.06) * Math.PI * 2) * L * 0.035 * (1 + 0.6 * Math.sin(ph * TAU)) : 0;
        const y = L / 2 - spike;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      glowAt(beatX, L / 2, W * 0.05, th.line, 0.6);
      break;
    }
    case 'caustic': {                                                 // 深海：ゆっくり昇る泡（明かりの中でだけ見える）
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const x = W * (((i * 0.618) + Math.sin(t * 0.5 + i) * 0.02) % 1), y = L * (1 - ((t * (0.02 + (i % 4) * 0.008) + i * 0.137) % 1));
        ctx.strokeStyle = rgba(th.ambient, 0.35); ctx.lineWidth = W * 0.003;
        circle(x, y, W * (0.006 + (i % 3) * 0.004)); ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}
