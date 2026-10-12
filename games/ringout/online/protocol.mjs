/** Transport-independent, two-peer lockstep. Requires an authenticated, ordered peer
 * channel binding peer to 1-owner. Commit/reveal prevents ordinary late selection,
 * not a modified browser, abort cheating, collusion, or denial of service. */
import {createMatch, resolveTurn} from '../core/game.mjs?v=d101451970d8a1b06540243a';
export const PROTOCOL_VERSION = 'flick-lockstep-1';
export const LIMITS = Object.freeze({messageBytes:16000, history:12, timeoutMs:60000, queuedOperations:64});
const copy = x => structuredClone(x);
const hex = bytes => Array.from(bytes, b=>b.toString(16).padStart(2,'0')).join('');
const hashRE = /^[0-9a-f]{64}$/;
const idRE = /^[A-Za-z0-9_-]{8,80}$/;
function canonical(x) {
 if(x===null || typeof x!=='object') return JSON.stringify(x);
 if(Array.isArray(x)) return '['+x.map(canonical).join(',')+']';
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
export async function digest(value, cryptoImpl=globalThis.crypto) {
 return hex(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))));
}
function exact(x, keys) { return x && typeof x==='object' && !Array.isArray(x) && Object.keys(x).sort().join(',')===keys.slice().sort().join(','); }
function choice(state,owner,input) {
 if(!input || typeof input!=='object') throw Error('invalid-choice');
 const shot=input.shot;
 if(!exact(shot,['diskId','angle','power']) || !state.disks.some(d=>d.id===shot.diskId&&d.owner===owner&&d.alive) || !Number.isFinite(shot.angle)||Math.abs(shot.angle)>1e6||!Number.isFinite(shot.power)||shot.power<.1||shot.power>1) throw Error('invalid-own-shot');
 let placement=null;
 if(input.placement!=null) {
  const p=input.placement;
  if(!exact(p,['anchorId','x','y','angle']) || !state.disks.some(d=>d.id===p.anchorId&&d.owner===owner&&d.alive) || ![p.x,p.y,p.angle].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6)) throw Error('invalid-own-placement');
  placement={anchorId:p.anchorId,x:p.x,y:p.y,angle:p.angle};
 }
 return {shot:{diskId:shot.diskId,angle:shot.angle,power:shot.power},placement};
}
export async function createOnlineMatch({owner,matchId,count=3,seed=1,send=()=>{},onChange=()=>{},onResolved=()=>{},cryptoImpl=globalThis.crypto,now=()=>Date.now()}={}) {
 if(![0,1].includes(owner)||!idRE.test(matchId)) throw Error('invalid-session');
 if(!cryptoImpl?.subtle || !cryptoImpl?.getRandomValues) throw Error('secure-crypto-required');
 const peer=1-owner, config={count,seed,maxTurns:12};
 let state=createMatch(config), epoch=0, revision=0, connected=true, ready=false, error=null, phase='waiting-peer', lastActivity=now();
 let commits=[null,null], reveals=[null,null], localSecret=null, pending=null, ledger=[], ackHash=null, offered=null, requested=false, rematch=[false,false], queue=Promise.resolve();
 let needsResync=false, queued=0, disposed=false, lifecycle=0, nextReady=[true,true];
 let stateHash=await digest(state,cryptoImpl), initialHash=stateHash;
 const binding = (turn,rev,who,command,nonce) => ({v:PROTOCOL_VERSION,matchId,epoch,turn,revision:rev,owner:who,command,nonce});
 function view(){return {owner,matchId,epoch,revision,state:copy(state),stateHash,phase,connected,ready,error,localSubmitted:!!commits[owner],peerCommitted:!!commits[peer],resyncAvailable:!!offered,nextReady:copy(nextReady),rematch:copy(rematch)};}
 function notify(){if(!disposed)onChange(view());}
 function wire(type,payload={},rev=revision,turn=state.turn){return {v:PROTOCOL_VERSION,matchId,epoch,owner,type,revision:rev,turn,payload};}
 function emit(type,payload={},rev=revision,turn=state.turn){ if(disposed||!connected)return; const text=JSON.stringify(wire(type,payload,rev,turn)); if(new TextEncoder().encode(text).length>LIMITS.messageBytes)throw Error('message-too-large'); send(text); }
 function activity(){lastActivity=now();}
 function serial(fn){if(disposed)return Promise.reject(Error('session-closed'));if(queued>=LIMITS.queuedOperations)return Promise.reject(Error('operation-queue-full'));queued++;const result=queue.then(()=>{if(disposed)throw Error('session-closed');return fn();}).finally(()=>{queued--;});queue=result.catch(()=>{});return result;}
 function fail(reason){error=reason;phase='paused';notify();return {ok:false,reason};}
 async function advance(){
  if(disposed||!connected||error||!ready||needsResync)return;
  if(commits.every(Boolean)&&localSecret&&!reveals[owner]) {
   reveals[owner]=copy(localSecret); emit('reveal',localSecret); phase='revealing';
  }
  if(reveals.every(Boolean)&&!pending){
   const result=resolveTurn(state,reveals.map(r=>r.command));
   const hash=await digest(result.state,cryptoImpl);if(disposed)return;
   pending={result,hash,record:{revision,turn:state.turn,commits:copy(commits),reveals:copy(reveals),hash}};
   if(connected&&!needsResync&&!error){phase='verifying';emit('state-hash',{hash});}
  }
  if(disposed||!connected||needsResync||error)return;
  if(pending&&ackHash){
   if(ackHash!==pending.hash){fail('state-hash-mismatch');return;}
   const result=pending.result;ledger.push(pending.record);state=result.state;stateHash=pending.hash;revision++;
   commits=[null,null];reveals=[null,null];localSecret=null;pending=null;ackHash=null;
   nextReady=[false,false];phase=state.outcome?'finished':'waiting-next';onResolved(copy(result));
  }
  notify();
 }
 async function reset(){nextReady=[true,true];epoch++;revision=0;state=createMatch(config);stateHash=initialHash;ready=false;error=null;phase='waiting-peer';commits=[null,null];reveals=[null,null];localSecret=null;pending=null;ledger=[];ackHash=null;offered=null;requested=false;rematch=[false,false];emit('hello',{config,hash:stateHash});notify();}
 async function receiveInner(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMITS.messageBytes)return {ok:false,reason:'message-too-large-or-not-string'};
  let m;try{m=JSON.parse(text);}catch{return {ok:false,reason:'invalid-json'};}
  if(!exact(m,['v','matchId','epoch','owner','type','revision','turn','payload'])||m.v!==PROTOCOL_VERSION||m.matchId!==matchId||m.owner!==peer||m.epoch!==epoch||!Number.isInteger(m.revision)||m.revision<0||m.revision>12||m.turn!==m.revision+1)return {ok:false,reason:'invalid-envelope'};
  const p=m.payload;
  if(m.type==='resync-request') {if(!exact(p,[]))return {ok:false,reason:'invalid-resync-request'};emit('snapshot',{config,initialHash,ledger:copy(ledger),hash:stateHash});return {ok:true};}
  if(m.type==='snapshot') {if(!requested||!exact(p,['config','initialHash','ledger','hash'])||!Array.isArray(p.ledger)||p.ledger.length>12||p.ledger.length!==m.revision)return {ok:false,reason:'unsolicited-or-invalid-snapshot'};offered=copy(p);notify();return {ok:true};}
  if(m.revision<revision){const old=ledger[m.revision];let duplicate=false;if(old&&m.type==='commit')duplicate=exact(p,['hash'])&&p.hash===old.commits[peer];if(old&&m.type==='reveal')duplicate=canonical(p)===canonical(old.reveals[peer]);if(old&&m.type==='state-hash')duplicate=exact(p,['hash'])&&p.hash===old.hash;return {ok:duplicate,reason:duplicate?'duplicate':'stale-message'};}
  if(m.revision!==revision)return {ok:false,reason:'future-message'};
  if(m.type==='hello'){
   if(!exact(p,['config','hash'])||canonical(p.config)!==canonical(config)||p.hash!==stateHash)return fail('initial-state-mismatch');
   const first=!ready;ready=true;if(first&&!error&&!needsResync)phase=state.outcome?'finished':'choosing';if(first)emit('hello',{config,hash:stateHash});activity();notify();return {ok:true};
  }
  if(m.type==='next-ready'){if(!exact(p,[])||revision===0||state.outcome)return {ok:false,reason:'invalid-next-ready'};nextReady[peer]=true;if(nextReady.every(Boolean)&&!error&&!needsResync)phase='choosing';activity();notify();return {ok:true};}
  if(m.type==='rematch'){
   if(!exact(p,[])||!state.outcome)return {ok:false,reason:'rematch-not-finished'};rematch[peer]=true;if(rematch.every(Boolean))await reset();else notify();return {ok:true};
  }
  if(!ready||!connected||error||!nextReady.every(Boolean)||state.outcome)return {ok:false,reason:'not-playing'};
  if(m.type==='commit'){
   if(!exact(p,['hash'])||!hashRE.test(p.hash))return {ok:false,reason:'invalid-commit'};
   if(commits[peer]&&commits[peer]!==p.hash)return fail('conflicting-commit');commits[peer]=p.hash;
  }else if(m.type==='reveal'){
   if(!commits.every(Boolean)||!exact(p,['command','nonce'])||!hashRE.test(p.nonce))return {ok:false,reason:'premature-or-invalid-reveal'};
   let cmd;try{cmd=choice(state,peer,p.command);}catch{return fail('invalid-peer-choice');}
   if(canonical(cmd)!==canonical(p.command)||await digest(binding(state.turn,revision,peer,cmd,p.nonce),cryptoImpl)!==commits[peer])return fail('commitment-mismatch');
   if(reveals[peer]&&canonical(reveals[peer])!==canonical(p))return fail('conflicting-reveal');reveals[peer]=copy(p);
  }else if(m.type==='state-hash'){
   if(!exact(p,['hash'])||!hashRE.test(p.hash)||!commits.every(Boolean))return {ok:false,reason:'invalid-state-hash'};
   if(ackHash&&ackHash!==p.hash)return fail('conflicting-state-hash');ackHash=p.hash;
  }else return {ok:false,reason:'unknown-message'};
  activity();await advance();return {ok:true};
 }
 return {
  getView:view,
  start(){emit('hello',{config,hash:stateHash});notify();},
  receive:text=>{if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMITS.messageBytes)return Promise.resolve({ok:false,reason:'message-too-large-or-not-string'});return serial(()=>receiveInner(text));},
  submit:input=>serial(async()=>{
   if(!connected||!ready||needsResync||error||!nextReady.every(Boolean)||state.outcome||commits[owner])throw Error('cannot-submit');
   const command=choice(state,owner,input),nonce=hex(cryptoImpl.getRandomValues(new Uint8Array(32)));
   localSecret={command,nonce};commits[owner]=await digest(binding(state.turn,revision,owner,command,nonce),cryptoImpl);
   if(disposed)return view();if(!connected||needsResync||error){notify();return view();}phase='committed';emit('commit',{hash:commits[owner]});activity();await advance();return view();
  }),
  setConnected(value){connected=!!value;if(!connected){lifecycle++;needsResync=true;phase='disconnected';}else if(!error)phase='paused';notify();},
  tick(time=now()){if(!state.outcome&&time-lastActivity>=LIMITS.timeoutMs){lifecycle++;error='peer-timeout';phase='paused';notify();}return view();},
  requestResync(){requested=true;emit('resync-request');},
  acceptResync:()=>serial(async()=>{
   if(!offered)throw Error('no-snapshot');const snap=offered, generation=lifecycle;
   if(canonical(snap.config)!==canonical(config)||snap.initialHash!==initialHash||snap.ledger.length<ledger.length||snap.ledger.length>ledger.length+1||canonical(snap.ledger.slice(0,ledger.length))!==canonical(ledger)||(snap.ledger.length>ledger.length&&(!pending||canonical(snap.ledger.at(-1))!==canonical(pending.record))))throw Error('snapshot-not-mutually-verified-history');
   let rebuilt=createMatch(config);
   for(const record of snap.ledger){rebuilt=resolveTurn(rebuilt,record.reveals.map(r=>r.command)).state;if(await digest(rebuilt,cryptoImpl)!==record.hash)throw Error('invalid-snapshot-hash');}
   if(await digest(rebuilt,cryptoImpl)!==snap.hash)throw Error('invalid-snapshot-hash');
   if(disposed||!connected||generation!==lifecycle)throw Error('resync-interrupted');
   // Only restore a mutually acknowledged boundary. Never discard an existing seal.
   if(snap.ledger.length>ledger.length){const result=pending.result;state=result.state;stateHash=pending.hash;ledger.push(pending.record);revision++;nextReady=[false,false];commits=[null,null];reveals=[null,null];localSecret=null;pending=null;ackHash=null;onResolved(copy(result));}
   state=rebuilt;stateHash=snap.hash;offered=null;requested=false;error=null;ready=true;needsResync=false;activity();phase=state.outcome?'finished':commits[owner]?'committed':nextReady.every(Boolean)?'choosing':'waiting-next';if(nextReady[owner]&&revision>0&&!state.outcome)emit('next-ready');ackHash=null;if(commits[owner])emit('commit',{hash:commits[owner]});if(reveals[owner])emit('reveal',reveals[owner]);if(pending)emit('state-hash',{hash:pending.hash});await advance();return view();
  }),
  exportSnapshot(){return {config:copy(config),initialHash,ledger:copy(ledger),hash:stateHash};},
  close(){lifecycle++;disposed=true;connected=false;localSecret=null;reveals=[null,null];offered=null;phase='closed';},
  readyNext:()=>serial(async()=>{if(!connected||needsResync||error||!ready||revision===0||state.outcome)throw Error('cannot-ready-next');nextReady[owner]=true;emit('next-ready');phase=nextReady.every(Boolean)?'choosing':'waiting-next';activity();notify();return view();}),
  proposeRematch:()=>serial(async()=>{if(!state.outcome)throw Error('rematch-not-finished');rematch[owner]=true;emit('rematch');if(rematch.every(Boolean))await reset();else notify();})
 };
}
