'use strict';
/* =====================================================================
   画面の流れ（タイトル → 必殺技 → ステージ → 試合 → 結果）
   ボタンは data-act で、Acts の同じ名前の関数を呼ぶ
   ===================================================================== */
const Sel = {
  skill: SKILLS.some(s => s.id === store.get('skill')) ? store.get('skill') : 'fast',
  stage: STAGE_META.some(s => s.id === store.get('stage')) ? store.get('stage') : 'pillars',
};
const Acts = {};

const UI = {
  screen: null,
  flow: 'cpu',              // 'cpu' か 'online'
  icons: [],                // 必殺技のアイコン（動かす）
  confetti: [],

  show(name) {
    for (const s of $$('.screen')) s.classList.remove('show');
    const ae = document.activeElement;                      // 入力欄に文字を打つ画面から離れたら、入力欄から外す（長押しで「ペースト」が出ないように）
    if (ae && ae.tagName === 'INPUT' && name !== 'lobby') ae.blur();
    this.screen = name;
    if (name === 'title' && !Attract.on && Game.state !== 'match') Attract.start();   // タイトルの背景は、いつも動いているように
    if (name) {
      const s = $('#s-' + name);
      void s.offsetWidth;                                   // 出てくる動きを毎回やり直す
      s.classList.add('show');
    }
    $('#pause-btn').classList.toggle('hidden', !!name || Game.state !== 'match');
  },
  hideAll() { this.show(null); },
  /* もし拡大されてしまったら、元の大きさに戻す（ビューポートの指定を書き直すと戻る） */
  unzoomWatch() {
    const vv = window.visualViewport, meta = document.querySelector('meta[name=viewport]');
    if (!vv || !meta) return;
    const base = meta.getAttribute('content');
    let busy = false;
    vv.addEventListener('resize', () => {
      if (busy || vv.scale <= 1.01) return;
      busy = true;
      meta.setAttribute('content', base.replace('maximum-scale=1', 'maximum-scale=1.01'));
      setTimeout(() => { meta.setAttribute('content', base); busy = false; }, 60);
    });
  },

  /* ---- 必殺技の一覧 ---- */
  buildSkillList() {
    const box = $('#skill-list');
    box.innerHTML = '';
    this.icons = [];
    SKILLS.forEach((sk, i) => {
      const ty = SKILL_TYPE[sk.type];
      const c = el('button', 'card');
      c.style.setProperty('--c', ty.color);
      c.style.animationDelay = (i * 0.05) + 's';
      const cv = el('canvas', 'ic');
      cv.width = cv.height = 128;
      const b = el('span', 'badge', ty.label);
      b.style.background = ty.color;
      c.append(cv, el('span', 'nm', sk.name), b, el('span', 'ds', sk.desc));
      c.addEventListener('click', () => { Sel.skill = sk.id; store.set('skill', sk.id); Sound.ui(); this.markSkill(); });
      c.dataset.id = sk.id;
      box.appendChild(c);
      this.icons.push({ g: cv.getContext('2d'), id: sk.id });
    });
    this.markSkill();
  },
  markSkill() { for (const c of $$('#skill-list .card')) c.classList.toggle('sel', c.dataset.id === Sel.skill); },
  /* 選択画面のマーク（試合中と同じマーク）。選んでいる技は光って脈打つ */
  drawIcons(t) {
    for (const ic of this.icons) {
      const sk = SKILLS.find(s => s.id === ic.id), sel = Sel.skill === ic.id;
      ic.g.setTransform(2, 0, 0, 2, 0, 0);
      ic.g.clearRect(0, 0, 64, 64);
      const k = sel ? 1 + 0.06 * Math.sin(t * 6) : 1;
      drawSkillMark(ic.g, ic.id, 32, 32, 44 * k, SKILL_TYPE[sk.type].color, { glow: sel ? 0.7 + 0.3 * Math.sin(t * 6) : 0.25 });
    }
  },

  /* ---- ステージの一覧（見本の絵つき） ---- */
  buildStageList() {
    const box = $('#stage-list');
    box.innerHTML = '';
    STAGE_META.forEach((st, i) => {
      const c = el('button', 'card stage');
      c.style.setProperty('--c', st.id === 'dark' ? '#9d7bff' : COLORS.ui);
      c.style.animationDelay = (i * 0.04) + 's';
      const cv = el('canvas');
      cv.style.width = '76px'; cv.style.height = '120px';
      c.append(cv, el('span', 'nm', st.name), el('span', 'ds', st.desc));
      c.dataset.id = st.id;
      c.addEventListener('click', () => { Sel.stage = st.id; store.set('stage', st.id); Sound.ui(); this.markStage(); });
      box.appendChild(c);
      renderStagePreview(cv, st.id);
    });
    this.markStage();
  },
  markStage() { for (const c of $$('#stage-list .card')) c.classList.toggle('sel', c.dataset.id === Sel.stage); },

  /* ---- 結果 ---- */
  showResult(win, mine, theirs) {
    const t = $('#result-title');
    t.textContent = win ? '勝ち！' : '負け…';
    t.className = 'result-title ' + (win ? 'win' : 'lose');
    $('#result-score').innerHTML = `<span class="me">${mine}</span> - <span class="opp">${theirs}</span>`;
    const opp = SKILLS.find(s => s.id === Match.skill[1 - Match.me]), stg = STAGE_META.find(s => s.id === Match.stageId);
    $('#result-note').textContent = `相手の技：${opp ? opp.name : ''} ／ ステージ：${stg ? stg.name : ''}`;
    $('#btn-rematch').disabled = false;
    $('#btn-rematch').textContent = 'もう一度';
    this.show('result');
    if (win) this.burstConfetti();
  },
  message(title, text) {
    $('#msg-title').textContent = title;
    $('#msg-text').textContent = text;
    this.show('msg');
  },
  wait(text) {
    $('#wait-text').textContent = text;
    this.show('wait');
  },

  /* ---- 勝ったときの紙吹雪（画面の座標） ---- */
  burstConfetti() {
    const cols = [COLORS.ready, COLORS.me, COLORS.opp, '#ffffff', SKILL_TYPE.defense.color, SKILL_TYPE.disrupt.color];
    for (let i = 0; i < 140; i++) {
      this.confetti.push({ x: Layout.vw * rand(0.1, 0.9), y: -rand(10, Layout.vh * 0.6), vx: rand(-60, 60), vy: rand(80, 220),
                           r: rand(0, TAU), vr: rand(-8, 8), w: rand(6, 11), h: rand(3, 6), c: pick(cols), sw: rand(0, TAU) });
    }
  },
  drawConfetti(dt) {
    if (!this.confetti.length) return;
    screenTransform(false);
    for (const p of this.confetti) {
      p.sw += dt * 5; p.x += (p.vx + Math.sin(p.sw) * 40) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(Math.cos(p.sw), 1);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    this.confetti = this.confetti.filter(p => p.y < Layout.vh + 30);
  },

  /* 一時停止ボタンを、台の左上の角に置く */
  placePause() {
    const b = $('#pause-btn'), p = Layout.toScreen(Layout.flip ? Layout.W : 0, Layout.flip ? Layout.L : 0);
    b.style.left = Math.max(4, p.x + 4) + 'px';
    b.style.top = Math.max(4, p.y + 4) + 'px';
  },

  init() {
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const f = Acts[b.dataset.act];
      if (f) { Sound.unlock(); Sound.ui(); f(b); }
    });
    // ページのスクロール・拡大縮小・長押しメニュー・文字選択を止める（一覧のスクロールと入力欄は除く）
    // iPhone はビューポートの「拡大しない」指定を無視するので、2本指の動きとジェスチャーそのものを止める
    const allow = e => e.target.closest && (e.target.closest('.scroll') || e.target.closest('input'));
    const stop = e => { if (e.cancelable) e.preventDefault(); };
    document.addEventListener('touchstart', e => { if (e.touches.length > 1) stop(e); }, { passive: false });   // 2本目の指：つまんで拡大を始めさせない（試合の操作はポインターで受けるので止まらない）
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1) || !allow(e)) stop(e); }, { passive: false });
    for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, stop, { passive: false });
    document.addEventListener('dblclick', stop, { passive: false });
    window.addEventListener('wheel', e => { if (e.ctrlKey) stop(e); }, { passive: false });        // パソコン：Ctrl＋ホイール
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', ';'].includes(e.key)) stop(e); });
    canvas.addEventListener('touchstart', stop, { passive: false });   // 台の上の長押しで、文字選択やメニュー（ペースト）を出さない
    this.unzoomWatch();
    document.addEventListener('contextmenu', e => { if (!e.target.closest('input')) e.preventDefault(); });
    document.addEventListener('selectstart', e => { if (!allow(e)) e.preventDefault(); });
    let lastTap = 0;
    document.addEventListener('touchend', e => {           // ダブルタップでの拡大を止める（ボタンと入力欄は除く。押したことが消えないように）
      const now = Date.now();
      const tappable = e.target.closest && e.target.closest('button, [data-act], input, .card');
      if (now - lastTap < 320 && !allow(e) && !tappable && e.cancelable) e.preventDefault();
      lastTap = now;
    }, { passive: false });
    $('#pause-btn').addEventListener('click', () => Acts.pause());
    $('#btn-share').classList.toggle('hidden', !navigator.share);
    const code = $('#code-in');
    code.addEventListener('paste', e => {                  // 貼り付けは、部屋コードか招待リンクのときだけ受け付ける（関係ない文字が入らないように）
      const t = (e.clipboardData && e.clipboardData.getData('text')) || '';
      const m = t.match(/[?&]room=([^&#\s]+)/), c = normCode(m ? m[1] : t);
      e.preventDefault();
      if (c.length === NET.CODE_LEN && (m || t.trim().length <= NET.CODE_LEN + 4)) code.value = c;
    });
    const tidy = () => { const v = normCode(code.value); if (v !== code.value) code.value = v; };
    code.addEventListener('input', e => { if (!e.isComposing) tidy(); });   // 日本語入力の変換中はさわらない
    code.addEventListener('compositionend', tidy);
    $('#code-in').addEventListener('keydown', e => { if (e.key === 'Enter') Acts.joinRoom(); });
    this.updateSoundBtn();
    this.buildSkillList();
    this.buildStageList();
    Layout.onResize.push(() => this.placePause());
  },
  updateSoundBtn() { $('#btn-sound').textContent = Sound.on ? '音：オン' : '音：オフ'; },
};

/* ---- ボタンの動き ---- */
Acts.cpu = () => { UI.flow = 'cpu'; $('#skill-step').textContent = '1 / 2'; $('#stage-step').textContent = '2 / 2'; $('#s-skill .back').textContent = 'もどる'; UI.markSkill(); UI.show('skill'); };
Acts.online = () => { UI.flow = 'online'; $('#skill-step').textContent = ''; $('#stage-step').textContent = ''; Net.openLobby(); };
Acts.sound = () => { Sound.setOn(!Sound.on); UI.updateSoundBtn(); };
Acts.back = () => {
  if (UI.screen === 'stage') { UI.markSkill(); return UI.show('skill'); }   // ステージ選び → 技選びへ（オンラインのホストも部屋は閉じない）
  if (UI.flow === 'online') return Acts.toTitle();                         // オンラインの技選び：部屋から出る
  UI.show('title');
};
Acts.skillOk = () => {
  if (UI.flow === 'cpu') { UI.markStage(); return UI.show('stage'); }
  Net.chooseSkill(Sel.skill);
};
Acts.stageRandom = () => {
  const ids = STAGE_META.map(s => s.id).filter(id => id !== Sel.stage);
  Sel.stage = pick(ids); store.set('stage', Sel.stage); UI.markStage();
  const c = $(`#stage-list .card[data-id="${Sel.stage}"]`);
  if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
Acts.stageOk = () => {
  if (UI.flow === 'cpu') return startCpuMatch();
  Net.chooseStage(Sel.stage);
};
Acts.rematch = () => {
  if (UI.flow === 'cpu') return startCpuMatch();
  Net.requestRematch();
};
Acts.changeSkill = () => {
  if (UI.flow === 'cpu') { Attract.start(); UI.markSkill(); return UI.show('skill'); }
  Net.requestReselect();
};
Acts.toTitle = () => {
  if (UI.flow === 'online') Net.leave();
  if (Match.active) Match.abort();
  UI.flow = 'cpu';
  Attract.start();
  UI.show('title');
};
Acts.pause = () => {
  if (Game.state !== 'match') return;
  if (Match.mode === 'cpu') Match.paused = true;
  $('#pause-note').textContent = Match.mode === 'cpu' ? '' : 'オンライン対戦は止まりません\nやめると相手に知らせます';
  Input.reset();
  UI.show('pause');
};
Acts.resume = () => { Match.paused = false; UI.hideAll(); };
Acts.quit = () => Acts.toTitle();

/* CPU戦を始める（CPUの技は毎回ランダム） */
function startCpuMatch() {
  const cpuSkill = pick(SKILLS).id;
  Match.start({ mode: 'cpu', skills: [Sel.skill, cpuSkill], stage: Sel.stage });
}
