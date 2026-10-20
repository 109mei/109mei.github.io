'use strict';
/* =====================================================================
   画面と台の対応
   台の座標：x 0..W（左→右）、y 0..L（上→下）。y=0 が上のゴール（プレイヤー1が守る）、y=L が下のゴール（プレイヤー0が守る）
   flip=true（オンラインのゲスト）のときは台を180°回して表示し、自分のゴールが画面の下に来る
   ===================================================================== */
const Layout = {
  vw: 1, vh: 1, dpr: 1,
  safe: { t: 0, b: 0, l: 0, r: 0 },
  W: 500, L: GEO.TABLE_LEN, aspect: 0.5,
  scale: 1, ox: 0, oy: 0, flip: false,
  locked: false,        // 試合中は台の形を変えない（画面が変わったら収め直すだけ）
  onResize: [],

  measureSafe() {
    const probe = el('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    this.safe = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0,
                  b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    probe.remove();
    const g = this.topGuard();                                      // 上端はノッチ・時計・サイト名の表示にかぶるので、少なくともこれだけ空ける
    this.safe.t = Math.max(this.safe.t, g);
    document.documentElement.style.setProperty('--guard-top', g + 'px');   // メニュー画面も同じだけ下げる
  },
  /* 上端に空ける幅（px）。スマホのブラウザで開いているときだけ（ホーム画面から開いたアプリ表示では safe-area に任せる） */
  topGuard() {
    const mm = q => !!(window.matchMedia && window.matchMedia(q).matches);
    const touch = mm('(pointer: coarse)') || (navigator.maxTouchPoints || 0) > 0;
    const app = mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || navigator.standalone === true;
    if (!touch || app) return 0;
    let g = GEO.TOP_GUARD;
    const ios = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const sh = Math.max(screen.width || 0, screen.height || 0);
    if (ios && sh && window.innerHeight >= sh - 4) g = Math.max(g, GEO.TOP_GUARD_FULL);   // 画面の一番上（ステータスバーの下）まで描いているとき
    return g;
  },

  resize() {
    this.vw = Math.max(1, window.innerWidth);
    this.vh = Math.max(1, window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);          // 3倍の画面でも2倍で描く（見た目はほぼ同じで、ずっと軽い）
    canvas.width = Math.round(this.vw * this.dpr);
    canvas.height = Math.round(this.vh * this.dpr);
    canvas.style.width = this.vw + 'px';
    canvas.style.height = this.vh + 'px';
    this.measureSafe();
    if (!this.locked) this.setTableFromView(); else this.fit();
    for (const f of this.onResize) f();
  },

  /* CPU戦・ホスト：画面の縦横比に合わせて台の長さを決める */
  setTableFromView() {
    const h = Math.max(1, this.vh - this.safe.t - this.safe.b);
    this.aspect = clamp(this.vw / h, GEO.ASPECT_MIN, GEO.ASPECT_MAX);
    this.W = this.L * this.aspect;
    this.flip = false;
    this.fit();
  },
  /* ゲスト：ホストの台をそのまま使い、画面に収まるよう縮小。180°回転 */
  setTableFromAspect(aspect, flip) {
    this.aspect = clamp(aspect, GEO.ASPECT_MIN, GEO.ASPECT_MAX);
    this.W = this.L * this.aspect;
    this.flip = !!flip;
    this.fit();
  },
  /* 台を画面に収める（左右は画面の端いっぱい、上下は safe-area の内側。上端は topGuard の分も空ける） */
  fit() {
    const availH = Math.max(1, this.vh - this.safe.t - this.safe.b);
    this.scale = Math.min(this.vw / this.W, availH / this.L);
    this.ox = (this.vw - this.W * this.scale) / 2;
    this.oy = this.safe.t + (availH - this.L * this.scale) / 2;
  },

  toScreen(x, y) {
    if (this.flip) { x = this.W - x; y = this.L - y; }
    return { x: this.ox + x * this.scale, y: this.oy + y * this.scale };
  },
  toTable(sx, sy) {
    let x = (sx - this.ox) / this.scale, y = (sy - this.oy) / this.scale;
    if (this.flip) { x = this.W - x; y = this.L - y; }
    return { x, y };
  },
  deltaToTable(dx, dy) {
    const k = (this.flip ? -1 : 1) / this.scale;
    return { x: dx * k, y: dy * k };
  },
  /* 描画先を台の座標にする（c は描画先。省略時は画面） */
  applyTable(c = ctx) {
    const s = this.scale * this.dpr * (this.flip ? -1 : 1);
    const tx = (this.ox + (this.flip ? this.W * this.scale : 0)) * this.dpr;
    const ty = (this.oy + (this.flip ? this.L * this.scale : 0)) * this.dpr;
    c.setTransform(s, 0, 0, s, tx, ty);
  },
  /* 描画先を画面の座標（CSS px）にする */
  applyScreen(c = ctx) { c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); },

  init() {
    const r = () => this.resize();
    window.addEventListener('resize', r);
    window.addEventListener('orientationchange', () => setTimeout(r, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', r);
    this.resize();
  },
};
