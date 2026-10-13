import {MENU,STOCK_ITEMS,RESEARCH_PROJECTS} from './catalog.mjs?v=20261013-qa4';
import {getRecipeProcessing} from './recipe-processing.mjs?v=20261013-qa4';
import {getResearchOffer} from './progression.mjs?v=20261013-qa4';
const names={coffee:'コーヒー',tea:'お茶',cocoa:'ココア',soda:'ソーダ',juice:'ジュース',smoothie:'スムージー',shake:'シェイク・ミルク',toast:'トースト',sandwich:'サンドイッチ',pancakes:'パンケーキ',waffle:'ワッフル',pasta:'パスタ',rice:'ごはん・グラタン',curry:'カレー',soup:'スープ',salad:'サラダ',pizza:'ピザ',cake:'ケーキ',tart:'タルト',pastry:'焼き菓子',pudding:'プリン・ゼリー',parfait:'パフェ',icecream:'アイス'};
const groups=new Map();
for(const id of Object.keys(MENU)){const family=getRecipeProcessing(id).family;if(!groups.has(family))groups.set(family,[]);groups.get(family).push(id)}
export const WORKBENCH_BASES=Object.freeze([...groups].map(([id,recipes])=>{const materials=Object.keys(STOCK_ITEMS).filter(k=>recipes.some(r=>MENU[r].recipe[k]));const minimum=Object.fromEntries(materials.map(k=>[k,Math.min(...recipes.map(r=>MENU[r].recipe[k]||0))]).filter(([,n])=>n));return Object.freeze({id,name:names[id]||id,recipes:Object.freeze(recipes),minimum:Object.freeze(minimum),materials:Object.freeze(materials),maximum:Object.freeze(Object.fromEntries(materials.map(k=>[k,Math.max(...recipes.map(r=>MENU[r].recipe[k]||0))])))})}));
export const getWorkbenchBase=id=>WORKBENCH_BASES.find(b=>b.id===id)??null;
export function createWorkbenchSelection(baseId=WORKBENCH_BASES[0].id){const base=getWorkbenchBase(baseId);if(!base)throw Error('ベースを選び直してください');return {baseId,quantities:{...base.minimum},variantId:null}}
export function selectionForRecipe(id){if(!Object.hasOwn(MENU,id))return null;return {baseId:getRecipeProcessing(id).family,quantities:{...MENU[id].recipe},variantId:id}}
export function matchWorkbench(selection){const base=getWorkbenchBase(selection?.baseId),q=selection?.quantities;if(!base||!q||typeof q!=='object'||Array.isArray(q))return {valid:false,matches:[],productId:null,reason:'ベースと素材を選んでください'};
 const valid=Object.entries(q).every(([k,n])=>base.materials.includes(k)&&Number.isInteger(n)&&n>=0&&n<=base.maximum[k])&&Object.entries(base.minimum).every(([k,n])=>(q[k]||0)>=n);
 if(!valid)return {valid:false,matches:[],productId:null,reason:'素材の種類または数量がこのベースに合いません'};
 const matches=base.recipes.filter(id=>base.materials.every(k=>(MENU[id].recipe[k]||0)===(q[k]||0)));
 const productId=matches.includes(selection.variantId)?selection.variantId:matches.length===1?matches[0]:null;
 return {valid:true,matches,productId,reason:!matches.length?'この配合に対応する商品はありません。素材の数量を変えるか、配合例を選んでください。':!productId?'同じ在庫素材を使う商品があります。仕上げ・風味を選んでください。':null};
}
export function describeWorkbench(state,selection){const match=matchWorkbench(selection);const ingredientCost=Object.entries(selection?.quantities||{}).reduce((sum,[k,n])=>sum+(Object.hasOwn(STOCK_ITEMS,k)&&Number.isFinite(n)&&n>=0?STOCK_ITEMS[k].unitCost*n:0),0);if(!match.productId)return {...match,ingredientCost,offer:null};const id=match.productId,product=MENU[id],offer=Object.hasOwn(RESEARCH_PROJECTS,id)?getResearchOffer(state,id):{id,name:product.name,unlocked:true,active:false,eligible:false,cost:0,durationMinutes:0,reason:'開発済みです',requirements:{recipes:[],served:0,indoor:0}};return {...match,ingredientCost,product,price:state.prices?.[id]??product.basePrice,offer};}
