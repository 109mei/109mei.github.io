import {recordAccountingCash} from './accounting.mjs';
import {MENU,INITIAL_RECIPES,RESEARCH_PROJECTS,STAFF_ROLES} from './catalog.mjs';
export {RESEARCH_PROJECTS} from './catalog.mjs';
export const MAX_EXPANSION_LEVEL=6;
export const MAX_DAILY_ARRIVALS=420;
const clone=s=>JSON.parse(JSON.stringify(s));
const own=(s,k)=>typeof k==='string'&&Object.hasOwn(s,k);
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const integer=n=>Number.isSafeInteger(n);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const planning=s=>assert(s.phase!=='open','営業中は変更できません。閉店後に調整してください');
export function createProgression(){return {version:1,expansions:{indoor:0,terrace:0},unlockedRecipes:[...INITIAL_RECIPES],research:null,researchQueue:[],completedResearch:[],staffRecruited:{service:4,barista:4},investmentSpend:0,researchSpend:0,recruitmentSpend:0};}
export function createFinance(cash=80000){return {version:1,openingBalance:cash,balanceForward:cash,entries:[],nextId:1,totals:{revenue:0,stock:0,wages:0,rent:0,utilities:0,expansion:0,research:0,recruitment:0,equipment:0,promotion:0,loanDraw:0,loanRepayment:0,interest:0}}}
/** Record one actual cash movement. Ingredient use/expiry is not a second cash charge. */
export function recordCash(s,amount,category,description){
 assert(integer(amount)&&own(s.finance.totals,category),'会計区分または金額が不正です');recordAccountingCash(s,amount,category,description);s.cash+=amount;
 s.finance.totals[category]+=Math.abs(amount);s.finance.entries.push({id:s.finance.nextId++,day:s.day,minute:s.minute,category,amount,balance:s.cash,description:String(description).slice(0,120)});
 while(s.finance.entries.length>400)s.finance.balanceForward=s.finance.entries.shift().balance;
}
export function growthLevels(source){const p=source?.progression?.expansions??source?.growth??source?.expansions??source;return {indoor:p?.indoor??0,terrace:p?.terrace??0}}
export function getGrowthBounds(source){const p=growthLevels(source);return {indoor:{minX:-2.88,maxX:2.88,minZ:Math.round((-2.63-2.4*p.indoor)*100)/100,maxZ:2.63},terrace:{minX:-3.4,maxX:3.4,minZ:3.25,maxZ:Math.round((6.55+1.2*p.terrace)*100)/100}}}
export function getStaffCapacity(state){const p=growthLevels(state);return 4+p.indoor*2+p.terrace}
export function getGrowthRent(state){const p=growthLevels(state);return p.indoor*550+p.terrace*280}
export function isRecipeUnlocked(state,id){return own(MENU,id)&&Boolean(state?.progression?.unlockedRecipes?.includes(id))}
const event=(s,text)=>{s.lastEvent=text;s.events.push({minute:s.minute,text});if(s.events.length>30)s.events.shift()};
const costs={indoor:[12000,22000,40000,65000,100000,145000],terrace:[8000,15000,27000,42000,65000,90000]};
const servedRequirements=[0,30,90,180,300,460];
const reputationRequirements=[0,30,35,40,45,50];
const area=b=>Math.round((b.maxX-b.minX)*(b.maxZ-b.minZ)*100)/100;
export function getExpansionOffer(state,zone){
 assert(own(costs,zone),'増築エリアが不正です');const p=growthLevels(state),level=p[zone],maxed=level>=MAX_EXPANSION_LEVEL,nextLevel=Math.min(MAX_EXPANSION_LEVEL,level+1),after={...p,[zone]:nextLevel};
 const cost=costs[zone][level]??0,requiredServed=servedRequirements[level]??0,requiredReputation=reputationRequirements[level]??0,boundsBefore=getGrowthBounds(p)[zone],boundsAfter=getGrowthBounds(after)[zone];
 const served=state.totalServed+(state.phase==='open'?state.today.served:0);
 const reason=maxed?'このエリアは最大の6段階まで増築済みです':state.phase==='open'?'閉店後に増築できます':served<requiredServed?`累計 ${requiredServed}人への提供が必要です`:state.reputation<requiredReputation?`評判 ${requiredReputation}以上が必要です`:state.cash<cost?'増築資金が足りません':null;
 return {zone,name:zone==='indoor'?'店内増築':'テラス拡張',level,nextLevel,maxLevel:MAX_EXPANSION_LEVEL,cost,requiredServed,requiredReputation,eligible:!reason,reason,boundsBefore,boundsAfter,areaBefore:area(boundsBefore),areaAfter:area(boundsAfter),rentIncrease:maxed?0:zone==='indoor'?550:280,staffCapacityBefore:getStaffCapacity(p),staffCapacityAfter:getStaffCapacity(after)};
}
export function purchaseExpansion(state,zone){planning(state);const offer=getExpansionOffer(state,zone);assert(offer.eligible,offer.reason);const s=clone(state);recordCash(s,-offer.cost,'expansion',`${offer.name} 第${offer.nextLevel}期`);s.progression.expansions[zone]=offer.nextLevel;s.progression.investmentSpend+=offer.cost;event(s,`${offer.name}が第${offer.nextLevel}期に。面積 ${offer.areaAfter}m² / 増築費 ¥${offer.cost.toLocaleString('ja-JP')}`);return s}
export function getResearchOffer(state,id){
 assert(own(RESEARCH_PROJECTS,id),'開発するメニューが不正です');const p=RESEARCH_PROJECTS[id],unlocked=isRecipeUnlocked(state,id),active=state.progression.research?.recipeId===id;
 const missing=p.requirements.recipes.filter(k=>!isRecipeUnlocked(state,k)),served=state.totalServed+(state.phase==='open'?state.today.served:0);
 const reason=unlocked?'開発済みです':active?'開発中です':state.phase==='open'?'閉店後に開発を開始できます':state.progression.research?'進行中の開発を先に完成させてください':missing.length?`先に ${missing.map(k=>MENU[k].name).join('・')}を開発してください`:served<p.requirements.served?`累計 ${p.requirements.served}人への提供が必要です`:state.progression.expansions.indoor<p.requirements.indoor?`店内増築 第${p.requirements.indoor}期が必要です`:state.cash<p.cost?'開発資金が足りません':null;
 return {...p,unlocked,active,eligible:!reason,reason};
}
export const getResearchProjects=state=>Object.keys(RESEARCH_PROJECTS).map(id=>getResearchOffer(state,id));
export function startResearch(state,id){planning(state);const offer=getResearchOffer(state,id);assert(offer.eligible,offer.reason);const s=clone(state);recordCash(s,-offer.cost,'research',`${offer.name}のレシピ開発`);s.progression.researchSpend+=offer.cost;s.progression.research={recipeId:id,progressMinutes:0,durationMinutes:offer.durationMinutes,startedDay:s.phase==='closed'?s.day+1:s.day,paidCost:offer.cost};event(s,`${offer.name}の開発開始。営業中 ${offer.durationMinutes}分で完成します`);return s}
/** One research minute per actual simulation minute; early-close clicks cannot skip it. */
export function advanceResearch(s){const r=s.progression.research;if(!r)return;r.progressMinutes++;if(r.progressMinutes<r.durationMinutes)return;s.progression.unlockedRecipes.push(r.recipeId);s.progression.completedResearch.push({recipeId:r.recipeId,completedDay:s.day,completedMinute:s.minute,cost:r.paidCost});s.menuEnabled[r.recipeId]=false;s.progression.research=(s.progression.researchQueue??[]).shift()??null;event(s,`${MENU[r.recipeId].name}が完成しました！ 閉店後に食材を仕入れ、販売を設定しましょう`)}
/** A visible, prepaid batch of at most five independent eligible projects. */
export function getResearchBatchOffer(state){
 const projects=getResearchProjects(state).filter(project=>project.eligible).slice(0,5),cost=projects.reduce((sum,project)=>sum+project.cost,0),durationMinutes=projects.reduce((sum,project)=>sum+project.durationMinutes,0);
 const reason=state.phase==='open'?'閉店後に開発を開始できます':state.progression.research?'進行中の開発を先に完成させてください':!projects.length?'今すぐ開発できる候補がありません':state.cash<cost?'まとめて開発する資金が足りません':null;
 return {projects,cost,durationMinutes,eligible:!reason,reason};
}
export function startResearchBatch(state){
 planning(state);const offer=getResearchBatchOffer(state);assert(offer.eligible,offer.reason);let s=startResearch(state,offer.projects[0].id);s.progression.researchQueue=[];
 for(const project of offer.projects.slice(1)){recordCash(s,-project.cost,'research',`${project.name}の予約開発`);s.progression.researchSpend+=project.cost;s.progression.researchQueue.push({recipeId:project.id,progressMinutes:0,durationMinutes:project.durationMinutes,startedDay:s.phase==='closed'?s.day+1:s.day,paidCost:project.cost});}
 event(s,`${offer.projects.length}件のレシピ開発を予約しました。合計 ¥${offer.cost.toLocaleString('ja-JP')} / 営業中 ${offer.durationMinutes}分`);return s;
}
export function setStaffCount(state,role,count){
 planning(state);assert(own(STAFF_ROLES,role),'スタッフの役割が不正です');const capacity=getStaffCapacity(state);assert(integer(count)&&count>=0&&count<=capacity,`スタッフは各0〜${capacity}人にしてください`);
 const recruits=Math.max(0,count-state.progression.staffRecruited[role]),cost=recruits*STAFF_ROLES[role].hiringCost;assert(state.cash>=cost,'採用資金が足りません');const s=clone(state);if(cost){recordCash(s,-cost,'recruitment',`${STAFF_ROLES[role].name} ${recruits}人採用`);s.progression.recruitmentSpend+=cost;s.progression.staffRecruited[role]+=recruits}s.staff[role]=count;event(s,`${STAFF_ROLES[role].name}の勤務を ${count}人に設定しました${cost?`（採用費 ¥${cost.toLocaleString('ja-JP')}）`:''}`);return s;
}
export function hireStaff(state,role){assert(own(STAFF_ROLES,role),'スタッフの役割が不正です');return setStaffCount(state,role,state.staff[role]+1)}
export function validateProgression(s){
 const p=s.progression;if(!p||p.version!==1||!p.expansions||!['indoor','terrace'].every(k=>integer(p.expansions[k])&&p.expansions[k]>=0&&p.expansions[k]<=MAX_EXPANSION_LEVEL))return '増築の進行データが不正です';
 if(!Array.isArray(p.unlockedRecipes)||p.unlockedRecipes.length>Object.keys(MENU).length||new Set(p.unlockedRecipes).size!==p.unlockedRecipes.length||!INITIAL_RECIPES.every(k=>p.unlockedRecipes.includes(k))||p.unlockedRecipes.some(k=>!own(MENU,k)))return '開発済みメニューが不正です';
 if(!Array.isArray(p.completedResearch)||p.completedResearch.length>Object.keys(RESEARCH_PROJECTS).length)return '開発履歴が不正です';
 const completed=new Set();for(const r of p.completedResearch){if(!r||!own(RESEARCH_PROJECTS,r.recipeId)||completed.has(r.recipeId)||!p.unlockedRecipes.includes(r.recipeId)||r.cost!==RESEARCH_PROJECTS[r.recipeId].cost||!integer(r.completedDay)||r.completedDay<1||r.completedDay>s.day||!integer(r.completedMinute)||r.completedMinute<1||r.completedMinute>600)return '開発履歴が不正です';completed.add(r.recipeId)}
 if(p.unlockedRecipes.some(id=>!INITIAL_RECIPES.includes(id)&&!completed.has(id)))return '開発結果と履歴が一致しません';
 for(const r of p.completedResearch)if(!RESEARCH_PROJECTS[r.recipeId].requirements.recipes.every(id=>p.unlockedRecipes.includes(id))||p.expansions.indoor<RESEARCH_PROJECTS[r.recipeId].requirements.indoor)return '開発の前提条件が不正です';
 if(p.research!==null){const r=p.research,project=r&&RESEARCH_PROJECTS[r.recipeId];if(!project||!own(RESEARCH_PROJECTS,r.recipeId)||p.unlockedRecipes.includes(r.recipeId)||!integer(r.progressMinutes)||r.progressMinutes<0||r.progressMinutes>=project.durationMinutes||r.durationMinutes!==project.durationMinutes||r.paidCost!==project.cost||!integer(r.startedDay)||r.startedDay<1||r.startedDay>s.day+1||!project.requirements.recipes.every(id=>p.unlockedRecipes.includes(id))||p.expansions.indoor<project.requirements.indoor)return '進行中のレシピ開発が不正です'}
 const queue=p.researchQueue===undefined?[]:p.researchQueue;if(!Array.isArray(queue)||queue.length>4||queue.length&&!p.research)return '予約開発の情報が不正です';const queued=new Set();for(const r of queue){const project=r&&RESEARCH_PROJECTS[r.recipeId];if(!project||!own(RESEARCH_PROJECTS,r.recipeId)||queued.has(r.recipeId)||r.recipeId===p.research?.recipeId||p.unlockedRecipes.includes(r.recipeId)||r.progressMinutes!==0||r.durationMinutes!==project.durationMinutes||r.paidCost!==project.cost||!integer(r.startedDay)||r.startedDay<1||r.startedDay>s.day+1||!project.requirements.recipes.every(id=>p.unlockedRecipes.includes(id))||p.expansions.indoor<project.requirements.indoor)return '予約開発の情報が不正です';queued.add(r.recipeId);}
 for(const role of Object.keys(STAFF_ROLES))if(!integer(p.staffRecruited?.[role])||p.staffRecruited[role]<4||p.staffRecruited[role]>getStaffCapacity(s)||s.staff?.[role]>p.staffRecruited[role])return '採用済みスタッフの情報が不正です';
 for(const key of ['investmentSpend','researchSpend','recruitmentSpend'])if(!integer(p[key])||p[key]<0||p[key]>1e12)return '投資支出の情報が不正です';
 const actualInvestment=Object.keys(costs).reduce((sum,zone)=>sum+costs[zone].slice(0,p.expansions[zone]).reduce((a,b)=>a+b,0),0);
 if(p.investmentSpend!==actualInvestment||p.researchSpend!==p.completedResearch.reduce((n,r)=>n+r.cost,0)+(p.research?.paidCost??0)+queue.reduce((n,r)=>n+r.paidCost,0)||p.recruitmentSpend!==Object.entries(STAFF_ROLES).reduce((n,[role,r])=>n+(p.staffRecruited[role]-4)*r.hiringCost,0))return '成長費用と進行の記録が一致しません';
 if(Object.keys(MENU).some(id=>s.menuEnabled?.[id]&&!p.unlockedRecipes.includes(id)))return '未開発のメニューは販売できません';
 return null;
}
export function validateFinance(s){const f=s.finance;if(!f||f.version!==1||!integer(f.openingBalance)||!integer(f.balanceForward)||Math.abs(f.openingBalance)>1e12||Math.abs(f.balanceForward)>1e12||!integer(f.nextId)||f.nextId<1||!Array.isArray(f.entries)||f.entries.length>400)return '会計台帳の形式が不正です';
 const categories=Object.keys(createFinance().totals);if(!f.totals||categories.some(k=>!integer(f.totals[k])||f.totals[k]<0||f.totals[k]>1e12))return '会計の累計が不正です';
 let balance=f.balanceForward,previousId=f.nextId-f.entries.length-1;for(const e of f.entries){if(!e||!integer(e.id)||e.id!==previousId+1||!integer(e.day)||e.day<1||e.day>s.day||!integer(e.minute)||e.minute<0||e.minute>600||!categories.includes(e.category)||!integer(e.amount)||Math.abs(e.amount)>1e12||!integer(e.balance)||typeof e.description!=='string'||e.description.length>120||(['revenue','loanDraw'].includes(e.category)?e.amount<0:e.amount>0))return '会計明細が不正です';balance+=e.amount;if(balance!==e.balance)return '会計明細の残高が一致しません';previousId=e.id}
 const cash=f.openingBalance+f.totals.revenue+f.totals.loanDraw-categories.filter(k=>!['revenue','loanDraw'].includes(k)).reduce((n,k)=>n+f.totals[k],0);
 if(balance!==s.cash||cash!==s.cash||previousId+1!==f.nextId)return '現金と会計台帳が一致しません';
 for(const [category,key]of [['expansion','investmentSpend'],['research','researchSpend'],['recruitment','recruitmentSpend']])if(f.totals[category]!==s.progression[key])return '会計台帳と成長費用が一致しません';return null;
}

/** Milestones are guidance, not free-cash rewards or hidden eligibility bypasses. */
export function getProgressionGoals(state){
 const served=state.totalServed+(state.phase==='open'?state.today.served:0),unlocked=state.progression.unlockedRecipes.length;
 return [
 {id:'first_guests',name:'地域の小さなカフェ',description:'累計30人に提供して次の増築条件を満たす',current:served,target:30},
 {id:'first_research',name:'看板メニューを育てる',description:'6種類を開発し、お客さまの好みに合わせる',current:unlocked,target:6},
 {id:'steady_service',name:'常連が集まる店',description:'累計150人に提供して上級レシピへの道を開く',current:served,target:150},
 {id:'regional_menu',name:'料理とデザートの専門店',description:'30種類を開発し、販売する24種類以内を選ぶ',current:unlocked,target:30},
 {id:'master_collection',name:'300種類のレシピ図鑑',description:'全300種類を開発。営業メニューは季節や好みで入れ替える',current:unlocked,target:Object.keys(MENU).length}
 ].map(goal=>({...goal,complete:goal.current>=goal.target}));
}
