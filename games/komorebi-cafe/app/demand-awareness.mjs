import {MAX_DAILY_ARRIVALS} from './progression.mjs?v=20261013-qa4';
/** Explicit game assumptions, not calibrated market predictions. Awareness is the
 * percentage of a small local catchment who have heard of this cafe, not quality. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round(n*10000)/10000;
export const createAwareness=()=>({version:1,mode:'local',awareness:0,repeatCustomers:0,openDays:0});
export function migrateAwareness(s){if(!Object.hasOwn(s,'awareness'))s.awareness={...createAwareness(),mode:'legacy'};return s;}
export function validateAwareness(s){const a=s.awareness;return !a||a.version!==1||!['local','legacy'].includes(a.mode)||!Number.isFinite(a.awareness)||a.awareness<0||a.awareness>100||!Number.isFinite(a.repeatCustomers)||a.repeatCustomers<0||a.repeatCustomers>1000||!Number.isSafeInteger(a.openDays)||a.openDays<0?'認知度の情報が不正です':null;}
export function getAwarenessSummary(s){
 const a=s.awareness??{...createAwareness(),mode:'legacy'};
 // Reputation can affect conversion only after a person actually discovers us.
 const quality=.65+clamp(s.reputation??60,0,100)/200;
 const expectedDailyVisits=clamp((.85+a.awareness*.32+a.repeatCustomers*.075)*quality,0,150);
 return {...a,expectedDailyVisits:round(expectedDailyVisits),label:a.mode==='legacy'?'従来の来店モデル':'近隣商圏の認知度'};
}
export function makeAwarenessSchedule(s,random,lastEntryOffset,strategy){
 const base=getAwarenessSummary(s).expectedDailyVisits;
 const conversion=clamp(strategy.priceFactor*(1+strategy.themeBonus/100)*(1+(s.floor.appeal-50)/250),.35,1.7);
 const mean=base*conversion*s.weather.demandFactor*lastEntryOffset/450;
 // Inhomogeneous Bernoulli minute process: permits zero guests and long gaps.
 // No staffing, floor capacity, fixed minimum, or evenly spaced synthetic guests.
 const result=[];for(let m=0;m<lastEntryOffset;m++){
  const t=m/lastEntryOffset,weight=t>.32&&t<.6?1.45:t>.7&&t<.9?1.15:.70;
  if(random(s)<mean/lastEntryOffset*weight&&result.length<MAX_DAILY_ARRIVALS)result.push(m);
 }
 return result;
}
export function updateAwarenessAtClose(s){
 const a=s.awareness;if(a?.mode!=='local')return;
 const duration=Math.max(1,s.settings.closingMinute-s.settings.openingMinute);
 const exposure=clamp(s.minute/duration,0,1);
 const served=s.today.served,quality=served?clamp(s.today.satisfactionTotal/served,0,100):50;
 const satisfied=served*clamp((quality-55)/45,0,1);
 // Paid visibility accumulates only after operating, with diminishing returns.
 const paid=1.2*(1-Math.exp(-(s.today.promotionCosts??0)/1400));
 const saturation=1-a.awareness/100;
 a.awareness=round(clamp(a.awareness*.999+(.22*exposure+paid+satisfied*.045)*saturation,0,100));
 a.repeatCustomers=round(clamp(a.repeatCustomers*.985+satisfied*.12-s.today.lost*.04,0,1000));
 if(exposure>0)a.openDays++;
}
