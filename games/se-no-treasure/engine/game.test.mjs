import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,getRoundInfo,validateChoice,resolveRound,chooseCpuChoice,assertMatch} from './game.mjs';
import {hashChoice,verifyChoice,secureNonce} from './commit.mjs';
const action=(lane,style='normal')=>({lane,style});
const clone=o=>JSON.parse(JSON.stringify(o));
const all=Array.from({length:3},(_,lane)=>['normal','greedy'].map(style=>action(lane,style))).flat();
test('all 36 simultaneous action combinations and side symmetry',()=>{
  for(const a of all)for(const b of all){
    const initial=createMatch('combinations'), before=JSON.stringify(initial), prizes=getRoundInfo(initial).prizes;
    const {state,events}=resolveRound(initial,[a,b]);
    const clash=a.lane===b.lane;
    const expected=[a,b].map(c=>clash?0:prizes[c.lane]+(c.style==='greedy'?3:0));
    assert.deepEqual(state.scores,expected);assert.equal(events.clash,clash);
    assert.deepEqual(state.charges,[a,b].map(c=>c.style==='greedy'?1:2));
    assert.equal(JSON.stringify(initial),before);
    const swapped=resolveRound(initial,[b,a]).state;
    assert.deepEqual(swapped.scores,[...state.scores].reverse());
    assert.deepEqual(swapped.charges,[...state.charges].reverse());
    assert.ok(Object.isFrozen(state)&&Object.isFrozen(state.history[0].choices[0]));
  }
});
test('greedy clash charges, actual loss, zero floor and exhaustion',()=>{
  let state=createMatch(1);
  state=resolveRound(state,[action(0),action(1)]).state;
  const before=[...state.scores];
  state=resolveRound(state,[action(2,'greedy'),action(2,'greedy')]).state;
  assert.deepEqual(state.scores,before.map(n=>Math.max(0,n-2)));
  state=resolveRound(state,[action(2,'greedy'),action(2,'greedy')]).state;
  assert.deepEqual(state.charges,[0,0]);assert.deepEqual(state.scores,before.map(n=>Math.max(0,n-4)));
  assert.throws(()=>resolveRound(state,[action(0,'greedy'),action(1)]));
  assert.throws(()=>validateChoice(state,1,action(0,'greedy')));
});
test('strict invalid seeds, players, choices, snapshots and round replay',()=>{
  for(const seed of [null,undefined,{},[],true,NaN,Infinity,-1,1.2,2**32,'','x'.repeat(129)])assert.throws(()=>createMatch(seed));
  const s=createMatch('valid');
  for(const c of [null,undefined,{},[],0,'0',{lane:0},{style:'normal'},{lane:-1,style:'normal'},{lane:3,style:'normal'},{lane:0.5,style:'normal'},{lane:'1',style:'normal'},{lane:0,style:'GREEDY'},{lane:0,style:'normal',score:99}]) assert.throws(()=>validateChoice(s,0,c));
  for(const p of [-1,2,null,'0',NaN])assert.throws(()=>validateChoice(s,p,action(0)));
  for(const cs of [null,{},[],[action(0)],[action(0),action(1),action(2)],Array(2)])assert.throws(()=>resolveRound(s,cs));
  for(const [key,value] of [['round',2],['scores',[99,0]],['charges',[3,2]],['over',true],['outcome','draw'],['version',2],['history',[{}]]])assert.throws(()=>assertMatch({...clone(s),[key]:value}));
  const holes=clone(s);holes.scores.length=10;assert.throws(()=>assertMatch(holes));
  const played=resolveRound(s,[action(0),action(1)]).state;
  const tampered=clone(played);tampered.history[0].scores[0]++;assert.throws(()=>assertMatch(tampered));
  let end=s;for(let i=0;i<8;i++)end=resolveRound(end,[action(0),action(0)]).state;
  assert.equal(end.over,true);assert.equal(end.round,9);assert.equal(end.outcome,'draw');assert.equal(end.history.length,8);
  assert.deepEqual(getRoundInfo(end).prizes,[]);
  assert.throws(()=>resolveRound(end,[action(0),action(1)]));assert.throws(()=>chooseCpuChoice(end,1));
});
test('1000 seeded match property cases: deterministic, bounded, symmetric, no mutation',()=>{
  for(let sample=0;sample<1000;sample++){
    let s=createMatch(sample),repeat=createMatch(sample),swapped=createMatch(sample);
    for(let round=1;round<=8;round++){
      assert.deepEqual([...getRoundInfo(s).prizes].sort((a,b)=>a-b),[2,3,5]);
      const a=chooseCpuChoice(s,0,'A'+sample),b=chooseCpuChoice(s,1,'B'+sample),before=JSON.stringify(s);
      assert.deepEqual(chooseCpuChoice(s,0,'A'+sample),a);
      const next=resolveRound(s,[a,b]);
      assert.equal(JSON.stringify(s),before);
      repeat=resolveRound(repeat,[a,b]).state;swapped=resolveRound(swapped,[b,a]).state;s=next.state;
      assert.deepEqual(s,repeat);assert.deepEqual(s.scores,[...swapped.scores].reverse());assert.deepEqual(s.charges,[...swapped.charges].reverse());
      assert.ok(s.scores.every(n=>Number.isInteger(n)&&n>=0&&n<=64));
      assert.ok(s.charges.every(n=>Number.isInteger(n)&&n>=0&&n<=2));assert.equal(s.history.length,round);
      assertMatch(clone(s));
    }
    assert.ok(s.over);assert.equal(s.outcome,s.scores[0]===s.scores[1]?'draw':s.scores[0]>s.scores[1]?'player0':'player1');
  }
});
test('commit canonical hashing, nonce entropy format, domain separation, tampering and replay',async()=>{
  const nonce=secureNonce(),nonce2=secureNonce();assert.match(nonce,/^[0-9a-f]{64}$/);assert.notEqual(nonce,nonce2);
  const c=action(1,'greedy'),hash=await hashChoice('match-A',1,c,nonce,0);
  assert.match(hash,/^[0-9a-f]{64}$/);assert.equal(hash,await hashChoice('match-A',1,{style:'greedy',lane:1},nonce,0));
  assert.ok(await verifyChoice(hash,'match-A',1,c,nonce,0));
  for(const args of [['match-B',1,c,nonce],['match-A',2,c,nonce],['match-A',1,action(0,'greedy'),nonce],['match-A',1,action(1),nonce],['match-A',1,c,nonce2]])assert.equal(await verifyChoice(hash,...args,0),false);
  for(const args of [['',1,c,nonce],['m',0,c,nonce],['m',9,c,nonce],['m',1,c,'bad'],['m',1,{...c,cheat:true},nonce]])await assert.rejects(hashChoice(...args,0));
  await assert.rejects(verifyChoice('bad','m',1,c,nonce,0));
});
test('copied opponent commitment cannot be reflected into another player seat',async()=>{
  const nonce=secureNonce(),choice=action(2,'greedy');
  const opponentCommit=await hashChoice('reflection',3,choice,nonce,0);
  const ownCommit=await hashChoice('reflection',3,choice,nonce,1);
  assert.notEqual(opponentCommit,ownCommit);
  assert.equal(await verifyChoice(opponentCommit,'reflection',3,choice,nonce,0),true);
  assert.equal(await verifyChoice(opponentCommit,'reflection',3,choice,nonce,1),false);
  for(const seat of [undefined,null,-1,2,'0',NaN])await assert.rejects(hashChoice('reflection',3,choice,nonce,seat));
});
