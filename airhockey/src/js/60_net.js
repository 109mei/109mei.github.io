'use strict';
/* =====================================================================
   オンライン対戦（PeerJS / WebRTC でスマホ同士を直接つなぐ）
   - 部屋を作る側（ホスト）が物理を計算する。部屋コードの前に NET.PEER_PREFIX をつけた名前で待つ
   - ゲストは自分のマレットの位置と速さ、必殺技ボタンの入力を送る
   - ホストはパック・両者のマレット・点数・ゲージなどを送り返す
   - 通信は2本：確実に届く「ctl」（開始・技の発動・出来事）と、速さ優先の「st」（毎フレームの状態）
   ===================================================================== */
const Net = {
  peer: null, ctl: null, st: null,
  role: null,               // 'host' / 'guest'
  code: '',
  phase: 'idle',            // idle / lobby / select / match / result
  mySkill: null, theirSkill: null, stage: null,
  rematchMe: false, rematchThem: false,
  lastRecv: 0, sendAcc: 0, pingAcc: 0, outEvents: [], lastInput: 0,
  leaving: false, connTimer: 0, retries: 0, op: 0,

  now() { return performance.now() / 1000; },
  get isHost() { return this.role === 'host'; },

  init() {
    Events.on((type, a) => {                                 // ホスト：出来事をゲストへ送るためにためる
      if (this.role !== 'host' || this.phase !== 'match') return;
      if (type === 'mtouch' || type === 'over') return;          // 試合終了はゲスト側でも出すので送らない
      if (type === 'skill') return;                              // 技を押したことは送らない（構えたことを相手に知らせない）
      this.outEvents.push([type].concat(a.map(v => (typeof v === 'number' ? Math.round(v * 10) / 10 : v))));
    });
  },

  /* PeerJS を読み込む（タグで読めていなければ、別の配信元から読む） */
  loadPeer() {
    if (window.Peer) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let i = 0;
      const next = () => {
        if (window.Peer) return resolve();
        if (i >= NET.PEERJS_URLS.length) return reject(new Error('peerjs'));
        const s = document.createElement('script');
        s.src = NET.PEERJS_URLS[i++]; s.async = true;
        const to = setTimeout(() => { s.onload = s.onerror = null; next(); }, 8000);
        s.onload = () => { clearTimeout(to); window.Peer ? resolve() : next(); };
        s.onerror = () => { clearTimeout(to); next(); };
        document.head.appendChild(s);
      };
      // タグでの読み込みが終わるのを少し待ってから
      let waited = 0;
      const poll = setInterval(() => {
        waited += 200;
        if (window.Peer) { clearInterval(poll); resolve(); }
        else if (waited >= 1500) { clearInterval(poll); next(); }
      }, 200);
    });
  },
  peerOpts() { return Object.assign({ debug: 0, config: { iceServers: NET.ICE_SERVERS } }, NET.PEER_SERVER || {}); },

  /* ---- ロビー ---- */
  openLobby() {
    this.cleanup();
    this.phase = 'lobby';
    $('#lobby-menu').classList.remove('hidden');
    $('#lobby-host').classList.add('hidden');
    this.status('');
    UI.show('lobby');
  },
  status(msg, err) {
    const s = $('#lobby-status');
    s.textContent = msg;
    s.classList.toggle('err', !!err);
  },
  makeCode() {
    let c = '';
    for (let i = 0; i < NET.CODE_LEN; i++) c += NET.CODE_CHARS[(Math.random() * NET.CODE_CHARS.length) | 0];
    return c;
  },
  inviteUrl() { return location.href.split(/[?#]/)[0] + '?room=' + this.code; },

  async createRoom() {
    this.cleanup();
    this.phase = 'lobby';
    this.role = 'host';
    const op = this.op;
    this.status('部屋を作っています…');
    try { await this.loadPeer(); }
    catch (e) { if (op === this.op) this.status('通信の準備ができませんでした\n電波の良い所でもう一度お試しください', true); return; }
    if (op !== this.op || UI.screen !== 'lobby') return;          // 待っている間に「もどる」などを押した
    this.retries = 0;
    this.openHostPeer();
  },
  openHostPeer() {
    this.code = this.makeCode();
    const peer = new Peer(NET.PEER_PREFIX + this.code, this.peerOpts());
    this.peer = peer;
    peer.on('open', () => {
      if (this.peer !== peer) return;
      $('#lobby-menu').classList.add('hidden');
      $('#lobby-host').classList.remove('hidden');
      $('#room-code').textContent = this.code;
      $('#invite-url').textContent = this.inviteUrl();
      this.status('相手が参加するのを待っています…');
    });
    peer.on('connection', conn => this.acceptConn(conn));
    peer.on('error', err => {
      if (this.peer !== peer) return;
      if (err.type === 'unavailable-id' && this.retries++ < 5) { peer.destroy(); return this.openHostPeer(); }
      this.onPeerError(err);
    });
    peer.on('disconnected', () => {                           // 案内役のサーバーから切れた：待っている間はつなぎ直す
      if (this.peer === peer && this.phase === 'lobby' && !peer.destroyed) { try { peer.reconnect(); } catch (e) { /* つなぎ直せなくても続ける */ } }
    });
  },
  acceptConn(conn) {
    if (conn.label === 'st') {                                // 状態用の通信は、いまの相手からのものだけ受ける
      if (this.ctl && conn.peer === this.ctl.peer) { this.st = conn; this.setupConn(conn); }
      else setTimeout(() => { try { conn.close(); } catch (e) { /* もう閉じている */ } }, 400);
      return;
    }
    if (this.ctl && (this.ctl.open || this.phase !== 'lobby')) {   // すでに相手がいる：あいさつが来たら断る
      conn.on('data', d => {
        if (!d || d.t !== 'hello') return;
        try { conn.send({ t: 'full' }); } catch (e) { /* 送れなくても閉じる */ }
        setTimeout(() => { try { conn.close(); } catch (e) { /* もう閉じている */ } }, 400);
      });
      return;
    }
    this.ctl = conn;
    this.setupConn(conn);
    this.status('相手とつないでいます…');
  },

  async joinRoom(code) {
    code = normCode(code);
    if (code.length !== NET.CODE_LEN) return this.status(NET.CODE_LEN + '文字の部屋コードを入力してください', true);
    this.cleanup();
    this.phase = 'lobby';
    this.role = 'guest';
    this.code = code;
    const op = this.op;
    this.status('接続しています…');
    try { await this.loadPeer(); }
    catch (e) { if (op === this.op) this.status('通信の準備ができませんでした\n電波の良い所でもう一度お試しください', true); return; }
    if (op !== this.op || UI.screen !== 'lobby') return;          // 待っている間に「もどる」などを押した
    const peer = new Peer(undefined, this.peerOpts());
    this.peer = peer;
    peer.on('open', () => {
      if (this.peer !== peer) return;
      const id = NET.PEER_PREFIX + code;
      this.ctl = peer.connect(id, { label: 'ctl', reliable: true, serialization: 'json' });
      this.setupConn(this.ctl);
      this.ctl.on('open', () => {
        this.send({ t: 'hello', v: NET.PROTO });
        this.st = peer.connect(id, { label: 'st', reliable: false, serialization: 'json' });
        this.setupConn(this.st);
      });
    });
    peer.on('error', err => { if (this.peer === peer) this.onPeerError(err); });
    clearTimeout(this.connTimer);
    this.connTimer = setTimeout(() => {
      if (this.phase === 'lobby' && this.role === 'guest' && !(this.ctl && this.ctl.open)) {
        this.fail('つながりませんでした\n部屋コードを確かめるか\n同じWi-Fiにする・モバイル回線にするなど\n通信環境を変えてもう一度お試しください');
      }
    }, NET.CONNECT_TIMEOUT * 1000);
  },

  onPeerError(err) {
    const t = err && err.type;
    if (this.phase !== 'lobby') return;                      // つながったあとは、通信が本当に切れたときだけ知らせる
    if (t === 'peer-unavailable') return this.fail('部屋が見つかりませんでした\n部屋コードを確かめてください');
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') {
      if (this.phase === 'match' || this.phase === 'result' || this.phase === 'select') return;   // 直接つながっていれば続けられる
      return this.fail('通信サーバーにつながりませんでした\n電波の良い所でもう一度お試しください');
    }
    if (t === 'browser-incompatible') return this.fail('このブラウザはオンライン対戦に対応していません');
    this.fail('つながりませんでした（' + (t || '不明') + '）\nもう一度お試しください');
  },
  fail(msg) {
    const inLobby = this.phase === 'lobby';
    this.cleanup();
    if (inLobby && UI.screen === 'lobby') { this.phase = 'lobby'; $('#lobby-menu').classList.remove('hidden'); $('#lobby-host').classList.add('hidden'); this.status(msg, true); }
    else { if (Match.active) Match.abort(); UI.flow = 'online'; Attract.start(); UI.message('つながりませんでした', msg); }
  },

  setupConn(conn) {
    conn.on('data', d => { try { this.onData(d, conn); } catch (e) { console.error(e); } });
    conn.on('close', () => { if (conn === this.ctl) this.onLost(); });
    conn.on('error', () => { if (conn === this.ctl) this.onLost(); });
  },
  send(o) { if (this.ctl && this.ctl.open) { try { this.ctl.send(o); } catch (e) { /* 次のフレームでまた送る */ } } },
  sendFast(o) {
    const c = this.st && this.st.open ? this.st : this.ctl;
    if (c && c.open) { try { c.send(o); } catch (e) { /* 落ちても次で上書きされる */ } }
  },

  /* ---- 受け取り ---- */
  onData(d) {
    if (!d || typeof d !== 'object') return;
    this.lastRecv = this.now();
    switch (d.t) {
      case 'hello':
        if (!this.isHost) return;
        if (d.v !== NET.PROTO) { this.send({ t: 'bad' }); return; }
        this.send({ t: 'welcome', v: NET.PROTO });
        this.onConnected();
        break;
      case 'welcome': if (!this.isHost) this.onConnected(); break;
      case 'bad': this.fail('相手とゲームの版が違います\n両方でページを読み込み直してください'); break;
      case 'full': this.fail('この部屋はもう対戦中です'); break;
      case 'skill': this.theirSkill = d.id; this.checkStart(); break;
      case 'start':                                           // 技を決めて待っている・再戦を待っているときだけ受ける（選び直しとの行き違い対策）
        if (!this.isHost && ((this.phase === 'select' && this.mySkill) || (this.phase === 'result' && this.rematchMe))) this.startGuest(d);
        break;
      case 'in': if (this.isHost) this.applyInput(d); break;
      case 'press': if (this.isHost && this.phase === 'match') Match.pressSkill(1); break;
      case 's': if (!this.isHost && this.phase === 'match') GuestSync.push(d); break;
      case 'ev': if (!this.isHost) for (const e of d.l) Events.emit(e[0], ...e.slice(1)); break;
      case 'over': if (!this.isHost) GuestSync.finish(d.sc); break;
      case 'rematch': this.rematchThem = true; this.onRematchWish(); break;
      case 'reselect': toast('相手が技とステージを選び直します'); this.goSelect(); break;
      case 'bye': this.onLost(true); break;
      case 'ping': this.send({ t: 'pong' }); break;
    }
  },

  onConnected() {
    clearTimeout(this.connTimer);
    toast('つながりました！');
    Sound.unlock();
    this.goSelect();
  },
  goSelect() {
    this.phase = 'select';
    this.mySkill = null; this.theirSkill = null; this.stage = null;
    this.rematchMe = this.rematchThem = false;
    if (Match.active) Match.abort();
    if (!Attract.on) Attract.start();
    $('#skill-step').textContent = this.isHost ? 'ホスト' : 'ゲスト';
    $('#s-skill .back').textContent = '退出';
    $('#stage-step').textContent = 'ホスト';
    UI.markSkill();
    UI.show('skill');
  },

  /* ---- 選択 ---- */
  chooseSkill(id) {
    this.mySkill = id;
    this.send({ t: 'skill', id });
    if (this.isHost) { UI.markStage(); UI.show('stage'); }
    else UI.wait('ホストがステージを選んでいます…');
  },
  chooseStage(id) {
    if (!this.isHost) return;
    this.stage = id;
    if (!this.checkStart()) UI.wait('相手が必殺技を選んでいます…');
  },
  checkStart() {
    if (!this.isHost || this.phase !== 'select' || !this.mySkill || !this.theirSkill || !this.stage) return false;
    this.startHost();
    return true;
  },
  startHost() {
    const server = Math.random() < 0.5 ? 0 : 1;
    this.phase = 'match';
    this.rematchMe = this.rematchThem = false;
    this.outEvents = [];
    Match.start({ mode: 'host', skills: [this.mySkill, this.theirSkill], stage: this.stage, server });
    this.send({ t: 'start', aspect: Layout.aspect, skills: [this.mySkill, this.theirSkill], stage: this.stage, server });
    this.lastRecv = this.now();
  },
  startGuest(d) {
    this.phase = 'match';
    this.rematchMe = this.rematchThem = false;
    this.stage = d.stage;
    Match.start({ mode: 'guest', skills: d.skills, stage: d.stage, aspect: d.aspect, server: d.server });
    GuestSync.reset();
    this.lastRecv = this.now();
  },

  /* ---- 試合中 ---- */
  applyInput(d) {
    const m = Physics.mallets[1];
    if (!m || this.phase !== 'match') return;
    m.remote = true;
    const c = Table.clampMallet(1, d.x, d.y, m.r);
    if (d.a && !m.active) { m.x = m.px = c.x; m.y = m.py = c.y; m.vx = m.vy = 0; }   // 現れた瞬間は、その場所へ移す（途中を飛んでパックをはじかない）
    m.active = !!d.a;
    m.tx = c.x; m.ty = c.y; m.rvx = d.vx; m.rvy = d.vy;
    this.lastInput = this.now();
  },
  sendPress() { this.send({ t: 'press' }); },

  update(dt) {
    if (!this.role || this.phase === 'idle' || this.phase === 'lobby') return;
    const now = this.now();
    this.pingAcc += dt;
    if (this.pingAcc > 1) { this.pingAcc = 0; this.send({ t: 'ping' }); }
    if (now - this.lastRecv > NET.LOST_TIMEOUT) { this.onLost(); return; }
    if (this.phase !== 'match' || !Match.active) return;
    if (this.isHost) {
      const m = Physics.mallets[1];                           // 届いた速さで、次が届くまで少し先へ進めておく
      if (m && m.remote && now - this.lastInput < 0.12) {
        const c = Table.clampMallet(1, m.tx + m.rvx * dt, m.ty + m.rvy * dt, m.r);
        m.tx = c.x; m.ty = c.y;
      }
    }
    this.sendAcc += dt;
    if (this.sendAcc < 1 / TUNE.NET_SEND_HZ) return;
    this.sendAcc = 0;
    if (this.isHost) {
      if (this.outEvents.length) { this.send({ t: 'ev', l: this.outEvents }); this.outEvents = []; }
      this.sendFast(this.snapshot());
    } else {
      const m = Physics.mallets[Match.me];
      if (m) this.sendFast({ t: 'in', x: r1(m.x), y: r1(m.y), vx: r1(m.vx), vy: r1(m.vy), a: m.active ? 1 : 0 });
    }
  },

  /* ホストの状態をまとめる（数は小数1桁に丸めて軽くする） */
  snapshot() {
    const s = Skills.state, m0 = Physics.mallets[0];
    return {
      t: 's', T: Math.round(this.now() * 1000) / 1000, st: Match.state, tm: Math.round(Match.timer * 100) / 100, it: Match.intro ? 1 : 0, sv: Match.server,
      sc: Match.score, g: [s.armed[0] ? 1 : Match.gauge[0], Match.gauge[1]].map(v => Math.round(v * 100) / 100),   // ホストが構え中なら、ゲストには満タンのまま見せる
      r: Match.rally, sec: Match.second ? 1 : 0,
      sg: Math.round(Stage.t * 1000) / 1000,
      m: [r1(m0.x), r1(m0.y), r1(m0.vx), r1(m0.vy), m0.active ? 1 : 0],
      p: Physics.pucks.map(p => [p.id, r1(p.x), r1(p.y), r1(p.vx), r1(p.vy),
        (p.ghost ? 1 : 0) | (p.vanish ? 2 : 0) | (p.boost > 1 ? 4 : 0) | (p.curve ? 8 : 0) | (p.skill === 'split' ? 16 : 0) |
        (p.zig ? 32 : 0) | (p.r < Table.pr * 0.9 ? 64 : 0),
        Math.round(p.vis * 100) / 100, p.lastHit]),
      k: [/* ホストの構え中の技は送らない */ 0, s.armed[1] || 0, r1(s.wall[0]), r1(s.wall[1]), r1(s.heavy[0]), r1(s.heavy[1]),
          r1(s.giant[0]), r1(s.giant[1]), r1(s.wide[0]), r1(s.wide[1]), r1(s.mirror[0]), r1(s.mirror[1])],
      fz: Skills.freeze > 0 || Match.hitStop > 0 ? 1 : 0,
    };
  },
  onMatchOver() {
    if (this.role !== 'host') return;
    if (this.outEvents.length) { this.send({ t: 'ev', l: this.outEvents }); this.outEvents = []; }
    this.send({ t: 'over', sc: Match.score });
    this.phase = 'result';
  },

  /* ---- 試合のあと ---- */
  requestRematch() {
    this.rematchMe = true;
    this.send({ t: 'rematch' });
    const b = $('#btn-rematch');
    b.disabled = true; b.textContent = '相手を待っています…';
    this.onRematchWish();
  },
  onRematchWish() {
    if (this.phase !== 'result') return;
    if (this.rematchThem && !this.rematchMe) $('#result-note').textContent = '相手が「もう一度」を選びました';
    if (this.rematchMe && this.rematchThem && this.isHost) { this.phase = 'select'; this.startHost(); }
  },
  requestReselect() { this.send({ t: 'reselect' }); this.goSelect(); },

  /* ---- 切断 ---- */
  onLost(bye) {
    if (this.leaving || !this.role || this.phase === 'idle') return;
    if (this.phase === 'lobby' && this.role === 'host' && !(this.ctl && this.ctl.open)) { this.ctl = null; return; }
    const wasMatch = Match.active;
    this.cleanup();
    if (wasMatch) Match.abort();
    UI.flow = 'online';
    Attract.start();
    UI.message('接続が切れました', bye ? '相手が対戦をやめました' : '相手との接続が切れました');
  },
  leave() {
    if (!this.role) return;
    this.leaving = true;
    this.send({ t: 'bye' });
    const peer = this.peer;
    setTimeout(() => { try { if (peer) peer.destroy(); } catch (e) { /* もう閉じている */ } }, 150);
    this.peer = null;
    this.cleanup(true);
    this.leaving = false;
  },
  cleanup(keepPeer) {
    this.op++;                                                // 進行中の接続の操作を無効にする
    clearTimeout(this.connTimer);
    const old = [this.ctl, this.st];
    this.ctl = this.st = null;
    for (const c of old) { try { if (c) c.close(); } catch (e) { /* もう閉じている */ } }
    if (!keepPeer && this.peer) { try { this.peer.destroy(); } catch (e) { /* もう閉じている */ } }
    this.peer = null;
    this.role = null; this.phase = 'idle';
    this.mySkill = this.theirSkill = this.stage = null;
    this.outEvents = [];
  },
};
function r1(v) { return Math.round(v * 10) / 10; }
/* 部屋コードをそろえる：全角→半角、小文字→大文字、英数字以外は消す */
function normCode(s) { return String(s || '').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, NET.CODE_LEN); }

Acts.createRoom = () => Net.createRoom();
Acts.joinRoom = () => Net.joinRoom($('#code-in').value);
Acts.copyInvite = () => {
  const url = Net.inviteUrl();
  const done = () => toast('招待リンクをコピーしました');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
  else fallbackCopy(url, done);
};
Acts.shareInvite = () => {
  if (navigator.share) navigator.share({ title: 'エアホッケーで対戦しよう', text: '部屋コード ' + Net.code, url: Net.inviteUrl() }).catch(() => {});
};
Acts.leaveLobby = () => { Net.cleanup(); UI.flow = 'cpu'; UI.show('title'); };
Acts.leaveOnline = () => Acts.toTitle();

function fallbackCopy(text, done) {
  const ta = el('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;left:-999px;top:0;';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('コピーできませんでした\n長押しでコピーしてください'); }
  ta.remove();
}
