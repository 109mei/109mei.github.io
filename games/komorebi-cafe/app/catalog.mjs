import {buildExpandedCatalog,MENU_COLLECTIONS} from './catalog-expansion.mjs?v=20261013-qa5';
export {MENU_COLLECTIONS};
/** Stable catalogue IDs shared by simulation, research, UI and serving models.
 * Prices and recipes are deliberately simplified game assumptions, in yen.
 */
const stock=(id,name,unitCost,shelfLife,unit='食分')=>Object.freeze({id,name,unitCost,shelfLife,unit,purchaseAmount:10});
export const STOCK_ITEMS=Object.freeze({
 beans:stock('beans','コーヒー豆',70,7,'杯分'),milk:stock('milk','ミルク',40,2,'杯分'),cake:stock('cake','ケーキ',130,1,'個'),
 tea:stock('tea','茶葉',25,7,'杯分'),cocoa:stock('cocoa','ココア粉',35,7,'杯分'),syrup:stock('syrup','シロップ・炭酸',30,7,'杯分'),
 fruit:stock('fruit','フルーツ',60,3),bread:stock('bread','パン',40,3),eggs:stock('eggs','たまご',35,4),
 flour:stock('flour','ミックス粉',35,7),rice:stock('rice','冷凍ごはん',40,7),vegetables:stock('vegetables','野菜・ソース',65,3),pasta:stock('pasta','パスタ',45,7),
 cheese:stock('cheese','チーズ',65,4),cream:stock('cream','生クリーム',55,2),chocolate:stock('chocolate','チョコレート',60,7),
 nuts:stock('nuts','ナッツ',55,7),honey:stock('honey','はちみつ',45,7),spices:stock('spices','香辛料',20,7),
 gelatin:stock('gelatin','ゼリー用凝固材',20,7),legumes:stock('legumes','調理済み豆',45,3),oats:stock('oats','オーツ麦',35,7)
});
const menu=(id,name,category,serving,basePrice,recipe,prepMinutes,minPrice=200,maxPrice=2500)=>Object.freeze({id,name,category,serving,modelId:id,basePrice,minPrice,maxPrice,recipe:Object.freeze(recipe),prepMinutes});
const expanded=buildExpandedCatalog(STOCK_ITEMS);
export const MENU=Object.freeze({
 coffee:menu('coffee','ハンドドリップ','drink','mug',420,{beans:1},2,200,1200),
 latte:menu('latte','カフェラテ','drink','mug',520,{beans:1,milk:1},3,250,1500),
 cake:menu('cake','季節のケーキ','dessert','plate',480,{cake:1},1,200,1500),
 tea:menu('tea','紅茶','drink','mug',420,{tea:1},2),
 cocoa:menu('cocoa','ココア','drink','mug',540,{cocoa:1,milk:1},3),
 soda:menu('soda','クリームソーダ','drink','glass',580,{syrup:1,milk:1},2),
 smoothie:menu('smoothie','ベリースムージー','drink','glass',680,{fruit:2,milk:1},3),
 matcha_latte:menu('matcha_latte','抹茶ラテ','drink','mug',620,{tea:2,milk:1},3),
 toast:menu('toast','バタートースト','food','plate',480,{bread:1,milk:1},3),
 sandwich:menu('sandwich','たまごサンド','food','plate',720,{bread:2,eggs:1,vegetables:1},4),
 pancakes:menu('pancakes','フルーツパンケーキ','food','plate',880,{flour:1,eggs:1,milk:1,fruit:1},5),
 omelet_rice:menu('omelet_rice','オムライス','food','plate',980,{rice:1,eggs:2,vegetables:1},6),
 curry:menu('curry','野菜カレー','food','bowl',950,{rice:1,vegetables:2},5),
 pasta:menu('pasta','トマトパスタ','food','plate',1020,{pasta:1,vegetables:2},6),
 parfait:menu('parfait','フルーツパフェ','dessert','dessert_glass',850,{fruit:2,milk:1,cake:1},4),
 ...expanded.items
});
export const INITIAL_RECIPES=Object.freeze(['coffee','latte','cake']);
export const STAFF_ROLES=Object.freeze({service:Object.freeze({name:'ホール',hourlyWage:1050,hiringCost:1800}),barista:Object.freeze({name:'バリスタ',hourlyWage:1150,hiringCost:2200})});
export const RESEARCH_PROJECTS=Object.freeze({...Object.fromEntries([
 ['tea',1800,90,[],0,0],['toast',2200,120,[],0,0],['cocoa',2600,120,['latte'],10,0],
 ['soda',3400,150,['tea'],15,0],['sandwich',4600,180,['toast'],25,0],['smoothie',5200,180,['soda'],35,0],
 ['matcha_latte',6000,210,['tea','latte'],45,0],['pancakes',7500,240,['toast'],60,1],
 ['curry',9000,300,['sandwich'],80,1],['omelet_rice',11000,360,['curry'],100,1],
 ['pasta',12500,360,['sandwich'],120,2],['parfait',14000,420,['smoothie','cake'],150,2]
].map(([id,cost,durationMinutes,recipes,served,indoor])=>[id,Object.freeze({id,name:MENU[id].name,cost,durationMinutes,requirements:Object.freeze({recipes:Object.freeze(recipes),served,indoor})})])),...expanded.projects});
export const ingredientCost=id=>Object.entries(MENU[id].recipe).reduce((sum,[key,n])=>sum+STOCK_ITEMS[key].unitCost*n,0);
