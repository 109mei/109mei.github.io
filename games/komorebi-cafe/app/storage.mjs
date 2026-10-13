/** Abstract game storage units, not physical volumes or food-safety guidance.
 * Each ingredient count uses one shared unit. Existing FIFO/expiry is unchanged.
 * Initial storage is included in the cafe's existing running costs.
 */
import {STOCK_ITEMS} from './catalog.mjs?v=20261013-qa6';
import {recordCash} from './progression.mjs?v=20261013-qa6';
export const MAX_STORAGE_LEVEL=6;
export const STORAGE_CATEGORIES=Object.freeze({
 dry:Object.freeze({id:'dry',name:'常温倉庫',baseCapacity:1500,capacityPerLevel:500,maintenancePerLevel:25,electricityPerLevel:10,costs:Object.freeze([6500,11000,18000,28000,42000,60000])}),
 chilled:Object.freeze({id:'chilled',name:'冷蔵庫',baseCapacity:1500,capacityPerLevel:400,maintenancePerLevel:30,electricityPerLevel:40,costs:Object.freeze([9000,15000,24000,36000,52000,74000])}),
 frozen:Object.freeze({id:'frozen',name:'冷凍庫',baseCapacity:250,capacityPerLevel:125,maintenancePerLevel:35,electricityPerLevel:55,costs:Object.freeze([11000,18000,28000,42000,60000,84000])})
});
export const INGREDIENT_STORAGE=Object.freeze({beans:'dry',milk:'chilled',cake:'chilled',tea:'dry',cocoa:'dry',syrup:'dry',fruit:'chilled',bread:'dry',eggs:'chilled',flour:'dry',rice:'frozen',vegetables:'chilled',pasta:'dry',cheese:'chilled',cream:'chilled',chocolate:'dry',nuts:'dry',honey:'dry',spices:'dry',gelatin:'dry',legumes:'chilled',oats:'dry'});
const own=(object,key)=>typeof key==='string'&&Object.hasOwn(object,key);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const assert=(condition,message)=>{if(!condition)throw Error(message)};
export function createStorage(){return {version:1,levels:{dry:0,chilled:0,frozen:0},investmentSpend:0}}
/** Overfull imported inventories remain untouched; only additional buying is blocked. */
export function getStorageSummary(state){
 const levels=state?.storage?.levels??createStorage().levels;
 return Object.fromEntries(Object.entries(STORAGE_CATEGORIES).map(([id,category])=>{
  const level=levels[id]??0,capacity=category.baseCapacity+level*category.capacityPerLevel;
  const used=Object.keys(STOCK_ITEMS).filter(key=>INGREDIENT_STORAGE[key]===id).reduce((sum,key)=>sum+(state?.stock?.[key]??0),0);
  const maintenance=category.maintenancePerLevel*level,electricity=category.electricityPerLevel*level;
  return [id,{id,name:category.name,level,capacity,used,available:Math.max(0,capacity-used),overCapacity:used>capacity,maintenance,electricity,dailyCost:maintenance+electricity}];
 }));
}
export function getStorageDailyCosts(state){const rows=Object.values(getStorageSummary(state)),maintenance=rows.reduce((n,row)=>n+row.maintenance,0),electricity=rows.reduce((n,row)=>n+row.electricity,0);return {maintenance,electricity,total:maintenance+electricity}}
export function assertStockCapacity(state,itemId,quantity){
 assert(own(INGREDIENT_STORAGE,itemId),'食材の保管区分が不正です');
 assert(Number.isSafeInteger(quantity)&&quantity>0,'保管数は正の整数にしてください');
 const row=getStorageSummary(state)[INGREDIENT_STORAGE[itemId]];
 assert(quantity<=row.available,`${row.name}の容量不足です（使用 ${row.used} / 容量 ${row.capacity}、空き ${row.available}）。消費を待つか倉庫を拡張してください`);
}
export function getStorageUpgradeOffer(state,id){
 assert(own(STORAGE_CATEGORIES,id),'倉庫の種類が不正です');
 const category=STORAGE_CATEGORIES[id],row=getStorageSummary(state)[id],maxed=row.level>=MAX_STORAGE_LEVEL;
 const nextLevel=Math.min(MAX_STORAGE_LEVEL,row.level+1),cost=category.costs[row.level]??0;
 const reason=maxed?'この倉庫は最大の6段階まで拡張済みです':state.phase==='open'?'閉店後に倉庫を拡張できます':state.cash<cost?'倉庫の拡張資金が足りません':null;
 const maintenanceIncrease=maxed?0:category.maintenancePerLevel,electricityIncrease=maxed?0:category.electricityPerLevel;
 return {id,name:category.name,level:row.level,nextLevel,maxLevel:MAX_STORAGE_LEVEL,maxed,cost,capacityBefore:row.capacity,capacityAfter:category.baseCapacity+nextLevel*category.capacityPerLevel,maintenanceIncrease,electricityIncrease,dailyCostIncrease:maintenanceIncrease+electricityIncrease,eligible:!reason,reason};
}
export function upgradeStorage(state,id){
 assert(state.phase!=='open','営業中は変更できません。閉店後に調整してください');
 const offer=getStorageUpgradeOffer(state,id);assert(offer.eligible,offer.reason);
 const next=JSON.parse(JSON.stringify(state));next.storage??=createStorage();
 // recordCash owns capitalization; do not also add an accounting asset here.
 recordCash(next,-offer.cost,'equipment',`${offer.name} 第${offer.nextLevel}期の拡張`);
 next.storage.levels[id]=offer.nextLevel;next.storage.investmentSpend+=offer.cost;
 next.lastEvent=`${offer.name}を第${offer.nextLevel}期に拡張しました。容量 ${offer.capacityAfter} / 維持・電気代 +¥${offer.dailyCostIncrease}/営業日`;
 next.events.push({minute:next.minute,text:next.lastEvent});if(next.events.length>30)next.events.shift();return next;
}
export function validateStorage(state){
 const storage=state?.storage;
 if(!record(storage)||storage.version!==1||Object.keys(storage).some(key=>!['version','levels','investmentSpend'].includes(key))||!record(storage.levels)||Object.keys(storage.levels).some(key=>!own(STORAGE_CATEGORIES,key))||!Object.keys(STORAGE_CATEGORIES).every(key=>Number.isSafeInteger(storage.levels[key])&&storage.levels[key]>=0&&storage.levels[key]<=MAX_STORAGE_LEVEL))return '倉庫の保存データが不正です';
 const expected=Object.entries(STORAGE_CATEGORIES).reduce((sum,[id,category])=>sum+category.costs.slice(0,storage.levels[id]).reduce((n,cost)=>n+cost,0),0);
 if(!Number.isSafeInteger(storage.investmentSpend)||storage.investmentSpend!==expected||!Number.isSafeInteger(state.finance?.totals?.equipment)||storage.investmentSpend>state.finance.totals.equipment)return '倉庫の拡張費用と購入記録が一致しません';
 // Capacity is a buying limit, never an instruction to discard legacy stock.
 return null;
}
