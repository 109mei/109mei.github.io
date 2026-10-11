import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,getRoundInfo,resolveRound,validateChoice,chooseCpuChoice,assertMatch} from '../engine/game.mjs';
import {hashChoice,verifyChoice,secureNonce} from '../engine/commit.mjs';
import {TreasureController} from '../controller.mjs';
import {RoomTransport} from '../transport/room-transport.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('Independent mathematical oracle, side symmetry and complete games',()=>{
 for(let seed=0;seed<600;seed++){
 let s=createMatch(seed),sw=createMatch(seed),score=[0,0],charges=[2,2];
 for(let round=1;round<=8;round++){
 const prizes=getRoundInfo(s).prizes;
 assert.deepEqual([...prizes].sort((a,b)=>a-b),[2,3,5]);
 const choices=[0,1].map(p=>({lane:(seed*17+round*(p+1)+p)%3,style:charges[p]&&((seed+round+p)%3===0)?'greedy':'normal'}));
 for(let p=0;p<2;p++){
 const greedy=choices[p].style==='greedy',clash=choices[0].lane===choices[1].lane;
 charges[p]-=Number(greedy);
 score[p]=Math.max(0,score[p]+(clash?(greedy?-2:0):prizes[choices[p].lane]+(greedy?3:0)));
 }
 const out=resolveRound(s,choices);s=out.state;sw=resolveRound(sw,[...choices].reverse()).state;
 assert.deepEqual(s.scores,score);assert.deepEqual(s.charges,charges);assert.deepEqual(sw.scores,[...score].reverse());assert.deepEqual(sw.charges,[...charges].reverse());assert.equal(s.over,round===8);assert.equal(assertMatch(s),true);
 }
 assert.equal(s.round,9);assert.throws(()=>validateChoice(s,0,{lane:0,style:'normal'}));
 }
});
test('Exhaustion, invalid input, immutable snapshots and commitment binding',async()=>{
 let s=createMatch('audit');const prior=JSON.stringify(s);
 for(let r=0;r<2;r++)s=resolveRound(s,[{lane:0,style:'greedy'},{lane:1,style:'greedy'}]).state;
 assert.deepEqual(s.charges,[0,0]);assert.throws(()=>validateChoice(s,0,{lane:0,style:'greedy'}));
 for(const bad of [null,{}, {lane:NaN,style:'normal'},{lane:3,style:'normal'},{lane:0,style:'greedy',extra:1},{lane:'0',style:'normal'}])assert.throws(()=>validateChoice(s,0,bad));
 const altered=structuredClone(s);altered.history[0].delta[0]++;assert.throws(()=>assertMatch(altered));
 assert.equal(JSON.stringify(createMatch('audit')),prior);assert.ok(Object.isFrozen(s.history[0].choices[0]));
 const nonce=secureNonce(),choice={lane:1,style:'normal'},hash=await hashChoice('match-A',1,choice,nonce,0);
 for(const [match,round,c,n] of [['match-B',1,choice,nonce],['match-A',2,choice,nonce],['match-A',1,{lane:2,style:'normal'},nonce],['match-A',1,choice,secureNonce()]])assert.equal(await verifyChoice(hash,match,round,c,n,0),false);
 assert.equal(await verifyChoice(hash,'match-A',1,choice,nonce,1),false);
 const cpu=chooseCpuChoice(s,1);for(let lane=0;lane<3;lane++)assert.deepEqual(chooseCpuChoice(s,1,undefined,{lane}),cpu);
});
test('Counterexample: first rematch must allow locking',async()=>{
 const c=new TreasureController();c.mode='online';c.role='host';c.player=0;c.transport={send(){return true},setTurn(){},close(){}};
 c.acceptStart({matchId:'first',seed:'seed'});
 for(let i=0;i<8;i++){c.choices=[{lane:0,style:'normal'},{lane:1,style:'normal'}];c.resolve();}
 c.acceptStart({matchId:'second',seed:'seed2'});c.select(0);await c.lock();
 assert.notEqual(c.phase,'disconnected',`Rematch lock aborts at transport turn ${c.turn}: ${c.error}`);
});
test('Counterexample: slow honest hash verification must not disconnect',async()=>{
 const nativeCrypto=globalThis.crypto;let count=0;
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:a=>nativeCrypto.getRandomValues(a),subtle:{digest:async(...args)=>{const n=++count;if(n===4)await delay(100);return nativeCrypto.subtle.digest(...args)}}}});
 const cs=[new TreasureController(),new TreasureController()];const ts=cs.map((c,i)=>new RoomTransport({Peer:class{},validatePayload:(_,p)=>c.validPayload(p),onStatus:s=>{if(s.status==='disconnected')c.abort(s.reason)},onMessage:m=>{c.receive(m).catch(e=>c.abort(e.message))}}));
 for(let i=0;i<2;i++){
 Object.assign(ts[i],{closed:false,ready:true,role:i?'guest':'host',turn:0,tx:0,rx:0,session:'a'.repeat(32),conn:{open:true,close(){},send:m=>queueMicrotask(()=>ts[1-i]._receive(structuredClone(m)))}});
 Object.assign(cs[i],{mode:'online',role:i?'guest':'host',player:i,transport:ts[i],connected:true});cs[i].acceptStart({matchId:'race',seed:'race'});
 cs[i].onChange=c=>{if(c.phase==='reveal'&&c.game.round===2){c.next();c.select(0);void c.lock();}};
 }
 try{cs[0].select(0);cs[1].select(1);await Promise.all(cs.map(c=>c.lock()));await delay(200);assert.ok(cs.every(c=>c.phase!=='disconnected'),cs.map(c=>`${c.phase}: ${c.error}`).join(' | '));assert.ok(cs.every(c=>c.game.round===3&&c.barrierReady),'Both peers must pass the delayed round and resolve the next round');}
 finally{Object.defineProperty(globalThis,'crypto',{configurable:true,value:nativeCrypto});ts.forEach(t=>t.close());}
});
test('Local pass and CPU complete eight rounds and double lock is inert',async()=>{
 for(const mode of ['pass','cpu']){
 const c=new TreasureController();c.startLocal(mode);
 for(let r=1;r<=8;r++){
 if(mode==='pass')c.uncover();c.select(0);await Promise.all([c.lock(),c.lock()]);
 if(mode==='pass'){assert.equal(c.phase,'handover');assert.equal(c.selected,null);assert.equal(c.style,'normal');assert.equal(c.game.round,r);c.uncover();c.select(1);await Promise.all([c.lock(),c.lock()]);}
 assert.equal(c.phase,'reveal');assert.equal(c.game.round,r+1);assert.equal(c.game.history.length,r);c.next();
 }
 assert.equal(c.phase,'result');assert.equal(c.game.over,true);c.playAgain();assert.equal(c.game.round,1);assert.deepEqual(c.game.scores,[0,0]);
 }
});
test('Real protocol on mock wire completes three matches including agreed rematches',async()=>{
 const cs=[new TreasureController(),new TreasureController()],errors=[];
 const ts=cs.map((c,i)=>new RoomTransport({Peer:class{},validatePayload:(_,p)=>c.validPayload(p),onStatus:s=>{if(s.status==='disconnected'){errors.push(s.reason);c.abort(s.reason)}},onMessage:m=>{c.receive(m).catch(e=>{errors.push(e.message);c.abort(e.message)})}}));
 for(let i=0;i<2;i++){
 Object.assign(ts[i],{closed:false,ready:true,role:i?'guest':'host',turn:0,tx:0,rx:0,session:'b'.repeat(32),conn:{open:true,close(){},send:m=>setTimeout(()=>ts[1-i]._receive(structuredClone(m)),i?2:1)}});
 Object.assign(cs[i],{mode:'online',role:i?'guest':'host',player:i,transport:ts[i],connected:true,ready:[true,true]});cs[i].acceptStart({matchId:'full-run',seed:'full-run'});
 }
 try{
 for(let match=0;match<3;match++){
 let steps=0;
 while(!cs.every(c=>c.phase==='result')&&steps++<3000){
 for(const c of cs){if(c.phase==='choose'){c.select((c.game.round+c.player)%3);if(c.game.charges[c.player]>0)c.setStyle('greedy');void c.lock();}if(c.phase==='reveal')c.next();}
 await delay(1);if(errors.length)break;
 }
 assert.deepEqual(errors,[]);assert.ok(cs.every(c=>c.phase==='result'));assert.deepEqual(cs[0].game,cs[1].game);assert.equal(cs[0].game.history.length,8);
 if(match<2){const old=cs[0].matchId;cs.forEach(c=>c.playAgain());for(let n=0;n<100&&cs.some(c=>c.matchId===old);n++)await delay(2);assert.ok(cs.every(c=>c.matchId!==old));}
 }
 }finally{ts.forEach(t=>t.close());}
});
