/** Menu planning is a capacity decision, not a collect-everything demand multiplier. */
import {MENU} from './catalog.mjs?v=20261013-qa4';
export const MAX_ACTIVE_MENU=24;
export const CUSTOMER_SEGMENTS=Object.freeze([
 Object.freeze({id:'coffee',name:'コーヒー好き',tags:['coffee'],share:.30,priceSensitivity:1.8,foodChance:.32}),
 Object.freeze({id:'tea',name:'お茶好き',tags:['tea','light'],share:.20,priceSensitivity:2.1,foodChance:.38}),
 Object.freeze({id:'sweet',name:'甘党',tags:['sweet','chocolate'],share:.20,priceSensitivity:1.6,foodChance:.72}),
 Object.freeze({id:'fresh',name:'さっぱり派',tags:['fruit','light'],share:.15,priceSensitivity:2.2,foodChance:.35}),
 Object.freeze({id:'meal',name:'食事目的',tags:['savory','hearty'],share:.15,priceSensitivity:1.9,foodChance:1})
]);
const collections=Object.entries(Object.values(MENU).filter(item=>item.collection).reduce((groups,item)=>{(groups[item.collection]??=[]).push(item);return groups},{})).map(([id,items])=>({id,name:items[0].collectionName,products:items.map(item=>item.id)}));
function themeForDay(day){
 if(day<=4||!collections.length)return {name:'定番メニュー週間',collection:null,products:[],startDay:1,endDay:4};
 const period=Math.floor((day-5)/4),group=collections[period%collections.length],tour=Math.floor(period/collections.length),offset=tour*3%group.products.length;
 return {name:group.name,collection:group.id,products:Array.from({length:Math.min(3,group.products.length)},(_,i)=>group.products[(offset+i)%group.products.length]),startDay:5+period*4,endDay:8+period*4};
}
/** Calendar-based and forecastable: no random roll, saved counter or startup penalty. */
export function getDemandTheme(state){const day=state.day+(state.phase==='closed'?1:0),theme=themeForDay(day);return {...theme,next:themeForDay(theme.endDay+1)}}
const fallbackTags={coffee:['coffee'],latte:['coffee'],tea:['tea','light'],cocoa:['chocolate','sweet'],soda:['sweet'],smoothie:['fruit'],matcha_latte:['tea'],cake:['sweet'],parfait:['sweet','fruit'],toast:['savory','light'],sandwich:['savory'],pancakes:['sweet'],curry:['savory','hearty'],pasta:['savory','hearty'],omelet_rice:['savory','hearty']};
export const getProductTags=id=>MENU[id].flavorTags??fallbackTags[id]??(MENU[id].category==='food'?['savory']:MENU[id].category==='dessert'?['sweet']:[]);
export function getActiveMenu(state){return Object.keys(MENU).filter(id=>state.menuEnabled?.[id]&&state.progression?.unlockedRecipes?.includes(id))}
export function productAppeal(state,id,segment,applyTheme=true){const match=segment.tags.some(tag=>getProductTags(id).includes(tag));return (match?3:1)*(applyTheme&&getDemandTheme(state).products.includes(id)?1.35:1)*Math.exp(-segment.priceSensitivity*(state.prices[id]/MENU[id].basePrice-1))}
export function getMenuStrategy(state){
 const active=getActiveMenu(state),comfortableCount=6+Math.min(6,state.progression?.expansions?.indoor??0)*2;
 const coverage=CUSTOMER_SEGMENTS.reduce((sum,segment)=>sum+(active.some(id=>segment.tags.some(tag=>getProductTags(id).includes(tag)))?segment.share:0),0);
 const diversityBonus=Math.round(30*coverage+Math.min(12,Math.max(0,active.length-3)*2));
 const priceFactor=active.length?CUSTOMER_SEGMENTS.reduce((sum,segment)=>{const weight=active.reduce((n,id)=>n+(segment.tags.some(tag=>getProductTags(id).includes(tag))?3:1),0);return sum+segment.share*active.reduce((n,id)=>n+productAppeal(state,id,segment,false),0)/weight},0):0;
 const themeBonus=getDemandTheme(state).products.filter(id=>active.includes(id)).length*4;
 return {themeBonus,activeCount:active.length,limit:MAX_ACTIVE_MENU,comfortableCount,prepFactor:Math.min(2.2,1+Math.max(0,active.length-comfortableCount)*.05),coverage:Math.round(coverage*100),diversityBonus,priceFactor};
}
/** Caller supplies the simulation RNG; no hidden random source, cash movement or state mutation. */
export function chooseCustomerOrder(state,random){
 const active=getActiveMenu(state);let roll=random(),segment=CUSTOMER_SEGMENTS.at(-1);for(const item of CUSTOMER_SEGMENTS){roll-=item.share;if(roll<0){segment=item;break}}
 const pick=items=>{const weights=items.map(id=>productAppeal(state,id,segment)),total=weights.reduce((a,b)=>a+b,0);let value=random()*total;for(let i=0;i<items.length;i++){value-=weights[i];if(value<0)return items[i]}return items.at(-1)};
 const drinks=active.filter(id=>MENU[id].category==='drink'),foods=active.filter(id=>MENU[id].category!=='drink');
 let order=drinks.length?[pick(drinks)]:[pick(foods)];if(foods.length&&drinks.length&&random()<segment.foodChance)order.push(pick(foods));
 return {segment:segment.id,order};
}
