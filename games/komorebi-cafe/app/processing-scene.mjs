import * as THREE from './vendor/three/build/three.module.js';
import {createIngredientFactory} from './ingredient-models.mjs?v=20261013-qa5';
import {createFoodFactory} from './food.mjs?v=20261013-qa5';
import {getRecipeProcessing} from './recipe-processing.mjs?v=20261013-qa5';

/** Original reusable countertop-scale equipment. No textures, remote assets or DOM. */
export function createProcessingEquipment(){
 const root=new THREE.Group();root.name='PROCESS_EQUIPMENT';const owned=new Set(),materials=new Map();
 const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,24),sphere:new THREE.SphereGeometry(1,16,10)};Object.values(geometries).forEach(g=>owned.add(g));
 function mesh(parent,name,shape,color,p,s){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.58,metalness:color==='#adb9b7'?.5:0}));const m=new THREE.Mesh(geometries[shape],materials.get(color));m.name=name;m.position.set(...p);m.scale.set(...s);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function group(name){const g=new THREE.Group();g.name=name;root.add(g);return g}
 const counter=group('counter');mesh(counter,'worktop','box','#ba9164',[0,-.065,0],[1.75,.13,1.03]);for(const x of[-.72,.72])for(const z of[-.39,.39])mesh(counter,'bench_leg','box','#486255',[x,-.55,z],[.07,.92,.07]);
 const board=group('board');mesh(board,'cutting_board','box','#d5b377',[0,.025,0],[.83,.05,.56]);const knife=new THREE.Group();knife.name='animated_knife';board.add(knife);mesh(knife,'knife_blade','box','#adb9b7',[0,.04,0],[.27,.1,.013]);mesh(knife,'knife_handle','box','#554031',[.21,.07,0],[.18,.055,.043]);knife.position.set(0,.19,.06);
 const bowl=group('bowl');const lathe=new THREE.LatheGeometry([[.02,0],[.15,.02],[.24,.11],[.27,.24],[.253,.245],[.222,.12],[.14,.045],[.02,.025]].map(p=>new THREE.Vector2(...p)),28);owned.add(lathe);const vessel=new THREE.Mesh(lathe,new THREE.MeshStandardMaterial({color:'#cbd9ce',roughness:.3,side:THREE.DoubleSide}));materials.set('vessel',vessel.material);vessel.name='mixing_bowl';bowl.add(vessel);const whisk=group('whisk');mesh(whisk,'whisk_handle','cylinder','#554031',[0,.42,0],[.018,.29,.018]);for(let i=0;i<5;i++){const wire=mesh(whisk,'whisk_loop','sphere','#adb9b7',[Math.cos(i*1.26)*.045,.22,Math.sin(i*1.26)*.045],[.012,.105,.012]);}whisk.rotation.z=.32;
 const brewer=group('brewer');mesh(brewer,'brewer_base','cylinder','#486255',[0,.035,0],[.25,.07,.25]);mesh(brewer,'brewer_upright','box','#adb9b7',[.21,.33,-.14],[.045,.63,.05]);mesh(brewer,'filter_support','box','#adb9b7',[0,.57,-.12],[.46,.035,.09]);mesh(brewer,'filter_cone','cylinder','#e4ded0',[0,.49,0],[.16,.15,.16]);mesh(brewer,'extraction_carafe','cylinder','#9a7055',[0,.19,0],[.14,.29,.14]);const drip=mesh(brewer,'extraction_stream','cylinder','#633d24',[0,.34,0],[.009,.15,.009]);
 const hob=group('hob');mesh(hob,'hob_base','box','#3d4b48',[0,.045,0],[.66,.09,.55]);mesh(hob,'heat_ring','cylinder','#b57b42',[0,.102,0],[.215,.015,.215]);mesh(hob,'pan','cylinder','#5e6561',[0,.14,0],[.27,.075,.27]);mesh(hob,'pan_handle','box','#554031',[.37,.16,0],[.33,.05,.055]);
 function appliance(name,color){const g=group(name);mesh(g,name+'_body','box',color,[0,.29,-.04],[.74,.58,.6]);mesh(g,name+'_window','box','#263f3d',[0,.3,.267],[.57,.38,.012]);mesh(g,name+'_handle','box','#adb9b7',[0,.51,.31],[.45,.035,.04]);mesh(g,name+'_display','box',name==='oven'?'#d99455':'#8ed3ce',[.22,.53,.269],[.09,.04,.013]);return g}
 const oven=appliance('oven','#e0d7c4'),chiller=appliance('chiller','#97b7bb');
 // Front cutaway tray makes the changing food visible without hiding it in a solid box.
 for(const g of[oven,chiller]){g.position.z=-.27;mesh(g,'visible_process_tray','box','#adb9b7',[0,.09,.55],[.6,.025,.4]);g.userData.cutaway=true;}
 const steam=group('steam');for(let i=0;i<6;i++){const puff=mesh(steam,'steam_puff_'+i,'sphere','#e8eee3',[(i%3-1)*.13,.28+Math.floor(i/3)*.14,0],[.028,.048,.028]);puff.userData.phase=i*.9;}
 const cold=group('cold');for(let i=0;i<6;i++)mesh(cold,'cooling_crystal_'+i,'box','#9ddde0',[(i%3-1)*.2,.28+Math.floor(i/3)*.12,.29],[.025,.025,.025]);
 const grinder=group('grinder');mesh(grinder,'grinder_body','box','#486255',[0,.21,0],[.32,.42,.29]);mesh(grinder,'bean_hopper','cylinder','#d0b492',[0,.49,0],[.13,.15,.13]);mesh(grinder,'grinder_crank','box','#adb9b7',[.1,.59,0],[.24,.023,.035]);
 const kettle=group('kettle');mesh(kettle,'kettle_body','sphere','#adb9b7',[-.5,.18,0],[.16,.17,.13]);const spout=mesh(kettle,'kettle_spout','cylinder','#adb9b7',[-.32,.22,0],[.018,.22,.018]);spout.rotation.z=-.8;mesh(kettle,'kettle_lid','cylinder','#554031',[-.5,.36,0],[.07,.025,.07]);
 const blender=group('blender');mesh(blender,'blender_motor','cylinder','#729d85',[0,.08,0],[.17,.16,.17]);const jug=mesh(blender,'blender_jug','cylinder','#c6ddd2',[0,.31,0],[.145,.3,.145]);jug.material.transparent=true;jug.material.opacity=.28;jug.material.depthWrite=false;mesh(blender,'blender_handle','box','#486255',[.19,.31,0],[.035,.22,.035]);mesh(blender,'blender_lid','cylinder','#486255',[0,.47,0],[.16,.04,.16]);
 function show(equipment){for(const g of root.children)g.visible=g===counter||equipment.includes(g.name);}
 show([]);
 return {root,show,knife,whisk,drip,grinder,kettle,blender,steam,cold,dispose(){owned.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}

/** Observational display only. Input snapshots are never mutated. Factory owns resources. */
export function createProcessingScene(){
 const root=new THREE.Group();root.name='CAFE_PROCESS_INSPECTION';const equipment=createProcessingEquipment(),ingredients=createIngredientFactory(),food=createFoodFactory();root.add(equipment.root);const materialLayer=new THREE.Group();materialLayer.name='PROCESS_MATERIALS';root.add(materialLayer);let key='',plan=null,stage=null,progress=0,mode='demo',modelId='',formsKey='';
 const intermediateGeometries={sphere:new THREE.SphereGeometry(1,20,12),cylinder:new THREE.CylinderGeometry(1,1,1,32),box:new THREE.BoxGeometry(1,1,1),ring:new THREE.TorusGeometry(1,.14,8,32)};
 const intermediateMaterials=new Map();
 function addIntermediate(shape,color,position,scale,name,transparent=false){const key=color+transparent;if(!intermediateMaterials.has(key))intermediateMaterials.set(key,new THREE.MeshStandardMaterial({color,roughness:transparent?.2:.75,transparent,opacity:transparent?.74:1,depthWrite:!transparent}));const n=new THREE.Mesh(intermediateGeometries[shape],intermediateMaterials.get(key));n.name=name;n.position.set(...position);n.scale.set(...scale);n.castShadow=true;n.receiveShadow=true;n.userData.intermediate=true;materialLayer.add(n);return n;}
 function buildIntermediate(kind,id){
  const family=plan.family,previouslyBaked=plan.stages.slice(0,plan.stages.findIndex(s=>s.id===stage.id)).some(s=>s.kind==='bake'),ready=progress>=.5||(previouslyBaked&&kind!=='bake'),has=stockId=>plan.materials.some(m=>m.id===stockId),gel=has('gelatin')&&family==='pudding';let style=null;
  if(kind==='mix'&&['pancakes','waffle','pizza','tart','pastry','pudding','icecream','cocoa','smoothie','shake','juice'].includes(family))style='mixture';
  if(kind==='heat'&&['pancakes','waffle'].includes(family))style='griddle';
  if((kind==='bake'||previouslyBaked&&['chill','assemble'].includes(kind))&&['tart','pastry','pizza','toast','sandwich'].includes(family))style='baking';
  if(kind==='chill'&&(gel||family==='icecream'||family==='pudding'))style=gel?'gel':family==='icecream'?'frozen':'custard';
  if(!style)return;
  for(const [i,n]of materialLayer.children.entries()){n.scale.multiplyScalar(.57);n.position.set(i%2? .64:-.64,.03,(Math.floor(i/2)-1)*.16);n.userData.sideSample=true;if(kind==='assemble'&&style==='baking'&&['fruit','cheese','chocolate','nuts'].includes(n.userData.stockId)){n.userData.sideSample=false;n.userData.assemblyStart=[-.35+i*.12,.25,.3];n.userData.assemblyTarget=[(i%3-1)*.08,.13,0];}}
  if(style==='mixture'){
   const blender=stage.equipment==='blender',liquid=['smoothie','shake','juice','cocoa'].includes(family),color=has('cocoa')||has('chocolate')?'#72452e':liquid&&has('fruit')?'#c97681':liquid&&has('vegetables')?'#7e9b57':'#ead296';
   addIntermediate('cylinder',color,[0,blender?.32:.16,0],[blender?.13:.218,blender?.2:.04,blender?.13:.218],'PROCESS_COMBINED_MIXTURE');
   for(let i=0;i<6;i++)addIntermediate('sphere',ready?color:'#f3e2b6',[Math.sin(i*2.4)*.11,blender?.425:.185,Math.cos(i*2.4)*.11],[ready?.009:.022,.008,ready?.009:.022],'PROCESS_MIXING_LUMPS');
  }
  if(style==='griddle'){addIntermediate(family==='waffle'?'box':'cylinder',ready?'#c28b43':'#eed5a0',[0,.197,0],family==='waffle'?[.34,ready?.055:.02,.32]:[.185,ready?.055:.017,.185],ready?'PROCESS_COOKED_BATTER':'PROCESS_POURED_BATTER');if(ready)for(let i=0;i<7;i++)addIntermediate('sphere','#ac7139',[Math.cos(i*2.4)*.11,.23,Math.sin(i*2.4)*.11],[.025,.002,.018],'PROCESS_BROWNED_SPOT');}
  if(style==='baking'){
   const color=ready?'#c88d47':'#ead4a4',z=kind==='assemble'?0:.29,y=kind==='assemble'?.055:.15;
   if(family==='tart'||family==='pizza'){addIntermediate('cylinder',color,[0,y,z],[.23,ready?.055:.027,.23],ready?'PROCESS_BAKED_BASE':'PROCESS_RAW_BASE');const rim=addIntermediate('ring',color,[0,y+.035,z],[.22,.22,.18],'PROCESS_CRUST_RIM');rim.rotation.x=Math.PI/2;if(family==='tart')addIntermediate('cylinder',has('chocolate')?'#70422b':'#ecd491',[0,y+.037,z],[.188,.023,.188],'PROCESS_TART_FILLING');}
   else if(['toast','sandwich'].includes(family))addIntermediate('box',color,[0,y,z],[.38,.055,.31],ready?'PROCESS_TOASTED_BREAD':'PROCESS_BREAD_TO_TOAST');
   else {addIntermediate('sphere',color,[0,y,z],[.22,ready?.11:.045,.16],ready?'PROCESS_RISEN_PASTRY':'PROCESS_SHAPED_DOUGH');for(let i=-1;i<=1;i++)addIntermediate('box',ready?'#a26b36':'#dac394',[i*.08,y+(ready?.09:.04),z],[.007,.007,.17],'PROCESS_PASTRY_SCORE');}
  }
  if(['gel','frozen','custard'].includes(style)){
   const coffee=has('beans'),color=coffee?'#67432b':has('cocoa')||has('chocolate')?'#78503a':has('fruit')?'#d88b86':'#f0deab';
   addIntermediate('cylinder','#d9e7de',[0,.135,.29],[.24,.02,.24],'PROCESS_COOLING_DISH');
   if(style==='frozen'&&ready)for(let i=0;i<3;i++)addIntermediate('sphere',color,[(i-1)*.09,.20,.29+(i%2)*.08],[.092,.081,.09],'PROCESS_FROZEN_SCOOP');
   else addIntermediate(ready?'box':'cylinder',color,[0,ready?.20:.155,.29],ready?[.30,.13,.25]:[.20,.024,.20],ready?(style==='gel'?'PROCESS_SET_JELLY':'PROCESS_SET_CUSTARD'):'PROCESS_LIQUID_TO_CHILL',style==='gel');
  }
 }
 function update(data={}){
  const id=typeof data.recipe==='string'?data.recipe:data.recipe?.id??data.productId;if(!id){materialLayer.clear();equipment.show([]);root.visible=false;return null;}root.visible=true;
  if(modelId!==id){plan=getRecipeProcessing(id);modelId=id;key='';}
  const requested=typeof data.stage==='number'?plan.stages[data.stage]:data.stage;stage=requested??plan.stages[0];if(!stage)throw Error('Invalid processing stage');progress=Math.max(0,Math.min(1,Number(data.progress??data.stageProgress)||0));mode=data.mode==='live'?'live':'demo';
  const kind=stage.kind,equips=Array.isArray(stage.equipment)?[...stage.equipment]:[stage.equipment??({cut:'board',mix:'bowl',extract:'brewer',heat:'hob',bake:'oven',chill:'chiller'}[kind]??'counter')];
  if(kind==='mix'&&!equips.includes('blender'))equips.push('whisk');if(['heat','bake'].includes(kind)||(kind==='extract'&&id!=='cold_brew'))equips.push('steam');if(kind==='chill')equips.push('cold');if(kind==='extract'&&id!=='cold_brew')equips.push('kettle');equipment.show(equips);root.userData={productId:id,stageId:stage.id,stageKind:kind,stageProgress:progress,mode,taskId:data.task?.customerId??null};
  const forms=progress<.5?stage.inputForms:stage.outputForms;formsKey=JSON.stringify(forms??{});const nextKey=[id,stage.id,formsKey,progress<.5?'input':'output',kind==='finish'].join(':');
  if(key!==nextKey){key=nextKey;materialLayer.clear();
   if(kind==='finish'){const finished=food.create(id,{scale:1.65});finished.position.y=.03;materialLayer.add(finished);}
   else{const ids=stage.materialIds?.length?stage.materialIds:plan.materials.map(m=>m.id);ids.slice(0,8).forEach((stockId,i)=>{const form=forms?.[stockId]??'raw',n=ingredients.create(stockId,{form,recipeId:id,scale:kind==='measure'?1.15:1.2,withContainer:kind==='measure'});const centered=kind!=='measure';n.position.set(centered?(i%3-1)*.15:(i%4-1.5)*.36,kind==='heat'?.18:kind==='mix'?.19:kind==='extract'?.59:kind==='bake'||kind==='chill'?.12:.065,centered?Math.floor(i/3)*.13:(Math.floor(i/4)-.5)*.37);if(kind==='bake'||kind==='chill')n.position.z+=.29;n.userData.assemblyStart=n.position.toArray();materialLayer.add(n);});buildIntermediate(kind,id);}
  }
  animate(0);return {plan,stage,progress,mode};
 }
 function animate(time=0){if(!stage)return;const phase=mode==='live'?progress*14:time*3+progress*14;equipment.knife.position.y=.14+Math.abs(Math.sin(phase*2))*.13;equipment.knife.rotation.z=Math.sin(phase*2)*.12;equipment.whisk.position.set(Math.cos(phase)*.06,0,Math.sin(phase)*.06);equipment.whisk.rotation.y=phase;equipment.drip.scale.y=.12*(.7+.3*Math.sin(phase));equipment.kettle.rotation.z=stage.kind==='extract'?-.2:0;for(const [i,puff]of equipment.steam.children.entries()){puff.position.y=.25+((phase*.05+i*.07)%.4);puff.scale.setScalar(.018+((phase*.02+i*.01)%.025));}for(const [i,crystal]of equipment.cold.children.entries()){crystal.rotation.set(phase+i,phase*.5,phase);crystal.position.y=.28+Math.sin(phase+i)*.025;}equipment.blender.rotation.z=stage.equipment==='blender'?Math.sin(phase*12)*.012:0;materialLayer.rotation.y=stage.kind==='mix'?Math.sin(phase)*.12:0;for(const [i,n]of materialLayer.children.entries()){n.rotation.y=stage.kind==='assemble'?progress*.22:0;if(stage.kind==='assemble'&&n.userData.assemblyStart&&!n.userData.sideSample){const p=n.userData.assemblyStart,t=n.userData.assemblyTarget??[0,p[1]+i*.035,0];n.position.set(p[0]+(t[0]-p[0])*progress,p[1]+(t[1]-p[1])*progress,p[2]+(t[2]-p[2])*progress);}}}
 return {root,equipment,update,animate,get snapshot(){return {plan,stage,progress,mode};},dispose(){equipment.dispose();ingredients.dispose();food.dispose();Object.values(intermediateGeometries).forEach(g=>g.dispose());intermediateMaterials.forEach(m=>m.dispose());root.clear();}};
}
