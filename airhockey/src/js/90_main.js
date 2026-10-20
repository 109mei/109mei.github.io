'use strict';
/* =====================================================================
   起動とメインループ
   ===================================================================== */
const Game = {
  state: 'menu',            // 'menu'（画面を選んでいる）／'match'（試合中）
  wake: null,

  enterMatch() {
    this.state = 'match';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // 入力欄などから外す（試合中の長押しで「ペースト」が出ないように）
    Attract.on = false;
    UI.confetti = [];
    UI.hideAll();
    UI.placePause();
    $('#pause-btn').classList.remove('hidden');
    this.keepAwake(true);
  },
  exitMatch() {
    this.state = 'menu';
    Layout.locked = false;
    $('#pause-btn').classList.add('hidden');
    Input.reset();
    this.keepAwake(false);
  },
  /* 試合中は画面が消えないようにする（対応している端末だけ） */
  async keepAwake(on) {
    try {
      if (on && navigator.wakeLock && !this.wake) {
        this.wake = await navigator.wakeLock.request('screen');
        this.wake.addEventListener('release', () => { this.wake = null; });   // 画面が隠れると解除されるので、戻ったら取り直す
      }
      if (!on && this.wake) { await this.wake.release(); this.wake = null; }
    } catch (e) { this.wake = null; }
  },
};

Physics.onMalletHit = (p, m, power, nx, ny) => Match.onMalletHit(p, m, power, nx, ny);

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (!window.__hold) tick(dt, now / 1000);                 // __hold は確認用（自動テストで時間を止めて1コマずつ進める）
  requestAnimationFrame(frame);
}
function tick(dt, t) {
  try {
    if (Game.state === 'match') {
      if (Match.mode === 'guest') GuestSync.update(dt); else Match.update(dt);
      Net.update(dt);
      Fx.update(Match.paused ? 0 : dt);
      Slide.update(dt);
      drawMatch(t);
    } else {
      Attract.update(dt);
      Net.update(dt);
      Fx.update(dt);
      Slide.update(dt);
      Attract.draw(t);
      UI.drawConfetti(dt);
      if (UI.screen === 'skill') UI.drawIcons(t);
    }
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (Game.state === 'match' && Match.mode === 'cpu' && !Match.paused) Acts.pause(); }
  else { if (Game.state === 'match') Game.keepAwake(true); if (Sound.ac) Sound.unlock(); }
});

/* 起動 */
Layout.init();
Sound.init();
Fx.init();
Net.init();
Input.init();
UI.init();
Attract.start();
UI.show('title');
requestAnimationFrame(frame);

/* 招待リンク（?room=コード）で開かれたら、そのまま参加する */
(() => {
  const code = new URLSearchParams(location.search).get('room');
  if (!code) return;
  try { history.replaceState(null, '', location.href.split(/[?#]/)[0]); } catch (e) { /* 書き換えられなくても参加できる */ }
  UI.flow = 'online';
  Net.openLobby();
  $('#code-in').value = normCode(code);
  Net.joinRoom($('#code-in').value);
})();
