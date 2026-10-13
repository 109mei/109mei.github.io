import * as THREE from './vendor/three/build/three.module.js';
import {MENU} from './catalog.mjs?v=20261013-qa5';
import {buildRecipeFood} from './food-recipes.mjs?v=20261013-qa5';

/** Original cafe-scale geometry. One unit is one metre; y=0 is the serving surface.
 * Prototypes are merged by material and section, then shared between independent instances.
 * Call the factory's dispose once; never dispose an individual food instance's resources.
 */
const ORIGINAL_FOOD_MODELS=Object.freeze({
 coffee:{name:'ハンドドリップ',category:'drink',features:['hollow_cup','coffee_surface','ceramic_handle','saucer']},
 latte:{name:'カフェラテ',category:'drink',features:['wide_cup','milk_rosetta','crema_surface','saucer']},
 tea:{name:'紅茶',category:'drink',features:['glass_teacup','amber_tea','lemon_slice','tea_tag']},
 cocoa:{name:'ココア',category:'drink',features:['tall_mug','whipped_cream','chocolate_shavings','cinnamon_stick']},
 soda:{name:'クリームソーダ',category:'drink',features:['tall_glass','melon_soda','ice_cubes','ice_cream','cherry','straw']},
 smoothie:{name:'ベリースムージー',category:'drink',features:['tall_glass','berry_smoothie','strawberry','blueberries','striped_straw']},
 matcha_latte:{name:'抹茶ラテ',category:'drink',features:['matcha_cup','matcha_surface','cream_leaf','matcha_dust']},
 toast:{name:'バタートースト',category:'food',features:['rounded_bread_crust','toast_crumb','butter_pat','jam_pot']},
 sandwich:{name:'たまごサンド',category:'food',features:['triangle_bread','egg_filling','egg_yolk_pieces','lettuce','tomato']},
 pancakes:{name:'フルーツパンケーキ',category:'food',features:['three_pancake_stack','syrup_drips','whipped_cream','strawberries','blueberries']},
 omelet_rice:{name:'オムライス',category:'food',features:['rice_mound','folded_omelet','ketchup_zigzag','salad']},
 curry:{name:'野菜カレー',category:'food',features:['curry_bowl','rice_half','curry_sauce','carrot','potato','broccoli']},
 pasta:{name:'トマトパスタ',category:'food',features:['pasta_bowl','curved_spaghetti','tomato_sauce','basil','parmesan']},
 cake:{name:'季節のケーキ',category:'dessert',features:['triangular_sponge','cream_layers','strawberry_filling','whipped_cream','strawberry']},
 parfait:{name:'フルーツパフェ',category:'dessert',features:['stemmed_glass','fruit_layers','ice_cream','banana','wafer','berries']}
});
export const FOOD_MODELS=Object.freeze(Object.fromEntries(Object.values(MENU).map(recipe=>[recipe.id,ORIGINAL_FOOD_MODELS[recipe.id]??{name:recipe.name,category:recipe.category,family:recipe.visualFamily,features:[recipe.visualFamily,...(recipe.visual?.toppings??[])]}])));
export const foodMenuIds=Object.freeze(Object.keys(FOOD_MODELS));
const TAU=Math.PI*2;
const C={ceramic:'#f6eedb',rim:'#c0a16c',cup:'#8a4b31',mint:'#719c8a',matchaCup:'#a7b57b',coffee:'#42271a',crema:'#bd8450',cream:'#fff4d9',chocolate:'#503126',bread:'#c98542',crumb:'#f4d598',toast:'#dca559',butter:'#f4d650',syrup:'#a66425',red:'#c7413c',berry:'#615584',pink:'#bb718b',green:'#668d42',darkgreen:'#477747',yellow:'#f8c443',egg:'#fff1be',curry:'#9e5b2b',carrot:'#ed9341',potato:'#dfba63',pasta:'#e7b653',sauce:'#b84732',glass:'#c4e0d4',tea:'#bb701e',soda:'#75b68b',matcha:'#7c9a45',white:'#fffaf1',silver:'#b4b5a6'};

