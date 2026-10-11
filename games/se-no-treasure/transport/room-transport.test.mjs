import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { RoomTransport, normalizeRoomCode, PROTOCOL } from './room-transport.mjs';
const tick = () => new Promise(r => setTimeout(r, 5));
class FakeConnection extends EventEmitter {
  open = false;
  send(data) { queueMicrotask(() => this.other.emit('data', structuredClone(data))); }
  close() { if (this.open) { this.open = false; this.emit('close'); this.other.open = false; this.other.emit('close'); } }
}
class FakePeer extends EventEmitter {
  static peers = new Map();
  constructor(id) { super(); this.id = id || Math.random().toString(); FakePeer.peers.set(this.id, this); queueMicrotask(() => this.emit('open', this.id)); }
  connect(id) { const a = new FakeConnection(), b = new FakeConnection(); a.other=b; b.other=a;
    queueMicrotask(() => { FakePeer.peers.get(id)?.emit('connection',b); a.open=b.open=true; b.emit('open'); a.emit('open'); }); return a; }
  destroy() { this.destroyed=true; FakePeer.peers.delete(this.id); }
  reconnect() {}
}
async function pair(t, timing = {}) {
  const hMessages=[],gMessages=[], hStatus=[],gStatus=[];
  const validatePayload = (type,payload) => !!payload && typeof payload.kind === 'string';
  const h=new RoomTransport({...timing,Peer:FakePeer,onMessage:m=>hMessages.push(m),onStatus:s=>hStatus.push(s),validatePayload});
  const g=new RoomTransport({...timing,Peer:FakePeer,onMessage:m=>gMessages.push(m),onStatus:s=>gStatus.push(s),validatePayload});
  t.after(()=>{h.close();g.close();});
  const code=await h.host(); await g.join(code); await tick();
  assert.equal(h.ready,true); assert.equal(g.ready,true);
  return {h,g,hMessages,gMessages,hStatus,gStatus};
}
test('room code normalization and malformed code rejection',()=> {
  assert.equal(normalizeRoomCode('abcd-2345'),'ABCD2345');
  for (const c of ['12345678','ABC','ABCDEFGI','<script>']) assert.throws(()=>normalizeRoomCode(c));
});
test('handshake, host state, symmetric commit action, monotonic turns',async t=>{
  const {h,g,hMessages,gMessages}=await pair(t);
  h.send('state',{kind:'start'}); await tick();
  assert.equal(gMessages[0].payload.kind,'start');
  h.setTurn(1); g.setTurn(1);
  h.send('action',{kind:'commit'}); g.send('action',{kind:'commit'}); await tick();
  assert.equal(hMessages[0].turn,1); assert.equal(gMessages[1].turn,1);
  assert.throws(()=>g.send('state',{kind:'bad'}));
  assert.throws(()=>g.setTurn(0));
});
test('replay closes the whole session; no automatic resumption',async t=>{
  const {h,g,hStatus}=await pair(t);
  const message={protocol:PROTOCOL,session:h.session,seq:1,turn:0,type:'action',payload:{kind:'commit'}};
  h._receive(message); h._receive(message);
  assert.equal(h.closed,true); assert.equal(g.closed,true);
  assert.equal(hStatus.at(-1).reason,'invalid-sequence');
});
test('stale turn is rejected and terminates match',async t=>{
  const {h,g,hStatus}=await pair(t); h.setTurn(2);
  g.send('action',{kind:'commit'}); await tick();
  assert.equal(hStatus.at(-1).reason,'invalid-turn-or-role');
});
test('third peer is rejected without disturbing match',async t=>{
  const {h,g}=await pair(t);
  const other=new FakePeer(); const conn=other.connect(h.peer.id);
  await tick(); assert.equal(h.ready,true); assert.equal(g.ready,true); other.destroy();conn.close();
});
test('hostile payload, protocol, session, sequence, oversized message rejected',async t=>{
  for (const edit of [
    x=>x.protocol='wrong', x=>x.session='f'.repeat(32), x=>x.seq=99,
    x=>x.payload={kind:'bad',text:'x'.repeat(17000)},x=>x.payload={},x=>x.extra=true
  ]) {
    const {h,hStatus}=await pair(t);
    const message={protocol:PROTOCOL,session:h.session,seq:1,turn:0,type:'action',payload:{kind:'commit'}};
    edit(message); h._receive(message); assert.equal(h.closed,true);assert.equal(hStatus.at(-1).status,'disconnected');
  }
});

test('silent remote times out without awarding or resuming',async t=>{
  const {h,g,hStatus}=await pair(t,{timeoutMs:25,heartbeatMs:5});
  g._receive=()=>{}; clearInterval(g.heartbeat);
  await new Promise(r=>setTimeout(r,50));
  assert.equal(h.ready,false);assert.equal(h.closed,true);
  assert.equal(hStatus.at(-1).reason,'connection-timeout');
});
test('explicit close stops both sides and clears readiness',async t=>{
  const {h,g,gStatus}=await pair(t);h.close();
  assert.equal(h.ready,false);assert.equal(g.ready,false);
  assert.equal(gStatus.at(-1).reason,'connection-lost');
});

test('diagnostics report phases without room identifiers or game payloads',async t=>{
  const events=[];
  const {h}=await pair(t,{onDiagnostic:event=>events.push(event)});
  assert.ok(events.some(e=>e.event==='handshake-complete'));
  const text=JSON.stringify(events);
  assert.equal(text.includes(h.code),false);
  assert.equal(text.includes(h.session),false);
  for(const e of events) assert.deepEqual(Object.keys(e).sort(),['event','role','stage','elapsedMs','ice','gathering','connection','signaling','channel','libraryOpen','secureContext','candidateCounts','candidateStats'].sort());
});
