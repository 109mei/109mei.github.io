/** A two-seat, host-authoritative transport. No persistence or media capture. */
export const PROTOCOL = 'pocket-duel/1';
const PREFIX = 'pocket-duel-v1-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_BYTES = 16384;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = x => Number.isSafeInteger(x) && x >= 0;
const exact = (x, fields) => object(x) && Object.keys(x).sort().join(',') === [...fields].sort().join(',');
const nonce = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2,'0')).join('');
export function normalizeRoomCode(code) {
  const value = String(code).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(value)) throw new Error('invalid-room-code');
  return value;
}
export function createRoomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), n => ALPHABET[n % 32]).join('');
}
export class RoomTransport {
  constructor({ Peer, onStatus = () => {}, onMessage = () => {}, validatePayload = () => false, timeoutMs = 20000, heartbeatMs = 5000, onDiagnostic = null } = {}) {
    if (typeof Peer !== 'function') throw new Error('Peer constructor required');
    Object.assign(this, { Peer, onStatus, onMessage, validatePayload, timeoutMs, heartbeatMs, onDiagnostic });
    this.closed = true;
  }
  async host() { return this._start('host', createRoomCode()); }
  async join(code) { return this._start('guest', normalizeRoomCode(code)); }
  async _start(role, code) {
    this.close();
    Object.assign(this, { closed: false, role, code, ready: false, turn: 0, tx: 0, rx: 0, session: role === 'host' ? nonce() : null, conn: null });
    this.candidateCounts = null; this.candidateStats = null;
    this.startedAt = Date.now(); this.stage = 'signaling';
    this._diagnostic('start');
    this.onStatus({ status: 'connecting', role, code });
    return new Promise((resolve, reject) => {
      this.rejectStart = reject;
      // Explicit STUN-only: never silently consume a paid relay.
      this.peer = new this.Peer(role === 'host' ? PREFIX + code : undefined, {
        secure: true, debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });
      const peer = this.peer;
      this.timer = setTimeout(() => this._fail('connection-timeout'), this.timeoutMs);
      peer.on('open', () => {
        if (this.closed || peer !== this.peer) return;
        this.rejectStart = null;
        this.stage = role === 'host' ? 'waiting-for-guest' : 'peer-connection';
        this._diagnostic('signaling-open');
        if (role === 'host') { clearTimeout(this.timer); this.onStatus({ status: 'waiting', role, code }); }
        else this._bind(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
        resolve(code);
      });
      peer.on('connection', conn => {
        if (this.closed || role !== 'host' || this.conn) { conn.close(); return; }
        this._diagnostic('incoming-connection');
        this._bind(conn);
      });
      peer.on('error', error => { if (!this.closed && peer === this.peer) this._fail(error.type || 'network-error'); });
      peer.on('disconnected', () => {
        if (this.closed || peer !== this.peer) return;
        // Signaling loss does not imply a healthy data channel is lost.
        this._diagnostic('signaling-disconnected');
        this.onStatus({ status: 'signaling-disconnected', connected: this.ready });
        if (!peer.destroyed) { try { peer.reconnect(); } catch { this._fail('signaling-disconnected'); } }
      });
      peer.on('close', () => { if (!this.closed && peer === this.peer) this._fail('peer-closed'); });
    });
  }
  _bind(conn) {
    this.conn = conn; this.stage = 'data-channel';
    this.candidateCounts = { host: 0, srflx: 0, prflx: 0, relay: 0, unknown: 0 };
    this.candidateStats = null;
    this._diagnostic('binding-connection');
    const pc = conn.peerConnection;
    if (pc?.addEventListener) {
      for (const event of ['iceconnectionstatechange','icegatheringstatechange','connectionstatechange','signalingstatechange']) {
        pc.addEventListener(event, () => {
          if (!this.closed && this.conn === conn) {
            this._diagnostic(event);
            if (event === 'icegatheringstatechange' && pc.iceGatheringState === 'complete') this._candidateSummary(conn);
          }
        });
      }
      pc.addEventListener('icecandidate', event => {
        if (this.closed || this.conn !== conn) return;
        if (event.candidate) {
          const type = event.candidate.type;
          const key = Object.hasOwn(this.candidateCounts, type) ? type : 'unknown';
          this.candidateCounts[key]++;
          this._diagnostic('local-candidate-count');
        } else this._diagnostic('local-candidates-complete');
      });
      pc.addEventListener('icecandidateerror', () => { if (!this.closed && this.conn === conn) this._diagnostic('ice-candidate-error'); });
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._fail('connection-timeout'), this.timeoutMs);
    conn.on('open', () => {
      if (this.closed || this.conn !== conn) return;
      this.stage = 'handshake'; this._diagnostic('data-channel-open');
      if (this.role === 'host') this._raw({ protocol: PROTOCOL, type: 'welcome', session: this.session });
    });
    conn.on('data', data => { if (!this.closed && this.conn === conn) this._receive(data); });
    conn.on('close', () => { if (!this.closed && this.conn === conn) this._fail('connection-lost'); });
    conn.on('error', () => { if (!this.closed && this.conn === conn) this._fail('connection-error'); });
  }
  async _candidateSummary(conn) {
    const pc = conn.peerConnection;
    if (!pc?.getStats) return;
    try {
      const stats = await pc.getStats();
      if (this.closed || this.conn !== conn) return;
      const counts = { local: 0, remote: 0, pairs: 0 };
      stats.forEach(stat => {
        if (stat.type === 'local-candidate') counts.local++;
        else if (stat.type === 'remote-candidate') counts.remote++;
        else if (stat.type === 'candidate-pair') counts.pairs++;
      });
      this.candidateStats = counts;
      this._diagnostic('candidate-stat-counts');
    } catch { this._diagnostic('candidate-stats-unavailable'); }
  }
  _diagnostic(event) {
    const pc = this.conn?.peerConnection;
    const entry = { event, role: this.role, stage: this.stage, elapsedMs: Date.now() - (this.startedAt || Date.now()),
      ice: pc?.iceConnectionState || null, gathering: pc?.iceGatheringState || null,
      connection: pc?.connectionState || null, signaling: pc?.signalingState || null,
      channel: this.conn?.dataChannel?.readyState || null, libraryOpen: Boolean(this.conn?.open),
      secureContext: globalThis.isSecureContext ?? null,
      candidateCounts: this.candidateCounts ? { ...this.candidateCounts } : null,
      candidateStats: this.candidateStats ? { ...this.candidateStats } : null };
    // Deliberately omit codes, peer IDs, candidates, addresses, SDP, and payloads.
    try { this.onDiagnostic?.(entry); } catch { /* diagnostics never affect play */ }
    const debug = globalThis.location && new URLSearchParams(globalThis.location.search).get('transportDebug') === '1';
    if (debug) console.info('[treasure-transport] ' + JSON.stringify(entry));
  }
  _receive(data) {
    // PeerJS JSON deserialization has already occurred; limit before using data.
    let raw;
    try { raw = JSON.stringify(data); } catch { return this._fail('invalid-message'); }
    if (!raw || raw.length > MAX_BYTES || !object(data) || data.protocol !== PROTOCOL) return this._fail('invalid-message');
    if (!this.ready) {
      this._diagnostic('handshake-received');
      if (!exact(data, ['protocol','type','session']) || !/^[a-f0-9]{32}$/.test(data.session)) return this._fail('invalid-handshake');
      if (this.role === 'guest' && data.type === 'welcome') {
        this.session = data.session;
        this._raw({ protocol: PROTOCOL, type: 'ready', session: this.session });
        this._connected();
      } else if (this.role === 'host' && data.type === 'ready' && data.session === this.session) this._connected();
      else this._fail('invalid-handshake');
      return;
    }
    if (!exact(data, ['protocol','session','seq','turn','type','payload']) || data.session !== this.session || !integer(data.seq) || data.seq !== this.rx + 1 || !integer(data.turn)) return this._fail('invalid-sequence');
    this.rx = data.seq;
    this.lastReceived = Date.now();
    if (data.type === 'ping' || data.type === 'pong') {
      if (data.payload !== null) return this._fail('invalid-heartbeat');
      if (data.type === 'ping') this._send('pong', null, this.turn);
      return;
    }
    const allowed = data.type === 'action' || (this.role === 'guest' && data.type === 'state');
    const turnOK = data.type === 'action' ? data.turn === this.turn : data.turn >= this.turn;
    if (!allowed || !turnOK) return this._fail('invalid-turn-or-role');
    let valid = false;
    try { valid = this.validatePayload(data.type, data.payload, data.turn) === true; } catch { /* reject caller parser errors */ }
    if (!valid) return this._fail('invalid-payload');
    this.onMessage({ type: data.type, payload: data.payload, turn: data.turn, role: this.role === 'host' ? 'guest' : 'host' });
  }
  _connected() {
    this.stage = 'connected'; this._diagnostic('handshake-complete');
    clearTimeout(this.timer); this.ready = true; this.lastReceived = Date.now();
    this.heartbeat = setInterval(() => {
      if (Date.now() - this.lastReceived > this.timeoutMs) this._fail('connection-timeout');
      else this._send('ping', null, this.turn);
    }, this.heartbeatMs);
    this.onStatus({ status: 'connected', role: this.role, code: this.code });
  }
  setTurn(turn) {
    if (!integer(turn) || turn < this.turn) throw new Error('invalid-turn');
    this.turn = turn;
  }
  send(type, payload, { turn = this.turn } = {}) {
    if (!this.ready || this.closed) return false;
    if ((type !== 'action' && !(this.role === 'host' && type === 'state')) || !integer(turn) || turn !== this.turn || this.validatePayload(type, payload, turn) !== true) throw new Error('invalid-outbound-message');
    return this._send(type, payload, turn);
  }
  _send(type, payload, turn) {
    return this._raw({ protocol: PROTOCOL, session: this.session, seq: ++this.tx, turn, type, payload });
  }
  _raw(message) {
    if (this.closed || !this.conn?.open) { this._diagnostic('send-not-open'); return false; }
    if (JSON.stringify(message).length > MAX_BYTES) throw new Error('message-too-large');
    try { this.conn.send(message); return true; } catch { this._fail('send-failed'); return false; }
  }
  _fail(reason) {
    if (this.closed) return;
    this._diagnostic('failure:' + reason);
    const reject = this.rejectStart;
    this.rejectStart = null;
    this.close();
    reject?.(new Error(reason));
    this.onStatus({ status: 'disconnected', reason, recoverable: true });
  }
  close() {
    const reject = this.rejectStart;
    this.rejectStart = null;
    this.closed = true; this.ready = false;
    clearTimeout(this.timer); clearInterval(this.heartbeat);
    const conn = this.conn; const peer = this.peer;
    this.conn = null; this.peer = null;
    conn?.close(); peer?.destroy();
    reject?.(new Error('cancelled'));
  }
}
