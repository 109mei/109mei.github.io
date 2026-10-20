'use strict';
/* =====================================================================
   ステージごとの見た目（テーマ）
   台の面の色・床の模様・台の外の背景・壁の色・動く飾りをステージごとに変える。
   遊び方（仕掛けの位置や物理）は変えない。動かない部分は TableArt でまとめて描いておく
   ===================================================================== */
const STAGE_THEME = {
  pillars: { pillar: '#8ea6e0', name: 'コア',         surface: ['#17306e', '#0f2152', '#091538'], line: '#5a86ff', wall: '#9fb6ff', bg: ['#04081a', '#081236'], pattern: 'hex',     ambient: '#8fb4ff' },
  sweeper: { pillar: '#a3acbd', name: '工場',         surface: ['#2b3446', '#1d2433', '#12171f'], line: '#ffc94d', wall: '#ffd36b', bg: ['#07090d', '#141922'], pattern: 'plate',   ambient: '#ffe2a0' },
  spring:  { pillar: '#8fae8a', name: '森',           surface: ['#17543a', '#0f3b29', '#08261a'], line: '#8ef0a0', wall: '#c4ff9a', bg: ['#03100a', '#0a2416'], pattern: 'leaf',    ambient: '#d8ff6a' },
  boost:   { pillar: '#aeb4c2', name: 'サーキット',   surface: ['#30343e', '#23262e', '#17191e'], line: '#f2f4f8', wall: '#dfe6f2', bg: ['#08090b', '#16181c'], pattern: 'track',   ambient: '#ffd08a' },
  warp:    { pillar: '#9d93d9', name: '宇宙',         surface: ['#34197a', '#200f52', '#110831'], line: '#b49cff', wall: '#c8b6ff', bg: ['#05020f', '#120830'], pattern: 'stars',   ambient: '#e4d8ff' },
  shutter: { pillar: '#c7a774', name: '要塞',         surface: ['#4a3514', '#33240e', '#1f1608'], line: '#ffcf6b', wall: '#ffcf6b', bg: ['#0d0904', '#1f160a'], pattern: 'concrete', ambient: '#ffd9a0' },
  pulse:   { pillar: '#9cc4b4', name: '鼓動',         surface: ['#16301a', '#0d2011', '#061208'], line: '#66ff7a', wall: '#bff7c4', bg: ['#020803', '#08170a'], pattern: 'monitor', ambient: '#b0ffb8' },
  dark:    { pillar: '#4a5a7c', name: '深海',         surface: ['#0e1a33', '#0a1326', '#060b17'], line: '#3d5c99', wall: '#5574b8', bg: ['#010205', '#04070f'], pattern: 'caustic', ambient: '#6fa8ff' },
};
const theme = () => STAGE_THEME[Stage.id] || STAGE_THEME.pillars;

