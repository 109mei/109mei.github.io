// PeerJS のかわり（テスト用）：同じブラウザの別のページどうしを BroadcastChannel でつなぐ
(() => {
  const bc = new BroadcastChannel('mockpeer');
  const peers = new Map();             // このページの Peer（id → Peer）
  const conns = new Map();             // connId → Conn
  let seq = 0;
  const rid = () => Math.random().toString(36).slice(2, 10);
  class Emitter {
    constructor() { this.h = {}; }
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; }
    emit(e, ...a) { for (const f of this.h[e] || []) { try { f(...a); } catch (err) { console.error(err); } } }
  }
  class Conn extends Emitter {
    constructor(owner, remote, id, label) { super(); this.owner = owner; this.peer = remote; this.peerId = remote; this.connId = id; this.label = label; this.open = false; conns.set(id, this); }
    send(d) {
      if (!this.open) return;
      if (window.__netDrop && this.label === 'st' && Math.random() < window.__netDrop) return;   // わざと落とす（速さ優先の通信）
      const msg = { type: 'data', connId: this.connId, to: this.peerId, payload: JSON.parse(JSON.stringify(d)) };
      const lag = window.__netLag || 0;
      if (lag) setTimeout(() => bc.postMessage(msg), lag); else bc.postMessage(msg);
    }
    close() { if (!this.open && this.closed) return; this.open = false; this.closed = true; bc.postMessage({ type: 'close', connId: this.connId, to: this.peerId }); this.emit('close'); conns.delete(this.connId); }
  }
  class Peer extends Emitter {
    constructor(id, opts) {
      super();
      this.id = id || 'p-' + rid();
      this.destroyed = false;
      peers.set(this.id, this);
      bc.postMessage({ type: 'claim', id: this.id });
      this.taken = false;
      setTimeout(() => { if (this.taken) this.emit('error', { type: 'unavailable-id' }); else this.emit('open', this.id); }, 60);
    }
    connect(id, o = {}) {
      const c = new Conn(this, id, this.id + ':' + (++seq) + ':' + rid(), o.label);
      bc.postMessage({ type: 'conn', from: this.id, to: id, connId: c.connId, label: o.label });
      c.timer = setTimeout(() => { if (!c.open) this.emit('error', { type: 'peer-unavailable' }); }, 800);
      return c;
    }
    destroy() { this.destroyed = true; for (const c of [...conns.values()]) if (c.owner === this) c.close(); peers.delete(this.id); }
    reconnect() {}
  }
  bc.onmessage = ({ data: m }) => {
    if (m.type === 'claim') { if (peers.has(m.id)) bc.postMessage({ type: 'taken', id: m.id }); return; }
    if (m.type === 'taken') { for (const p of peers.values()) if (p.id === m.id) p.taken = true; return; }
    if (m.type === 'conn') {
      const p = peers.get(m.to); if (!p || p.destroyed) return;
      const c = new Conn(p, m.from, m.connId, m.label);
      p.emit('connection', c);
      bc.postMessage({ type: 'connack', connId: m.connId, to: m.from });
      setTimeout(() => { c.open = true; c.emit('open'); }, 20);
      return;
    }
    if (m.type === 'connack') { const c = conns.get(m.connId); if (c && peers.has(m.to)) { clearTimeout(c.timer); setTimeout(() => { c.open = true; c.emit('open'); }, 20); } return; }
    if (m.type === 'data') { const c = conns.get(m.connId); if (c && !c.closed && peers.has(m.to)) { if (!c.open) { c.open = true; c.emit('open'); } c.emit('data', m.payload); } return; }
    if (m.type === 'close') { const c = conns.get(m.connId); if (c && c.open && peers.has(m.to)) { c.open = false; c.emit('close'); conns.delete(m.connId); } }
  };
  window.addEventListener('pagehide', () => { for (const c of [...conns.values()]) c.close(); });
  window.Peer = Peer;
})();
