/** PeerJS signaling + STUN only; no TURN, persistence, analytics, or media capture. */
export const TRANSPORT_VERSION = 'ringout-room/1';
const PREFIX = 'ringout-v1-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_BYTES = 32768;
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => object(x) && Object.keys(x).sort().join(',') === [...keys].sort().join(',');
const hex = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const nonce = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('');
export function normalizeRoomCode(code) {
  const result = String(code).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-HJ-NP-Z2-9]{12}$/.test(result)) throw new Error('invalid-room-code');
  return result;
}
export function createRoomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), n => ALPHABET[n % ALPHABET.length]).join('');
}
export class RoomTransport {
  constructor({ Peer = globalThis.Peer, onMessage = () => {}, onStatus = () => {}, timeoutMs = 25000, heartbeatMs = 5000, onDiagnostic = () => {} } = {}) {
    if (typeof Peer !== 'function') throw new Error('Peer constructor required');
    Object.assign(this, { Peer, onMessage, onStatus, timeoutMs, heartbeatMs, onDiagnostic });
    this.closed = true; this.ready = false; this.code = null; this.generation = 0;
  }
  createRoom() { this.close(); this.role = 'host'; this.code = createRoomCode(); this.session = nonce(); this.resumeToken = null; return this._start(); }
  host() { return this.createRoom(); }
  joinRoom(code) { const normalized = normalizeRoomCode(code); this.close(); this.role = 'guest'; this.code = normalized; this.session = null; this.resumeToken = nonce(); return this._start(); }
  join(code) { return this.joinRoom(code); }
  reconnect() {
    if (!this.code || !this.role) return Promise.reject(new Error('no-room-to-reconnect'));
    if (this.ready) return Promise.resolve(this.code);
    return this._start();
  }
  _diagnostic(event) {
    const pc = this.conn?.peerConnection;
    const info = { event, role: this.role, ice: pc?.iceConnectionState || null, gathering: pc?.iceGatheringState || null, connection: pc?.connectionState || null, signaling: pc?.signalingState || null, dataChannel: this.conn?.dataChannel?.readyState || null, localCandidates: this.localCandidates || 0, candidateTypes: { ...(this.candidateTypes || {}) }, remoteCandidates: this.remoteCandidates || 0, candidatePairs: this.candidatePairs || 0 };
    try { this.onDiagnostic(info); } catch {}
    if (globalThis.location && new URLSearchParams(globalThis.location.search).get('transportDebug') === '1') console.info('[ringout-transport]', JSON.stringify(info));
  }
  _status(status, reason) { this._diagnostic(reason || status); this.onStatus({ status, role: this.role, code: this.code, connected: this.ready, ...(reason ? { reason } : {}) }); }
  _dispose() {
    this.generation++; this.closed = true; this.ready = false;
    clearTimeout(this.timer); clearInterval(this.heartbeat);
    const conn = this.conn, peer = this.peer; this.conn = null; this.peer = null;
    const reject = this.rejectStart; this.rejectStart = null; reject?.(new Error('cancelled'));
    conn?.close(); peer?.destroy();
  }
  _start() {
    this._dispose(); this.closed = false; this.tx = 0; this.rx = 0;
    const generation = this.generation;
    this._status('connecting');
    return new Promise((resolve, reject) => {
      this.rejectStart = reject;
      try {
        this.peer = new this.Peer(this.role === 'host' ? PREFIX + this.code : undefined, {
          secure: true, debug: 0,
          config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });
      } catch { this._fail('network-error'); return; }
      const peer = this.peer;
      const active = () => !this.closed && generation === this.generation && peer === this.peer;
      this.timer = setTimeout(() => this._fail('connection-timeout'), this.timeoutMs);
      peer.on('open', () => {
        if (!active()) return;
        this.rejectStart = null; this._diagnostic('peer-open');
        if (this.role === 'host') { clearTimeout(this.timer); this._status('waiting'); }
        else this._bind(peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' }));
        resolve(this.code);
      });
      peer.on('connection', conn => {
        if (!active() || this.role !== 'host' || this.conn) { conn.close(); return; }
        this._bind(conn);
      });
      peer.on('error', error => { if (active()) this._fail(error?.type || 'network-error'); });
      peer.on('close', () => { if (active()) this._fail('peer-closed'); });
      peer.on('disconnected', () => {
        if (!active()) return;
        this._status('signaling-disconnected');
        // A live data channel does not depend on continued signaling.
        if (!peer.destroyed) { try { peer.reconnect(); } catch { if (!this.ready) this._fail('signaling-disconnected'); } }
      });
    });
  }
  _bind(conn) {
    this.conn = conn; this.channel = null; this.localCandidates = 0; this.candidateTypes = {host:0,srflx:0,prflx:0,relay:0,unknown:0}; this.remoteCandidates = 0; this.candidatePairs = 0;
    const pc = conn.peerConnection;
    if (pc?.addEventListener) {
      for (const event of ['iceconnectionstatechange', 'icegatheringstatechange', 'connectionstatechange', 'signalingstatechange']) pc.addEventListener(event, () => { if (!this.closed && this.conn === conn) { this._diagnostic(event); this._stats(conn); } });
      pc.addEventListener('icecandidate', event => { if (!this.closed && this.conn === conn) { if (event.candidate) { this.localCandidates++; const type = event.candidate.type; this.candidateTypes[Object.hasOwn(this.candidateTypes,type) ? type : 'unknown']++; } this._diagnostic(event.candidate ? 'local-candidate' : 'gathering-complete'); } });
      pc.addEventListener('icecandidateerror', () => { if (!this.closed && this.conn === conn) this._diagnostic('ice-candidate-error'); });
    }
    this._diagnostic('data-channel-connecting');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._fail('connection-timeout'), this.timeoutMs);
    const active = () => !this.closed && conn === this.conn;
    conn.on('open', () => {
      if (!active()) return;
      this._status('handshake');
      if (this.role === 'host') {
        this.channel = nonce();
        this._raw({ v: TRANSPORT_VERSION, type: 'hello', session: this.session, channel: this.channel, resume: Boolean(this.resumeToken) });
      }
    });
    conn.on('data', data => { if (active()) this._receive(data); });
    conn.on('close', () => { if (active()) this._fail('connection-lost'); });
    conn.on('error', () => { if (active()) this._fail('connection-error'); });
  }
  async _stats(conn) {
    if (!conn.peerConnection?.getStats) return;
    try {
      const stats = await conn.peerConnection.getStats();
      if (this.closed || this.conn !== conn) return;
      let remote = 0, pairs = 0;
      stats.forEach(x => { if (x.type === 'remote-candidate') remote++; if (x.type === 'candidate-pair') pairs++; });
      this.remoteCandidates = remote; this.candidatePairs = pairs; this._diagnostic('candidate-stats');
    } catch {}
  }
  _receive(data) {
    let serialized;
    try { serialized = JSON.stringify(data); } catch { return this._fail('invalid-message'); }
    if (!serialized || new TextEncoder().encode(serialized).length > MAX_BYTES || !object(data) || data.v !== TRANSPORT_VERSION) return this._fail('invalid-message');
    if (!this.ready) {
      if (this.role === 'guest' && exact(data, ['v','type','session','channel','resume']) && data.type === 'hello' && hex(data.session) && hex(data.channel) && typeof data.resume === 'boolean') {
        if (this.channel || (this.session && (this.session !== data.session || !data.resume))) return this._fail('room-identity-changed');
        this.session = data.session; this.channel = data.channel;
        this._raw({ v: TRANSPORT_VERSION, type: 'join', session: this.session, channel: this.channel, token: this.resumeToken });
        return;
      }
      if (this.role === 'host' && exact(data, ['v','type','session','channel','token']) && data.type === 'join' && data.session === this.session && data.channel === this.channel && hex(data.token)) {
        if (this.resumeToken && data.token !== this.resumeToken) return this._rejectGuest();
        this.resumeToken = data.token;
        if (this._raw({ v: TRANSPORT_VERSION, type: 'accepted', session: this.session, channel: this.channel })) this._connected(); return;
      }
      if (this.role === 'guest' && exact(data, ['v','type','session','channel']) && data.type === 'accepted' && data.session === this.session && data.channel === this.channel) { this._connected(); return; }
      return this._fail('invalid-handshake');
    }
    if (!exact(data, ['v','type','session','channel','seat','seq','payload']) || data.session !== this.session || data.channel !== this.channel || data.seat !== (this.role === 'host' ? 1 : 0) || !Number.isSafeInteger(data.seq) || data.seq !== this.rx + 1) return this._fail('invalid-envelope');
    this.rx = data.seq; this.lastReceived = Date.now();
    if (data.type === 'ping' || data.type === 'pong') {
      if (data.payload !== null) return this._fail('invalid-heartbeat');
      if (data.type === 'ping') this._send('pong', null);
    } else if (data.type === 'message') {
      try { this.onMessage(data.payload); } catch { this._fail('invalid-payload'); }
    } else this._fail('invalid-message-type');
  }
  _rejectGuest() {
    const conn = this.conn; this.conn = null; this.channel = null;
    clearTimeout(this.timer); conn?.close(); this._status('waiting', 'wrong-reconnect-peer');
  }
  _connected() {
    if (this.closed || !this.conn?.open || this.ready) return;
    clearTimeout(this.timer); this.ready = true; this.lastReceived = Date.now();
    this.heartbeat = setInterval(() => {
      if (Date.now() - this.lastReceived > this.timeoutMs) this._fail('connection-timeout');
      else this._send('ping', null);
    }, this.heartbeatMs);
    this._status('connected');
  }
  _raw(message) {
    if (this.closed || !this.conn?.open) return false;
    if (new TextEncoder().encode(JSON.stringify(message)).length > MAX_BYTES) throw new Error('message-too-large');
    try { this.conn.send(message); return true; } catch { this._fail('send-failed'); return false; }
  }
  _send(type, payload) {
    const next = this.tx + 1;
    const sent = this._raw({ v: TRANSPORT_VERSION, type, session: this.session, channel: this.channel, seat: this.role === 'host' ? 0 : 1, seq: next, payload });
    if (sent) this.tx = next;
    return sent;
  }
  send(payload) { return this.ready && !this.closed ? this._send('message', payload) : false; }
  _fail(reason) {
    if (this.closed) return;
    this._diagnostic('failure:' + reason);
    const reject = this.rejectStart; this.rejectStart = null;
    this._dispose(); reject?.(new Error(reason)); this._status('disconnected', reason);
  }
  close() { this._dispose(); this.code = null; this.role = null; this.session = null; this.resumeToken = null; this.channel = null; }
}
export function createTransport(options) { return new RoomTransport(options); }
