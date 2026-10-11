/** Pure, deterministic simultaneous game. No network, clocks, DOM or shared state. */
export const ROUNDS = 8;
export const INITIAL_CHARGES = 2;
const STYLES = ['normal', 'greedy'];
const fail = message => { throw new TypeError(message); };
function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value,key))) fail(`Invalid ${label}`);
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff) return String(seed);
  if (typeof seed === 'string' && seed.length > 0 && seed.length <= 128) return seed;
  return fail('Seed must be a nonempty string (maximum 128 characters) or uint32');
}
function hash(text) {
  let h = 2166136261;
  for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h,16777619); }
  return h >>> 0;
}
function rng(seed) {
  let n=seed >>> 0;
  return () => { n=(n+0x6d2b79f5) >>> 0; let t=n; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
}
function prizesFor(seed, round) {
  const random=rng(hash(JSON.stringify(['prizes',seed,round]))), prizes=[2,3,5];
  for(let i=2;i>0;i--) { const j=Math.floor(random()*(i+1)); [prizes[i],prizes[j]]=[prizes[j],prizes[i]]; }
  return prizes;
}
export function assertChoiceShape(choice) {
  object(choice,['lane','style'],'choice');
  if(!Number.isInteger(choice.lane)||choice.lane<0||choice.lane>2||!STYLES.includes(choice.style)) fail('Invalid lane or style');
  return true;
}
function playerIndex(player) { if(player!==0 && player!==1) fail('Player must be 0 or 1'); }
function base(seed) { return {version:1,seed,round:1,scores:[0,0],charges:[2,2],history:[],over:false,outcome:null}; }
export function createMatch(seed) { return freeze(base(normalizeSeed(seed))); }
function apply(state, choices) {
  const prizes=prizesFor(state.seed,state.round), clash=choices[0].lane===choices[1].lane;
  const charges=state.charges.map((n,i)=>n-(choices[i].style==='greedy'?1:0));
  const scores=state.scores.map((n,i)=>Math.max(0,n+(clash?(choices[i].style==='greedy'?-2:0):prizes[choices[i].lane]+(choices[i].style==='greedy'?3:0))));
  const delta=scores.map((n,i)=>n-state.scores[i]);
  const over=state.round===ROUNDS;
  const outcome=over?(scores[0]===scores[1]?'draw':scores[0]>scores[1]?'player0':'player1'):null;
  const entry={round:state.round,prizes,choices:choices.map(c=>({lane:c.lane,style:c.style})),clash,delta,scores:[...scores],charges:[...charges]};
  return {state:{version:1,seed:state.seed,round:state.round+1,scores,charges,history:[...state.history,entry],over,outcome},events:entry};
}
function same(a,b) {
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a)&&a.length!==b.length)return false;
  const keys=Object.keys(a); return keys.length===Object.keys(b).length && keys.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));
}
/** Reconstruct from at most eight rounds: reject inconsistent or corrupted snapshots. */
export function assertMatch(state) {
  object(state,['version','seed','round','scores','charges','history','over','outcome'],'state');
  if(typeof state.seed!=='string'||normalizeSeed(state.seed)!==state.seed||!Array.isArray(state.history)||state.history.length>ROUNDS)fail('Invalid state seed/history');
  let expected=base(state.seed);
  for(const entry of state.history) {
    if(!entry || !Array.isArray(entry.choices)||entry.choices.length!==2)fail('Invalid history');
    entry.choices.forEach((choice,i)=>{assertChoiceShape(choice);if(choice.style==='greedy'&&expected.charges[i]===0)fail('History spends unavailable charge');});
    const next=apply(expected,entry.choices);
    if(!same(entry,next.events))fail('Inconsistent round history');
    expected=next.state;
  }
  if(!same(state,expected))fail('Inconsistent match state');
  return true;
}
export function getRoundInfo(state) {
  assertMatch(state);
  return freeze({round:state.round,prizes:state.over?[]:prizesFor(state.seed,state.round),scores:[...state.scores],charges:[...state.charges],over:state.over,outcome:state.outcome});
}
export function validateChoice(state,player,choice) {
  assertMatch(state); playerIndex(player); assertChoiceShape(choice);
  if(state.over)fail('Match is already over');
  if(choice.style==='greedy'&&state.charges[player]===0)fail('No greedy charges remaining');
  return true;
}
export function resolveRound(state,choices) {
  if(!Array.isArray(choices)||choices.length!==2||Object.keys(choices).length!==2)fail('Exactly two choices required');
  choices.forEach((choice,i)=>validateChoice(state,i,choice));
  return freeze(apply(state,choices));
}
/** CPU sees public state only. No human-current-choice parameter or hidden shared RNG. */
export function chooseCpuChoice(state,player,seed='practice') {
  assertMatch(state); playerIndex(player); if(state.over)fail('Match is already over');
  const random=rng(hash(JSON.stringify(['cpu',normalizeSeed(seed),state.seed,state.round,state.scores,state.charges,player])));
  return freeze({lane:Math.floor(random()*3),style:state.charges[player]>0&&random()<0.3?'greedy':'normal'});
}