/* 台の外（余白）。画面の座標で描く */
function paintThemeBackground(g, th, vw, vh) {
  const bg = g.createLinearGradient(0, 0, 0, vh);
  bg.addColorStop(0, th.bg[0]); bg.addColorStop(0.5, th.bg[1]); bg.addColorStop(1, th.bg[0]);
  g.fillStyle = bg; g.fillRect(0, 0, vw, vh);
  g.save();
  g.strokeStyle = rgba(th.line, 0.07); g.fillStyle = rgba(th.line, 0.12); g.lineWidth = 1;
  if (th.pattern === 'stars' || th.pattern === 'caustic') {          // 星（深海ではかすかな粒）
    for (let i = 0; i < 160; i++) {
      const x = ((i * 0.6180339) % 1) * vw, y = ((i * 0.4142135 + 0.17) % 1) * vh, r = (i % 7 === 0 ? 1.4 : 0.7);
      g.globalAlpha = th.pattern === 'stars' ? 0.3 + 0.5 * ((i * 0.37) % 1) : 0.15;
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  } else if (th.pattern === 'plate' || th.pattern === 'concrete') {  // 斜めのしま
    g.strokeStyle = rgba(th.line, 0.06); g.lineWidth = 8;
    g.beginPath();
    for (let x = -vh; x < vw; x += 36) { g.moveTo(x, vh); g.lineTo(x + vh, 0); }
    g.stroke();
  } else {                                                            // ゆるい格子
    const step = 28;
    g.beginPath();
    for (let x = (vw / 2) % step; x < vw; x += step) { g.moveTo(x, 0); g.lineTo(x, vh); }
    for (let y = (vh / 2) % step; y < vh; y += step) { g.moveTo(0, y); g.lineTo(vw, y); }
    g.stroke();
  }
  g.restore();
}

/* 台の面（台の座標で描く）：色・模様・空気穴・照り返し・線・自陣の色分け */
function paintThemeSurface(g, th) {
  const { W, L, D } = Table;
  tablePath(g);
  const sg = g.createRadialGradient(W / 2, L / 2, W * 0.1, W / 2, L / 2, L * 0.62);
  sg.addColorStop(0, th.surface[0]); sg.addColorStop(0.55, th.surface[1]); sg.addColorStop(1, th.surface[2]);
  g.fillStyle = sg; g.fill();
  g.save();
  tablePath(g); g.clip();
  paintThemePattern(g, th);
  // 空気穴
  const hs = W * 0.05;
  g.fillStyle = rgba(mix(th.line, '#ffffff', 0.4), 0.09);
  for (let y = hs / 2; y < L; y += hs) {
    for (let x = hs / 2 + ((Math.round(y / hs) % 2) * hs) / 2; x < W; x += hs) { g.beginPath(); g.arc(x, y, W * 0.0045, 0, TAU); g.fill(); }
  }
  // 照り返し
  const sh = g.createLinearGradient(0, 0, W, L * 0.6);
  sh.addColorStop(0, 'rgba(255,255,255,.06)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, W, L);
  // 線：中央線・中央の円・ゴール前の半円
  g.strokeStyle = rgba(th.line, 0.38); g.lineWidth = W * 0.006;
  g.beginPath(); g.moveTo(0, L / 2); g.lineTo(W, L / 2); g.stroke();
  g.beginPath(); g.arc(W / 2, L / 2, W * 0.15, 0, TAU); g.stroke();
  g.beginPath(); g.arc(W / 2, L / 2, W * 0.02, 0, TAU); g.fillStyle = rgba(th.line, 0.5); g.fill();
  g.beginPath(); g.arc(W / 2, 0, W * 0.26, 0, Math.PI); g.stroke();
  g.beginPath(); g.arc(W / 2, L, W * 0.26, Math.PI, TAU); g.stroke();
  // 自陣の色分け（うすく）
  const half = (y0, y1, col) => { const lg = g.createLinearGradient(0, y0, 0, y1); lg.addColorStop(0, rgba(col, 0)); lg.addColorStop(1, rgba(col, 0.07)); g.fillStyle = lg; g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0)); };
  half(L / 2, L, ownerColor(0)); half(L / 2, 0, ownerColor(1));
  g.restore();
  // 角の三角形（必殺技ボタン／相手のゲージ）の地
  g.fillStyle = '#060b1a';
  for (const [ax, ay, bx, by, cx, cy] of [[0, 0, D, 0, 0, D], [W, 0, W - D, 0, W, D], [0, L, D, L, 0, L - D], [W, L, W - D, L, W, L - D]]) {
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.closePath(); g.fill();
  }
}

