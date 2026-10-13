import {MENU,STOCK_ITEMS,RESEARCH_PROJECTS} from './catalog.mjs';
/** Read-only presentation model. These are condensed game processes, not food-safety
 * instructions. Quantities, task duration, FIFO consumption and research stay in
 * the original simulation. No stage creates inventory or charges for ingredients. */
export const PROCESSING_SIMPLIFICATION='ゲーム用に仕込み・加熱・冷却を短縮した工程です。実用レシピや食品安全の手順ではありません。';
const LEGACY_FAMILY={latte:'coffee',matcha_latte:'tea',omelet_rice:'rice'};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clamp=v=>Math.max(0,Math.min(1,v));
const freeze=Object.freeze;
export const PROCESS_KINDS=freeze({measure:'材料を用意',cut:'切る',mix:'混ぜる',extract:'抽出',heat:'加熱',bake:'焼く',chill:'冷やす',assemble:'組み立て',finish:'仕上げ'});
const EQUIPMENT={measure:'counter',cut:'board',mix:'bowl',extract:'brewer',heat:'hob',bake:'oven',chill:'chiller',assemble:'counter',finish:'counter'};
const WEIGHTS={measure:1,cut:2,mix:2,extract:4,heat:4,bake:5,chill:3,assemble:2,finish:1};
const CUTTABLE=['fruit','vegetables','bread','cheese','chocolate','nuts'];
const cache=new Map();
function operations(product,family){
 const id=product.id,r=product.recipe,steps=[];
 const add=(kind,label)=>steps.push({kind,label:label??PROCESS_KINDS[kind]});
 const cut=()=>{if(CUTTABLE.some(k=>r[k]))add('cut','具材を切り分ける')};
 const extract=()=>{if(r.beans)add('extract','コーヒーを抽出');else if(r.tea){if(/matcha/.test(id))add('mix','抹茶を溶き混ぜる');else add('extract','茶葉を抽出')}};
 add('measure','材料を用意・計量');
 switch(family){
 case'coffee':
  add('extract',id==='cold_brew'?'水出しで抽出（仕込みを短縮）':'コーヒーを抽出');
  if(r.milk&&!/iced|cold_brew|float/.test(id))add('heat','ミルクを温める');
  if(Object.keys(r).length>1)add('mix','抽出液と副材料を合わせる');
  if(/iced|cold_brew|float/.test(id))add('chill','冷たい仕上がりに整える');break;
 case'tea':
  if(/matcha/.test(id))add('mix','抹茶を溶き混ぜる');else add('extract','茶葉を抽出');
  if(r.milk&&!/iced|float|affogato/.test(id))add('heat','ミルクと合わせて温める');
  if(r.fruit)cut();
  if(/iced|float|affogato/.test(id))add('chill','冷たい材料と合わせる');break;
 case'cocoa':add('mix','ココアとミルクを混ぜる');add('heat','ゆっくり温める');break;
 case'soda':extract();if(r.fruit)cut();add('mix','シロップと炭酸を合わせる');add('chill','冷たく仕上げる');break;
 case'juice':cut();add('mix','果汁・野菜汁をしぼり合わせる');add('chill','冷たく仕上げる');break;
 case'smoothie':case'shake':
  extract();cut();add('mix',/milk|cocoa|hot_chocolate/.test(id)&&!/(smoothie|shake)/.test(id)?'粉・甘味とミルクを合わせる':'材料をなめらかに混ぜる');
  if(/^(honey_milk|cinnamon_milk|hot_chocolate|white_cocoa|orange_cocoa|mint_cocoa|marshmallow_cocoa)$/.test(id))add('heat','ミルク・チョコを温める');else add('chill','冷たく仕上げる');break;
 case'toast':
  cut();if(id==='french_toast'){add('mix','卵液にパンを浸す');add('heat','フライパンで焼く')}
  else {if(r.eggs||/mushroom|spinach/.test(id))add('heat','具材を加熱');add('bake','パンをこんがり焼く')}
  add('assemble','具材をのせる');break;
 case'sandwich':
  cut();if(r.eggs||/mushroom|spinach|curry/.test(id))add('heat','具材を加熱');
  if(/fruit|strawberry|banana|apple/.test(id))add('mix','クリームと果物を整える');
  add('assemble','パンに具材をはさむ');if(id==='caprese_panini')add('bake','はさんだパンを焼く');break;
 case'pancakes':case'waffle':add('mix','生地を混ぜる');add('heat',family==='waffle'?'ワッフル型で焼く':'鉄板で生地を焼く');cut();add('assemble','具材を盛り付ける');break;
 case'pasta':
  cut();add('heat','パスタをゆで・ソースを加熱');if(id==='cold_tomato_pasta')add('chill','パスタを冷やす');add('mix','パスタとソースを合わせる');if(/gratin|lasagna/.test(id))add('bake','表面を焼き上げる');break;
 case'rice':
  cut();add('heat',id==='potato_gratin'?'じゃがいもとソースを加熱':'ごはんと具材を加熱');
  if(/doria|gratin/.test(id))add('bake','表面を焼き上げる');else if(/croquette/.test(id)){add('assemble','丸く成形する');add('heat','表面を揚げ焼きにする')}
  else if(/omelet/.test(id))add('assemble','卵でごはんを包む');else add('mix','具材と合わせる');break;
 case'curry':cut();add('heat','カレーとごはんを温める');if(id==='baked_curry')add('bake','チーズをのせて焼く');add('assemble','ごはんとカレーを盛る');break;
 case'soup':cut();add('heat','具材とスープを煮る');if(/corn|pumpkin|potato|spinach/.test(id))add('mix','スープをなめらかにする');break;
 case'salad':
  cut();if(id==='egg_salad')add('heat','たまごを加熱');if(id==='pasta_salad'){add('heat','パスタをゆでる');add('chill','ゆでたパスタを冷やす')}
  if(id==='warm_salad')add('heat','野菜を温める');add('mix','具材とドレッシングを和える');break;
 case'pizza':add('mix','生地をまとめる');cut();add('assemble','生地に具材をのせる');add('bake','オーブンで焼く');break;
 case'cake':
  if(id==='cake'){add('cut','仕込み済みケーキを切り分ける');break}
  if(id==='rare_cheesecake'){add('mix','チーズの生地を合わせる');add('chill','冷やして落ち着かせる')}
  else if(id==='strawberry_shortcake'||id==='roll_cake'){cut();add('mix','クリームを泡立てる');add('assemble',id==='roll_cake'?'仕込み済み生地で巻く':'仕込み済み生地に重ねる');add('chill','冷やして整える')}
  else {extract();cut();add('mix','仕込み基材と副材料を合わせる');if(r.eggs){add('heat','卵を含む追加生地・クリームを加熱');add('chill','加熱した部分を冷ます')}add('assemble','仕込み済みケーキ基材に重ねる')}break;
 case'tart':
  add('mix','タルト生地と詰め物を整える');cut();
  if(/^(fruit|strawberry|blueberry|orange|banana)_tart$/.test(id)){add('bake','タルト台を焼く');add('chill','タルト台を冷ます');add('assemble','フルーツをのせる')}
  else {add('assemble','生地に詰め物を入れる');add('bake','タルト・キッシュを焼く');if(product.category==='dessert')add('chill','粗熱を取る')}break;
 case'pastry':add('mix','生地をまとめる');cut();add('assemble','生地を成形する');add('bake','オーブンで焼く');add('chill','粗熱を取る');break;
 case'pudding':extract();add('mix',r.gelatin?'凝固材と材料を合わせる':'プリン液を混ぜる');add('heat',r.gelatin?'凝固材を溶かす':'プリン液を加熱して固める');add('chill','冷やして固める');break;
 case'parfait':extract();cut();if(id==='pudding_parfait'){add('mix','プリン液を合わせる');add('heat','プリンを加熱');add('chill','プリンを冷やす')}add('assemble','グラスに層を重ねる');break;
 case'icecream':
  if(id==='coffee_affogato'){add('mix','冷菓のベースを混ぜる');add('chill','冷やして冷菓にする');extract();add('assemble','冷菓にコーヒーをかける')}
  else {add('mix','冷菓のベースを混ぜる');add('chill','冷やしながら固める')}break;
 default:throw new Error(`Unknown processing family: ${family}`);
 }
 add('finish',product.category==='drink'?'器に注いで仕上げる':'器に盛り付けて仕上げる');return steps;
}
function stageMaterialIds(stage,product,family){
 const ids=Object.keys(product.recipe);
 if(stage.kind==='cut')return ids.filter(id=>CUTTABLE.includes(id)||id==='cake');
 if(stage.kind==='extract')return ids.filter(id=>id==='beans'||id==='tea');
 if(stage.kind==='heat'&&['coffee','tea'].includes(family))return ids.filter(id=>['milk','cream','cocoa','chocolate','spices'].includes(id));
 if(stage.kind==='heat'&&family==='salad'&&product.id==='egg_salad')return ['eggs'];
 if(stage.kind==='heat'&&family==='salad'&&product.id==='pasta_salad')return ['pasta'];
 if(stage.kind==='bake'&&family==='toast')return ['bread'];
 if(stage.kind==='mix'&&family==='cake')return ids.filter(id=>id!=='cake');
 return ids;
}
function stageForms(kind,forms,product){
 const next={...forms};const set=(ids,form)=>{for(const id of ids)if(own(next,id))next[id]=form};
 if(kind==='cut'){set(['fruit','vegetables','bread','cake','cheese'],'sliced');set(['chocolate','nuts'],'chopped')}
 if(kind==='extract'){set(['beans'],'powder');if(/matcha/.test(product.id))set(['tea'],'powder')}
 if(kind==='mix'){set(['eggs'],'beaten');set(['milk','syrup','honey'],'poured');set(['flour','oats'],'batter');if(['smoothie','juice','shake'].includes(product.visual?.family??product.id))set(['fruit','vegetables','legumes'],'puree');set(['cream'],'whipped')}
 if(kind==='heat'||kind==='bake'){set(['rice','pasta'],'cooked');set(['chocolate'],'melted');set(['gelatin'],'dissolved')}
 return next;
}
export function getRecipeProcessing(productId){
 if(!own(MENU,productId))return null;if(cache.has(productId))return cache.get(productId);
 const product=MENU[productId],family=product.visual?.family??product.visualFamily??LEGACY_FAMILY[productId]??productId;
 const materials=freeze(Object.entries(product.recipe).map(([id,quantity])=>freeze({id,name:STOCK_ITEMS[id].name,quantity,unit:STOCK_ITEMS[id].unit,unitCost:STOCK_ITEMS[id].unitCost,cost:STOCK_ITEMS[id].unitCost*quantity})));
 const ops=operations(product,family),totalWeight=ops.reduce((n,s)=>n+WEIGHTS[s.kind],0);let cursor=0,forms=Object.fromEntries(materials.map(m=>[m.id,'raw']));
 const stages=freeze(ops.map((s,index)=>{const startMinute=cursor;cursor=index===ops.length-1?product.prepMinutes:cursor+product.prepMinutes*WEIGHTS[s.kind]/totalWeight;const inputForms=freeze({...forms});forms=stageForms(s.kind,forms,product);return freeze({...s,id:`${s.kind}-${index}`,equipment:s.kind==='mix'&&['juice','smoothie','shake'].includes(family)&&!s.label.includes('ミルク')?'blender':EQUIPMENT[s.kind],minutes:cursor-startMinute,startMinute,endMinute:cursor,materialIds:freeze(stageMaterialIds(s,product,family)),inputForms,outputForms:freeze({...forms})})}));
 const result=freeze({productId,name:product.name,family,prepMinutes:product.prepMinutes,materials,ingredientCost:materials.reduce((n,m)=>n+m.cost,0),stages,simplification:PROCESSING_SIMPLIFICATION});cache.set(productId,result);return result;
}
/** Isolated preview: never calls research actions, timers, stock or cash helpers. */
export function getRecipePreview(state,productId){
 const plan=getRecipeProcessing(productId);if(!plan)return null;
 const price=state?.prices?.[productId]??MENU[productId].basePrice;
 return {...plan,price,grossProfit:price-plan.ingredientCost,unlocked:Boolean(state?.progression?.unlockedRecipes?.includes(productId)),researchCost:RESEARCH_PROJECTS[productId]?.cost??0,researchMinutes:RESEARCH_PROJECTS[productId]?.durationMinutes??0};
}
export function getActivePreparation(state,actorOrId){
 const actor=typeof actorOrId==='string'?state?.staffActors?.find(a=>a.id===actorOrId):actorOrId,task=actor?.task;
 if(state?.phase!=='open'||actor?.role!=='barista'||task?.kind!=='prepare'||!Number.isFinite(task.total)||task.total<=0||!Number.isFinite(task.remaining)||task.remaining<=0||task.remaining>task.total)return null;
 const customer=state?.customers?.find(c=>c.id===task.customerId);if(customer?.stage!=='preparing'||customer.assignedTo!==actor.id||customer.ingredientsConsumed!==true||!customer?.order?.length||customer.order.some(id=>!own(MENU,id)))return null;
 const totalBase=customer.order.reduce((n,id)=>n+MENU[id].prepMinutes,0),orderProgress=clamp((task.total-task.remaining)/task.total),elapsed=orderProgress*totalBase;
 let offset=0,productIndex=0;
 while(productIndex<customer.order.length-1&&elapsed>=offset+MENU[customer.order[productIndex]].prepMinutes){offset+=MENU[customer.order[productIndex]].prepMinutes;productIndex++}
 const productId=customer.order[productIndex],product=MENU[productId],plan=getRecipeProcessing(productId),local=Math.max(0,Math.min(product.prepMinutes,elapsed-offset));
 let stageIndex=plan.stages.findIndex(s=>local<s.endMinute-1e-10);if(stageIndex<0)stageIndex=plan.stages.length-1;
 const stage=plan.stages[stageIndex];return {actorId:actor.id,customerId:customer.id,productId,product,productIndex,productCount:customer.order.length,stage,stageIndex,stageProgress:clamp((local-stage.startMinute)/stage.minutes),productProgress:clamp(local/product.prepMinutes),orderProgress,materials:plan.materials,stages:plan.stages};
}
export function getActivePreparations(state){return (state?.staffActors??[]).map(actor=>getActivePreparation(state,actor)).filter(Boolean)}
