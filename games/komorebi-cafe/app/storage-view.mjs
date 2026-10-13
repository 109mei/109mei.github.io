import * as THREE from './vendor/three/build/three.module.js';
import {getStorageSummary} from './storage.mjs?v=20261013-qa6';

/** A visual service annex only. It never extends buildable floor or navigation. */
export const STORAGE_BOUNDS=Object.freeze({minX:4.2,maxX:9.8,minZ:-5.7,maxZ:-1.0});
export const STORAGE_FOCUS=Object.freeze({x:7,y:.75,z:-3.35,width:6,depth:5,height:3});

export function createStorageView(){
 const root=new THREE.Group();root.name='CAFE_STORAGE_ONLY_ANNEX';root.userData.storageOnly=true;
 const fixtures=new THREE.Group();fixtures.name='STORAGE_UPGRADE_FIXTURES';root.add(fixtures);
 const geometries=new Map(),materials=new Map(),slots={dry:[],chilled:[],frozen:[]};let levelsKey='';
 function mat(name,color,props={}){if(!materials.has(name)){const material=new THREE.MeshStandardMaterial({color,roughness:.8,...props});material.name='MAT_STORAGE_'+name;materials.set(name,material)}return materials.get(name)}
 const plaster=mat('PLASTER','#e9e2d5'),floor=mat('FLOOR','#b7b3a6'),steel=mat('STEEL','#738183',{metalness:.55,roughness:.4}),wood=mat('WOOD','#b8864e'),dark=mat('DARK','#344b49'),white=mat('WHITE','#e3ece8'),dry=mat('DRY','#b89359'),chilled=mat('CHILLED','#7fac9d'),frozen=mat('FROZEN','#80b9cb'),glass=mat('GLASS','#bedcdf',{transparent:true,opacity:.20,depthWrite:false,roughness:.12}),milk=mat('MILK','#f1ede0'),fruit=mat('FRUIT','#b86b58');
 function box(parent,name,w,h,d,material,x,y,z){const key=[w,h,d].join(':');if(!geometries.has(key))geometries.set(key,new THREE.BoxGeometry(w,h,d));const o=new THREE.Mesh(geometries.get(key),material);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 // Both visitor-facing sides and the roof are deliberately cut away for inspection.
 box(root,'STORAGE_ONLY_FOUNDATION',5.6,.28,4.7,steel,7,-.19,-3.35);
 box(root,'STORAGE_ONLY_FLOOR',5.6,.08,4.7,floor,7,-.01,-3.35);
 box(root,'STORAGE_BACK_WALL',5.6,2.55,.12,plaster,7,1.275,-5.64);
 box(root,'STORAGE_LEFT_CUTAWAY',.1,.28,4.7,plaster,4.25,.14,-3.35);
 box(root,'STORAGE_FRONT_CUTAWAY',5.6,.14,.08,dark,7,.07,-1.04);
 box(root,'STORAGE_RIGHT_CUTAWAY',.08,.14,4.7,dark,9.76,.07,-3.35);
 box(root,'STORAGE_DRY_DIVIDER',.1,.45,4.56,plaster,6.9,.225,-3.32);
 box(root,'STORAGE_COLD_DIVIDER',2.76,.45,.1,plaster,8.34,.225,-3.35);
 for(const [id,x,z,color]of[['dry',5.55,-5.49,dry],['chilled',8.3,-5.49,chilled],['frozen',8.3,-3.23,frozen]]){
  box(root,`STORAGE_${id}_ZONE_STRIPE`,id==='dry'?2.3:2.4,.016,id==='dry'?4.15:1.88,color,x,.045,id==='dry'?-3.28:id==='chilled'?-4.48:-2.15);
  const plaque=box(root,`STORAGE_${id}_SIGN`,id==='dry'?1.6:1.8,.3,.055,color,x,id==='frozen'?.95:2.2,z);
  if(id==='frozen'){box(root,'STORAGE_FROZEN_SIGN_POST',.055,1.0,.06,steel,x,.5,z)}
  // Crate / snowflake pictograms are original solid geometry, with no font dependency.
  if(id==='dry'){
   box(root,'STORAGE_DRY_CRATE_ICON',.20,.18,.026,white,x,2.2,z+.04);
   for(const dx of[-.07,.07])box(root,'STORAGE_DRY_CRATE_SLAT',.016,.18,.02,dry,x+dx,2.2,z+.058);
  }else for(const angle of[0,Math.PI/3,-Math.PI/3]){const stroke=box(root,`STORAGE_${id}_SNOWFLAKE`,.21,.025,.027,white,x,id==='frozen'?.95:2.2,z+.04);stroke.rotation.z=angle}
  plaque.userData.storageKind=id;
 }
 function rack(x,z,index,level){
  const shelves=2+(level%2)+(level===6?2:0),height=1.05+(shelves-2)*.35;
  for(const dx of[-.91,.91])for(const dz of[-.28,.28])box(fixtures,`DRY_RACK_${index}_LEG`,.05,height+.13,.05,steel,x+dx,(height+.13)/2,z+dz);
  for(let j=0;j<shelves;j++){
   const y=.2+j*.35;box(fixtures,`DRY_RACK_${index}_SHELF_${j}`,1.94,.045,.64,wood,x,y,z);
   for(let k=0;k<4;k++){
    const crate=new THREE.Group();crate.name=`DRY_STOCK_${index}_${j}_${k}`;crate.position.set(x-.69+k*.46,y+.025,z);fixtures.add(crate);slots.dry.push(crate);
    box(crate,'STOCK_CRATE',.39,.23,.48,dry,0,.13,0);
    box(crate,'CRATE_TOP',.36,.02,.45,wood,0,.252,0);
    box(crate,'CRATE_LABEL',.17,.085,.013,milk,0,.145,.247);
    for(const dx of[-.14,.14])box(crate,'CRATE_BINDING',.018,.245,.018,dark,dx,.13,.25);
   }
  }
 }
 function coldAppliance(id,index,count,level){
  const isFrozen=id==='frozen',material=isFrozen?frozen:chilled,x=7.24+(index+.5)*2.19/count,w=2.19/count-.055,z=isFrozen?-2.13:-4.62,h=(isFrozen?1.04:1.58)+(level%2)*.12;
  box(fixtures,`${id}_UNIT_${index}_BODY`,w,h,.96,white,x,h/2,z);
  box(fixtures,`${id}_UNIT_${index}_INTERIOR`,w-.08,isFrozen?.05:h-.18,isFrozen?.84:.04,dark,x,isFrozen?h+.003:h/2,isFrozen?z:z+.491);
  for(let j=0;j<3;j++){
   const stock=new THREE.Group();stock.name=`${id}_STOCK_${index}_${j}`;fixtures.add(stock);slots[id].push(stock);
   if(isFrozen){box(stock,'FROZEN_PACK',Math.max(.09,(w-.12)/3),.105,.58,frozen,x+(j-1)*(w-.08)/3,h+.07,z);box(stock,'FROZEN_PACK_LABEL',Math.max(.045,(w-.2)/3),.008,.12,milk,x+(j-1)*(w-.08)/3,h+.126,z)}
   else{const y=.26+j*.40;box(fixtures,'CHILLED_SHELF',w-.07,.027,.10,steel,x,y-.08,z+.54);box(stock,'CHILLED_BOTTLES',w-.17,.25,.12,j===1?fruit:milk,x,y+.07,z+.535)}
  }
  if(isFrozen){box(fixtures,'FREEZER_GLASS_LID',w-.05,.025,.94,glass,x,h+.15,z);box(fixtures,'FREEZER_HANDLE',w*.56,.045,.05,steel,x,h+.18,z+.35);box(fixtures,'FREEZER_BLUE_TRIM',w,.065,.04,material,x,h-.1,z+.50)}
  else{box(fixtures,'FRIDGE_GLASS_DOOR',w-.04,h-.1,.025,glass,x,h/2,z+.64);for(const dx of[-w/2+.03,w/2-.03])box(fixtures,'FRIDGE_DOOR_FRAME',.045,h,.06,steel,x+dx,h/2,z+.65);box(fixtures,'FRIDGE_HANDLE',.035,.31,.075,steel,x+w/2-.095,h*.53,z+.705);box(fixtures,'FRIDGE_GREEN_TRIM',w,.07,.04,material,x,h-.04,z+.67)}
  for(let j=0;j<3;j++)box(fixtures,`${id}_VENT`,w*.56,.018,.015,dark,x,.09+j*.042,z+.495);
 }
 function update(business={}){
  const summary=getStorageSummary(business),key=JSON.stringify(Object.values(summary).map(row=>row.level));
  if(key!==levelsKey){levelsKey=key;fixtures.clear();for(const id of Object.keys(slots))slots[id]=[];
   for(let i=0;i<Math.min(3,1+Math.floor(summary.dry.level/2));i++)rack(5.53,-5+i*1.36,i,summary.dry.level);
   for(const id of['chilled','frozen']){const count=1+Math.floor(summary[id].level/2);for(let i=0;i<count;i++)coldAppliance(id,i,count,summary[id].level)}
   for(const [id,x,z,y]of[['dry',5.55,-5.43,2.2],['chilled',8.3,-5.43,2.2],['frozen',8.3,-3.17,.95]])for(let i=0;i<=summary[id].level;i++)box(fixtures,`${id}_UPGRADE_MARK_${i}`,.045,.115,.022,white,x+.25+i*.08,y,z);
  }
  for(const id of Object.keys(slots)){
   const row=summary[id],ratio=Math.min(1,Math.max(0,row.used/Math.max(1,row.capacity))),filled=Math.ceil(ratio*slots[id].length);
   slots[id].forEach((o,i)=>{o.visible=i<filled});root.userData[id]={level:row.level,used:row.used,capacity:row.capacity,fillRatio:ratio,visibleSlots:filled,totalSlots:slots[id].length};
  }
 }
 function dispose(){for(const geo of geometries.values())geo.dispose();for(const material of materials.values())material.dispose();root.clear();geometries.clear();materials.clear()}
 update();return{root,update,dispose};
}