/* ステージごとの床の模様（動かない部分） */
function paintThemePattern(g, th) {
  const { W, L } = Table, c = th.line;
  g.save();
  switch (th.pattern) {
    case 'hex': {                                                     // 六角形のタイル
      const s = W * 0.075, h = s * Math.sqrt(3) / 2;
      g.strokeStyle = rgba(c, 0.1); g.lineWidth = W * 0.003;
      for (let row = -1, y = 0; y < L + s; row++, y = row * h) {
        for (let x = (row % 2) * s * 0.75 - s; x < W + s; x += s * 1.5) {
          g.beginPath();
          for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; const px = x + Math.cos(a) * s * 0.5, py = y + Math.sin(a) * s * 0.5; k ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.closePath(); g.stroke();
        }
      }
      break;
    }
    case 'plate': {                                                   // 金属の床板と、中央のレールの両側の警告のしま
      g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = W * 0.004;
      for (let y = L / 8; y < L; y += L / 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let x = W / 3; x < W; x += W / 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.12)';
      for (let y = L / 8; y < L; y += L / 8) for (let x = W / 3; x < W; x += W / 3) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(x + dx * W * 0.02, y + dy * W * 0.02, W * 0.006, 0, TAU); g.fill(); }
      const band = W * 0.05;
      g.beginPath(); g.rect(0, L / 2 - band, W, band * 2); g.clip();
      g.fillStyle = 'rgba(255,201,77,.14)';
      for (let x = -band * 2; x < W + band * 2; x += band * 1.2) { g.beginPath(); g.moveTo(x, L / 2 - band); g.lineTo(x + band * 0.6, L / 2 - band); g.lineTo(x + band * 1.6, L / 2 + band); g.lineTo(x + band, L / 2 + band); g.fill(); }
      break;
    }
    case 'leaf': {                                                    // 葉の葉脈のような曲線
      g.strokeStyle = rgba(c, 0.09); g.lineWidth = W * 0.004;
      for (let i = 0; i < 10; i++) {
        const y = L * (0.05 + i * 0.1), dir = i % 2 ? 1 : -1;
        g.beginPath(); g.moveTo(dir > 0 ? 0 : W, y); g.quadraticCurveTo(W / 2, y + L * 0.08 * dir, dir > 0 ? W : 0, y + L * 0.04);
        g.stroke();
        for (let k = 1; k < 5; k++) { const x = W * k / 5; g.beginPath(); g.moveTo(x, y + L * 0.03); g.lineTo(x + W * 0.05 * dir, y - L * 0.02); g.stroke(); }
      }
      break;
    }
    case 'track': {                                                   // 車線・縁石・ゴール前のチェッカー
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = W * 0.008;
      g.setLineDash([L * 0.04, L * 0.035]);
      for (const x of [W / 3, W * 2 / 3]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L); g.stroke(); }
      g.setLineDash([]);
      const cw = W * 0.03;
      for (const x of [0, W - cw]) for (let y = 0, i = 0; y < L; y += L * 0.04, i++) { g.fillStyle = i % 2 ? 'rgba(10,10,14,.55)' : 'rgba(255,255,255,.3)'; g.fillRect(x, y, cw, L * 0.04); }
      const sq = W * 0.04;
      for (const y0 of [L * 0.07, L * 0.93 - sq * 2]) for (let r = 0; r < 2; r++) for (let x = 0, i = 0; x < W; x += sq, i++) { if ((i + r) % 2) continue; g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y0 + r * sq, sq, sq); }
      break;
    }
    case 'stars': {                                                   // 星雲と星
      for (const [x, y, r, col] of [[0.3, 0.3, 0.45, '#8a5cff'], [0.75, 0.68, 0.4, '#ff5cc8'], [0.5, 0.5, 0.3, '#5cb8ff']]) {
        const ng = g.createRadialGradient(W * x, L * y, 0, W * x, L * y, W * r);
        ng.addColorStop(0, rgba(col, 0.16)); ng.addColorStop(1, rgba(col, 0));
        g.fillStyle = ng; g.fillRect(0, 0, W, L);
      }
      for (let i = 0; i < 90; i++) {
        const x = ((i * 0.7548776) % 1) * W, y = ((i * 0.5698403 + 0.11) % 1) * L;
        g.globalAlpha = 0.25 + 0.6 * ((i * 0.31) % 1);
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, W * (i % 9 === 0 ? 0.005 : 0.0025), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'concrete': {                                                // コンクリートの床：継ぎ目・しみ・ひび（黄色と黒のしまはシャッターだけに使う）
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = W * 0.004;
      for (let y = 0; y < L; y += L / 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let y = 0, r = 0; y < L; y += L / 10, r++) for (let x = (r % 2) * W / 6; x < W; x += W / 3) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + L / 10); g.stroke(); }
      for (let i = 0; i < 7; i++) {                                   // しみ
        const x = ((i * 0.618 + 0.2) % 1) * W, y = ((i * 0.377 + 0.15) % 1) * L, r = W * (0.06 + ((i * 0.53) % 1) * 0.08);
        const sg = g.createRadialGradient(x, y, 0, x, y, r);
        sg.addColorStop(0, 'rgba(0,0,0,.16)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sg; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = W * 0.003; g.lineJoin = 'round';
      for (let i = 0; i < 6; i++) {                                   // ひび
        let x = ((i * 0.43 + 0.1) % 1) * W, y = ((i * 0.71 + 0.05) % 1) * L, a = i * 1.9;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { a += Math.sin(i * 7 + k * 3) * 0.9; x += Math.cos(a) * W * 0.035; y += Math.sin(a) * W * 0.035; g.lineTo(x, y); }
        g.stroke();
      }
      break;
    }
    case 'monitor': {                                                 // 心電図の画面のような細かい格子
      g.strokeStyle = rgba(c, 0.07); g.lineWidth = W * 0.002;
      const s = W * 0.04;
      g.beginPath();
      for (let x = 0; x < W; x += s) { g.moveTo(x, 0); g.lineTo(x, L); }
      for (let y = 0; y < L; y += s) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      g.strokeStyle = rgba(c, 0.13); g.lineWidth = W * 0.003;
      g.beginPath();
      for (let x = 0; x < W; x += s * 5) { g.moveTo(x, 0); g.lineTo(x, L); }
      for (let y = 0; y < L; y += s * 5) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      break;
    }
    case 'caustic': {                                                 // 水底のゆらめく光の模様（明かりの中でだけ見える）
      g.strokeStyle = rgba(c, 0.16); g.lineWidth = W * 0.004;
      for (let i = 0; i < 26; i++) {
        const x = ((i * 0.618) % 1) * W, y = ((i * 0.414 + 0.07) % 1) * L, r = W * (0.05 + ((i * 0.37) % 1) * 0.06);
        g.beginPath();
        for (let k = 0; k <= 7; k++) { const a = k / 7 * TAU; const rr = r * (0.75 + 0.3 * Math.sin(k * 2.3 + i)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
      }
      break;
    }
  }
  g.restore();
}