export function createFoodFactory(){
 const materials=new Map(),prototypes=new Map(),ownedGeometries=new Set(),renderMaterials=new Set();let disposed=false;
 const primitives={sphere:new THREE.SphereGeometry(1,12,8),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,24),cone:new THREE.ConeGeometry(1,1,12)};
 function material(key){if(materials.has(key))return materials.get(key);let m;
  if(key==='glass')m=new THREE.MeshStandardMaterial({color:C.glass,transparent:true,opacity:.25,roughness:.16,metalness:.04,depthWrite:false,side:THREE.DoubleSide});
  else if(key==='ice')m=new THREE.MeshStandardMaterial({color:'#e4f8e8',transparent:true,opacity:.62,roughness:.16,metalness:0,depthWrite:false});
  else m=new THREE.MeshStandardMaterial({color:C[key]??key,roughness:['ceramic','rim','cup','mint','matchaCup'].includes(key)?.32:key==='silver'?.27:.76,metalness:key==='silver'?.45:0});
  m.name=`FOOD_MAT_${key.replace('#','')}`;materials.set(key,m);return m;
 }
 function batchMaterial(original){
  if(original.transparent){renderMaterials.add(original);return original;}
  const key=`batch:${original.roughness}:${original.metalness}:${original.side}`;
  if(!materials.has(key)){const m=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:original.roughness,metalness:original.metalness,side:original.side});m.name=`FOOD_MAT_OPAQUE_${original.roughness}_${original.metalness}`;materials.set(key,m)}
  renderMaterials.add(materials.get(key));return materials.get(key);
 }
 function build(id){
  const definition=FOOD_MODELS[id];if(!definition)throw Error(`Unknown food model: ${id}`);
  const root=new THREE.Group();root.name=`FOOD_${id}`;root.userData={menuId:id,modelId:id,category:definition.category,features:[...definition.features]};
  const dish=new THREE.Group(),serving=new THREE.Group();dish.name='serving_dish';serving.name='food_serving';root.add(dish,serving);let part=serving;
  function mesh(name,geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const o=new THREE.Mesh(geometry,material(color));o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);o.castShadow=color!=='glass';o.receiveShadow=true;part.add(o);return o}
  function sphere(name,c,x,y,z,sx,sy=sx,sz=sx){return mesh(name,primitives.sphere,c,x,y,z,sx,sy,sz)}
  function box(name,c,x,y,z,w,h,d,rx=0,ry=0,rz=0){return mesh(name,primitives.box,c,x,y,z,w,h,d,rx,ry,rz)}
  function cylinder(name,c,x,y,z,r,h,rz=r){return mesh(name,primitives.cylinder,c,x,y,z,r,h,rz)}
  function lathe(name,c,points,x=0,y=0,z=0){return mesh(name,new THREE.LatheGeometry(points.map(([a,b])=>new THREE.Vector2(a,b)),28),c,x,y,z)}
  function tube(name,c,points,r=.003,segments=16){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(name,new THREE.TubeGeometry(curve,segments,r,5,false),c)}
  function ring(name,c,r,t,x,y,z,rx=Math.PI/2,ry=0,arc=TAU){return mesh(name,new THREE.TorusGeometry(r,t,6,28,arc),c,x,y,z,1,1,1,rx,ry)}
  function plate({r=.19,bowl=false,color='ceramic'}={}){const old=part;part=dish;lathe(bowl?'ceramic_bowl':'ceramic_plate',color,bowl?[[0,.004],[r*.6,.004],[r*.84,.023],[r,.065],[r,.074],[r*.96,.077],[r*.79,.035],[r*.52,.018],[0,.018]]:[[0,.002],[r*.58,.002],[r*.83,.012],[r,.023],[r,.028],[r*.97,.031],[r*.78,.024],[r*.62,.015],[0,.015]]);ring('gold_plate_rim','rim',r*.972,.002,0,bowl?.076:.03,0);part=old}
  function cup({r=.062,h=.112,color='cup',liquid='coffee',fill=h-.012,saucer=true}={}){if(saucer)plate({r:r*1.55});const y=saucer?.016:0;lathe('hollow_cup',color,[[0,0],[r*.73,0],[r*.78,.008],[r,h-.008],[r*.995,h],[r-.005,h],[r*.71,.014],[0,.014]],0,y,0);cylinder('drink_surface',liquid,0,y+fill,0,r*.90,.003);if(color==='glass')lathe('amber_tea_volume',liquid,[[0,.014],[r*.7,.014],[r*.90,fill],[0,fill]],0,y,0);const handle=ring('ceramic_handle',color,r*.43,.008,r*1.12,y+h*.53,0,0,0,Math.PI*1.67);handle.rotation.z=-Math.PI*.84;root.userData.drinkLipHeight=y+h;return {y:y+fill,r:r*.9,base:y,top:y+h}}
  function glass({r=.057,h=.23,liquid='soda',fill=.18,stem=false}={}){let y=0;if(stem){lathe('glass_foot','glass',[[0,0],[r*.8,0],[r*.88,.005],[r*.75,.009],[.01,.018],[.008,.052]],0,0,0);y=.052}lathe('hollow_glass','glass',[[0,0],[r*.66,0],[r*.78,.008],[r,h],[r-.004,h],[r*.70,.013],[0,.013]],0,y,0);lathe('liquid_volume',liquid,[[0,.012],[r*.68,.012],[r*.87,fill],[0,fill]],0,y,0);ring('glass_lip','glass',r-.001,.003,0,y+h,0);root.userData.drinkLipHeight=y+h;return{y:y+fill,r:r*.88,base:y,top:y+h}}
  function rounded(name,c,w,d,h,r,x,y,z,rotation=0){const shape=new THREE.Shape(),a=-w/2,b=-d/2;shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);shape.lineTo(a+w,b+d-r);shape.quadraticCurveTo(a+w,b+d,a+w-r,b+d);shape.lineTo(a+r,b+d);shape.quadraticCurveTo(a,b+d,a,b+d-r);shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:4});g.rotateX(-Math.PI/2);return mesh(name,g,c,x,y,z,1,1,1,0,rotation,0)}
  function triangle(name,c,w,d,h,x,y,z,rotation=0){const shape=new THREE.Shape();shape.moveTo(-w/2,d/2);shape.lineTo(w/2,d/2);shape.lineTo(-w/2,-d/2);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});g.rotateX(-Math.PI/2);return mesh(name,g,c,x,y,z,1,1,1,0,rotation,0)}
  function leaf(name,x,y,z,size=.023,rotation=0){const o=sphere(name,'green',x,y,z,size*.5,.0026,size);o.rotation.y=rotation;tube(name+'_vein','darkgreen',[[x-Math.sin(rotation)*size*.7,y+.002,z-Math.cos(rotation)*size*.7],[x,y+.004,z],[x+Math.sin(rotation)*size*.7,y+.002,z+Math.cos(rotation)*size*.7]],.0009,5)}
  function strawberry(x,y,z,s=.025){const berry=sphere('strawberry','red',x,y,z,s,s*1.15,s*.87);berry.rotation.z=-.12;for(let i=0;i<9;i++){const a=i*2.4,v=.15+(i%3)*.27;sphere('strawberry_seed','egg',x+Math.cos(a)*s*Math.sqrt(1-v*v),y+s*v,z+Math.sin(a)*s*.85*Math.sqrt(1-v*v),.0016,.0025,.0016)}for(let i=0;i<4;i++)leaf('strawberry_leaf',x+Math.sin(i*Math.PI/2)*s*.25,y+s*1.1,z+Math.cos(i*Math.PI/2)*s*.25,s*.45,i*Math.PI/2)}
  function cream(x,y,z,s=.028){for(let i=0;i<3;i++){const r=s*(1-i*.28);sphere('whipped_cream','cream',x+(i===2?.003:0),y+i*s*.55,z,r,s*.43,r)}sphere('cream_tip','cream',x+.008,y+s*1.48,z,s*.17,s*.32,s*.18)}
  function cherry(x,y,z,s=.013){sphere('cherry','red',x,y,z,s);tube('cherry_stem','darkgreen',[[x,y+s*.8,z],[x+.008,y+s*2,z],[x+.006,y+s*2.6,z+.006]],.0014,7)}
  function blueberries(x,y,z,count=4,s=.011){for(let i=0;i<count;i++){const a=i*2.4;sphere('blueberry','berry',x+Math.cos(a)*.017,y+(i%2)*.003,z+Math.sin(a)*.017,s);sphere('blueberry_crown','#8c83ac',x+Math.cos(a)*.017,y+s+(i%2)*.003,z+Math.sin(a)*.017,s*.25,.0015,s*.25)}}
  function fork(x,y,z){box('fork_handle','silver',x,y,z,.009,.006,.10,0,0,-.04);box('fork_head','silver',x,y,z-.058,.021,.005,.022);for(let i=0;i<4;i++)box('fork_tine','silver',x+(i-1.5)*.006,y,z-.079,.003,.004,.032)}
  function salad(x,y,z){for(let i=0;i<6;i++){const a=i*2.3,o=sphere('salad_leaf',i%2?'green':'darkgreen',x+Math.cos(a)*.023,y+i*.001,z+Math.sin(a)*.022,.035,.008,.019);o.rotation.set((i%3-.8)*.4,a,.25)}sphere('cherry_tomato','red',x+.025,y+.016,z+.025,.019);leaf('tomato_stem',x+.025,y+.035,z+.025,.009,.4)}
  function latteArt(y,r){cylinder('milk_foam','cream',0,y+.001,0,r*.84,.002);cylinder('crema_center','crema',0,y+.0023,0,r*.68,.001);for(let i=0;i<5;i++){const z=-r*.36+i*r*.135,w=r*(.23+i*.012);for(const side of[-1,1]){const o=sphere('milk_rosetta_leaf','cream',side*w*.48,y+.003,z,w,.0016,r*.087);o.rotation.y=side*-.42}}tube('rosetta_stem','cream',[[0,y+.004,-r*.51],[0,y+.004,0],[0,y+.004,r*.45]],.0018,8)}
  if(!ORIGINAL_FOOD_MODELS[id])root.userData.recipeVisual=buildRecipeFood(MENU[id],{plate,cup,glass,sphere,box,cylinder,lathe,tube,ring,rounded,triangle,leaf,strawberry,cream,cherry,blueberries,salad,latteArt});
  switch(id){
   case'coffee':{const c=cup();ring('coffee_crema','crema',c.r*.88,.0022,0,c.y+.002,0);break}
   case'latte':{const c=cup({r:.069,h:.105,color:'mint',liquid:'crema'});latteArt(c.y,c.r);break}
   case'tea':{const c=cup({r:.064,h:.095,color:'glass',liquid:'tea'});const lemon=new THREE.Group();lemon.name='lemon_slice';serving.add(lemon);const old=part;part=lemon;cylinder('lemon_peel','yellow',0,0,0,.027,.006);cylinder('lemon_pith','cream',0,.004,0,.024,.001);for(let i=0;i<7;i++){const a=i*TAU/7,o=sphere('lemon_segment','#efd76b',Math.cos(a)*.012,.005,Math.sin(a)*.012,.006,.001,.012);o.rotation.y=-a+Math.PI/2}part=old;lemon.position.set(-.043,c.top-.003,0);lemon.rotation.z=.7;tube('tea_bag_string','cream',[[.029,c.y,0],[.057,c.top+.003,0],[.08,c.top-.015,.008],[.084,.04,.009]],.001,9);box('tea_tag','mint',.085,.04,.009,.022,.026,.001,0,0,.12);break}
   case'cocoa':{const c=cup({r:.06,h:.135,color:'#ad7861',liquid:'chocolate'});cream(0,c.y+.013,0,.039);for(let i=0;i<7;i++)box('chocolate_shaving','chocolate',Math.sin(i*3)*.027,c.y+.036+(i%2)*.019,Math.cos(i*3)*.025,.014,.002,.006,0,i,.4);cylinder('cinnamon_stick','bread',-.03,c.y+.035,-.014,.005,.115).rotation.z=-.35;break}
   case'soda':{const c=glass({h:.235,fill:.184});for(let i=0;i<5;i++){const a=i*2.4,o=box('ice_cube','ice',Math.sin(a)*.03,c.y+(i%2)*.012,Math.cos(a)*.03,.022,.023,.023);o.rotation.set(i*.2,i*.7,i*.13)}for(let i=0;i<10;i++)sphere('soda_bubble','cream',Math.sin(i*2.4)*.033,.04+i*.013,Math.cos(i*2.4)*.033,.002+(i%2)*.001);sphere('vanilla_ice_cream','cream',.005,c.top+.013,0,.045,.039,.045);for(let i=0;i<6;i++)sphere('icecream_scallop','cream',.005+Math.sin(i)*.03,c.top-.004,Math.cos(i)*.03,.017,.013,.016);cherry(.016,c.top+.052,.006);tube('yellow_straw','yellow',[[-.032,.10,-.02],[-.037,.285,-.02],[-.073,.31,-.02]],.0032,6);break}
   case'smoothie':{const c=glass({h:.225,fill:.215,liquid:'pink'});cylinder('berry_surface','pink',0,c.y+.002,0,c.r,.005);strawberry(-.02,c.top+.012,.012,.022);blueberries(.023,c.top+.002,-.013,3,.009);tube('striped_straw','cream',[[.027,.09,.017],[.039,.28,.017]],.0035,3);for(let i=0;i<6;i++)cylinder('straw_stripe','red',.027+(i*.025+.04)*.063,.13+i*.025,.017,.0036,.009).rotation.z=-.063;break}
   case'matcha_latte':{const c=cup({r:.072,h:.095,color:'matchaCup',liquid:'matcha'});cylinder('milk_foam_edge','cream',0,c.y+.001,0,c.r*.93,.002);cylinder('matcha_surface','matcha',0,c.y+.003,0,c.r*.77,.002);for(let i=0;i<5;i++){const t=i/4;const o=sphere('cream_leaf','cream',-.014+t*.027,c.y+.005,-.024+t*.044,.012*(1-t*.5),.0015,.007);o.rotation.y=-.5}tube('cream_leaf_stem','cream',[[-.023,c.y+.006,-.033],[0,c.y+.006,0],[.023,c.y+.006,.033]],.0013,8);for(let i=0;i<13;i++)sphere('matcha_dust','darkgreen',Math.sin(i*2.4)*(.043+i%3*.004),c.y+.003,Math.cos(i*2.4)*(.043+i%3*.004),.0012,.0008,.001);break}
   case'toast':{plate();rounded('rounded_bread_crust','bread',.21,.205,.032,.04,-.025,.017,0,-.12);rounded('toast_crumb','crumb',.192,.181,.033,.033,-.025,.02,0,-.12);rounded('golden_toast_face','toast',.174,.169,.004,.024,-.025,.053,0,-.12);for(let i=0;i<3;i++)tube('toast_score','bread',[[-.096,.058,-.065+i*.045],[-.025,.058,-.074+i*.045],[.05,.058,-.084+i*.045]],.0018,6);rounded('butter_melt','butter',.058,.051,.002,.012,-.025,.058,0,.13);box('butter_pat','butter',-.025,.066,0,.04,.013,.033,0,.13,0);lathe('jam_pot','ceramic',[[0,0],[.025,0],[.031,.033],[.026,.033],[.023,.008],[0,.008]],.12,.018,-.036);cylinder('berry_jam','red',.12,.045,-.036,.025,.003);leaf('mint_garnish',.105,.022,.074,.025,.6);break}
   case'sandwich':{plate();for(const side of[-1,1]){const x=side*.055,z=side*.018,ry=side>0?Math.PI:.05;triangle('triangle_bread','crumb',.136,.142,.017,x,.022,z,ry);triangle('egg_filling','egg',.139,.144,.023,x,.039,z,ry);triangle('triangle_bread','crumb',.136,.142,.017,x,.062,z,ry);for(let i=0;i<5;i++)box('egg_yolk_piece','yellow',x+(i-2)*.02,.051,z-.019+Math.sin(i)*.035,.013,.012,.011,0,i,.2)}salad(-.02,.031,-.114);break}
   case'pancakes':{plate();for(let i=0;i<3;i++){cylinder('golden_pancake_edge','bread',-.012,.031+i*.029,0,.104,.025);sphere('fluffy_pancake','crumb',-.012,.035+i*.029,0,.105,.013,.104);cylinder('browned_pancake_face','toast',-.012,.047+i*.029,0,.098,.003)}sphere('maple_syrup','syrup',-.012,.109,0,.082,.0025,.076);for(let i=0;i<3;i++){const a=.8+i*1.9;tube('syrup_drip','syrup',[[-.012+Math.sin(a)*.065,.11,Math.cos(a)*.065],[-.012+Math.sin(a)*.102,.10,Math.cos(a)*.102],[-.012+Math.sin(a)*.104,.063+i*.006,Math.cos(a)*.104]],.0035,7)}cream(-.013,.118,0,.028);strawberry(-.095,.043,.09,.024);strawberry(.111,.043,.044,.024);blueberries(.078,.03,-.073,5);break}
   case'omelet_rice':{plate({r:.205});sphere('rice_mound','crumb',-.024,.047,.018,.123,.039,.079);sphere('folded_omelet','yellow',-.024,.064,.016,.127,.046,.081);tube('omelet_fold','butter',[[-.138,.062,.032],[-.076,.058,.069],[.016,.056,.077],[.085,.063,.038]],.004,18);const points=[];for(let i=0;i<11;i++)points.push([-.113+i*.018,.09+Math.sin(i/10*Math.PI)*.02,.014+(i%2?-.019:.021)]);tube('ketchup_zigzag','red',points,.006,28);salad(.08,.034,-.101);fork(.156,.03,.05);break}
   case'curry':{plate({r:.205,bowl:true});sphere('curry_sauce','curry',-.019,.041,.019,.153,.012,.135);sphere('rice_half','cream',.065,.062,-.005,.07,.042,.123);for(let i=0;i<25;i++){const a=i*2.4,r=Math.sqrt(i/25);sphere('rice_grain','egg',.065+Math.sin(a)*.065*r,.073+Math.sqrt(1-r*r)*.031,-.005+Math.cos(a)*.111*r,.006,.004,.0035)}for(let i=0;i<4;i++){const x=-.056+Math.sin(i*2)*.035,z=-.06+i*.039;box('carrot_chunk','carrot',x,.061,z,.028,.023,.029,.1,i,.12);sphere('potato_chunk','potato',x-.028,.061,z+.02,.019,.016,.026)}for(let i=0;i<3;i++)sphere('broccoli_floret','darkgreen',-.029+(i-1)*.017,.075,-.083+(i%2)*.013,.019,.016,.019);sphere('pickled_ginger','red',.122,.062,.047,.018,.006,.036);break}
   case'pasta':{plate({r:.205,bowl:true});sphere('tomato_sauce','sauce',0,.041,0,.137,.012,.125);for(let i=0;i<12;i++){const points=[];for(let j=0;j<=18;j++){const a=j/18*TAU*1.35+i*.73,r=.03+(i%4)*.021+j*.001;points.push([Math.cos(a)*r,.056+(i%3)*.006+Math.sin(a*2+i)*.008,Math.sin(a)*r*.82])}tube('curved_spaghetti','pasta',points,.0046,32)}for(let i=0;i<6;i++)sphere('roasted_tomato','red',Math.sin(i*2.4)*.091,.079,Math.cos(i*2.4)*.069,.018,.012,.017);leaf('basil',-.013,.10,.008,.037,-.6);leaf('basil',.025,.102,-.022,.032,.8);for(let i=0;i<12;i++)box('parmesan_shaving','cream',Math.sin(i*2.4)*.081,.096,Math.cos(i*2.4)*.071,.013,.001,.005,0,i,.1);break}
   case'cake':{plate({r:.17});triangle('triangular_sponge','crumb',.18,.21,.036,-.015,.017,.012,.35);triangle('cream_layer','cream',.18,.21,.014,-.015,.053,.012,.35);triangle('strawberry_filling','red',.175,.205,.006,-.015,.067,.012,.35);triangle('triangular_sponge','crumb',.18,.21,.032,-.015,.073,.012,.35);triangle('cream_frosting','cream',.182,.212,.014,-.015,.105,.012,.35);cream(-.027,.128,-.017,.023);strawberry(-.049,.154,.006,.028);cream(.012,.128,-.047,.017);leaf('mint_garnish',.072,.025,.072,.025,.5);break}
   case'parfait':{const c=glass({r:.069,h:.195,fill:.032,liquid:'red',stem:true});lathe('vanilla_layer','cream',[[0,.03],[.052,.03],[.056,.083],[0,.083]],0,c.base,0);lathe('berry_layer','pink',[[0,.083],[.056,.083],[.060,.122],[0,.122]],0,c.base,0);lathe('cream_layer','cream',[[0,.122],[.060,.122],[.063,.165],[0,.165]],0,c.base,0);for(let i=0;i<6;i++)sphere('cut_fruit','yellow',Math.sin(i*2.4)*.052,c.base+.14+(i%2)*.038,Math.cos(i*2.4)*.052,.016,.012,.013);sphere('vanilla_ice_cream','cream',-.021,c.top-.006,0,.043,.039,.041);sphere('berry_ice_cream','pink',.027,c.top+.013,.006,.035,.034,.035);cream(-.02,c.top+.018,.003,.027);strawberry(.024,c.top+.052,-.016,.024);blueberries(-.025,c.top+.056,.017,3,.008);for(let i=0;i<3;i++){const o=ring('banana_slice','egg',.023,.008,.042-i*.01,c.top+.018+i*.014,.028,Math.PI/2,.2,Math.PI*1.5);o.rotation.z=.2}box('wafer','bread',-.044,c.top+.045,-.03,.031,.112,.009,0,-.3,-.18);for(let i=0;i<5;i++)box('wafer_crease','toast',-.044+i*.002,c.top+.015+i*.017,-.024,.032,.002,.002,0,-.3,-.18);break}
  }
  // Preserve exact mesh positions, normals and PBR finishes. Compatible opaque colors
  // become linear vertex colors, so a plate of many ingredients is one opaque draw.
  // Glass and ice retain separate alpha materials; dishes remain independently hideable.
  for(const section of[dish,serving]){
   const batches=new Map();section.updateMatrixWorld(true);
   section.traverse(o=>{
    if(!o.isMesh)return;
    const mat=batchMaterial(o.material);let batch=batches.get(mat);
    if(!batch)batches.set(mat,batch={geometries:[],colors:[],names:[]});
    const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();o.updateWorldMatrix(true,false);g.applyMatrix4(o.matrixWorld);
    batch.geometries.push(g);batch.colors.push([o.material.color.r,o.material.color.g,o.material.color.b]);batch.names.push(o.name);
   });
   const temp=new Set();section.traverse(o=>{if(o.isMesh&&!Object.values(primitives).includes(o.geometry))temp.add(o.geometry)});section.clear();for(const g of temp)g.dispose();
   for(const[mat,batch]of batches){
    const unique=new Map(),positions=[],normals=[],colors=[],indices=[];
    for(let gi=0;gi<batch.geometries.length;gi++){
     const g=batch.geometries[gi],p=g.attributes.position.array,n=g.attributes.normal.array,color=batch.colors[gi];
     for(let i=0;i<p.length;i+=3){
      const key=[p[i],p[i+1],p[i+2],n[i],n[i+1],n[i+2],...(mat.vertexColors?color:[])].join(',');let index=unique.get(key);
      if(index===undefined){index=positions.length/3;unique.set(key,index);positions.push(p[i],p[i+1],p[i+2]);normals.push(n[i],n[i+1],n[i+2]);if(mat.vertexColors)colors.push(...color)}indices.push(index);
     }
     g.dispose();
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));if(mat.vertexColors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();ownedGeometries.add(geometry);
    const merged=new THREE.Mesh(geometry,mat);merged.name=`${id}_${section===dish?'dish':'serving'}_${mat.name}`;merged.userData.components=batch.names;merged.castShadow=mat.name!=='FOOD_MAT_glass';merged.receiveShadow=true;section.add(merged);
   }
  }
  prototypes.set(id,root);return root;
 }
 return {create(menuId,{scale=1,withDish=true}={}){if(disposed)throw Error('Food factory is disposed');if(!Number.isFinite(scale)||scale<=0)throw Error('Food scale must be positive');const source=prototypes.get(menuId)??build(menuId),root=source.clone(true);root.scale.setScalar(scale);root.getObjectByName('serving_dish').visible=withDish;return root},dispose(){if(disposed)return;disposed=true;for(const g of ownedGeometries)g.dispose();for(const g of Object.values(primitives))g.dispose();for(const m of materials.values())m.dispose();prototypes.clear()},get geometryCount(){return ownedGeometries.size},get materialCount(){return renderMaterials.size},get paletteMaterialCount(){return materials.size},get prototypeCount(){return prototypes.size}};
}
