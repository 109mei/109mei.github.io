import * as THREE from 'three';
import {createTapHandlers} from './interactions.mjs?v=20261013-qa3';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {instantiate,tint,disposeMaterials,disposeResources,buildProceduralPrototype,applyAppearance,createFinishTexture} from './scene-data.mjs';
import {itemAppearance,growthLevels} from './core.mjs';
import {buildExpansion,expansionMetrics,disposeExpansion} from './building.mjs';
import {createStorageView,STORAGE_BOUNDS,STORAGE_FOCUS} from './storage-view.mjs';
import {createFoodFactory} from './food.mjs';
import {availableDisplayRecipes,tableFoodPlacements} from './service-display.mjs';
import {createCharacterFactory,updateCharacterPose,characterMode,characterVisible,setCharacterMenu} from './people.mjs';

export async function create3D(host,manifest,select,lost){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xe9eadf);host.replaceChildren(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xe9eadf,24,55);const camera=new THREE.PerspectiveCamera(39,1,.1,80);camera.position.set(11,11,16);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.5,1.6);controls.minDistance=6;controls.maxDistance=28;controls.maxPolarAngle=Math.PI/2.08;controls.enableDamping=true;
 const hemi=new THREE.HemisphereLight(0xfff3d6,0x66735a,2);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffedcf,3);sun.position.set(-4,9,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});sun.shadow.normalBias=.03;scene.add(sun);
 const loader=new GLTFLoader();const loaded=await Promise.allSettled([loader.loadAsync('../export/cafe-room.glb'),loader.loadAsync('../export/cafe-furniture.glb')]);
 if(loaded.some(r=>r.status==='rejected')){disposeResources(loaded.filter(r=>r.status==='fulfilled').map(r=>r.value.scene));controls.dispose();renderer.dispose();host.replaceChildren();throw Error('GLB読み込み失敗')}
 const [room,furniture]=loaded.map(r=>r.value),prototypes={};
 for(const[type,p]of Object.entries(manifest.prototypes)){
  const obj=p.procedural?buildProceduralPrototype(p.procedural):furniture.scene.getObjectByName(p.node);
  if(!obj){disposeResources([room.scene,furniture.scene,...Object.values(prototypes)]);controls.dispose();renderer.dispose();host.replaceChildren();throw Error('Missing prototype '+p.node)}if(type==='counter'){const bakedPastry=obj.getObjectByName('ASSET_COUNTER__MAT_PASTRY');if(bakedPastry)bakedPastry.visible=false}prototypes[type]=obj;
 }
 scene.add(room.scene);room.scene.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
 for(const name of['ROOM_ROOF','ROOM_FRONT','ROOM_RIGHT']){const n=room.scene.getObjectByName(name);if(n)n.visible=false}
 const environment=new THREE.Group();scene.add(environment);
 function box(w,h,d,color,x,y,z,name){const mat=new THREE.MeshStandardMaterial({color,roughness:.87});mat.name=name||'';const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.receiveShadow=true;environment.add(o);return o}
 box(200,.1,200,0xe9eadf,0,-.38,0);box(1.24,.055,.5,0xc5bea8,0,-.009,2.99);
 let structure=buildExpansion(),metrics=expansionMetrics(),lastGrowthKey=JSON.stringify({indoor:0,terrace:0});scene.add(structure);
 const storageView=createStorageView();scene.add(storageView.root);let cameraFocus='cafe';
 const backWall=room.scene.getObjectByName('ROOM_BACK'),originalBackZ=backWall?.position.z??0;
 const foodFactory=createFoodFactory(),servedFood=new Map(),displayFood=new THREE.Group();displayFood.name='CAFE_MENU_DISPLAY';scene.add(displayFood);let lastDisplayKey='';
 function fitCamera(){
  const minZ=Math.min(STORAGE_BOUNDS.minZ,metrics.bounds.indoor.minZ),maxZ=metrics.bounds.terrace.maxZ,storageFocused=cameraFocus==='storage';
  const target=storageFocused?new THREE.Vector3(STORAGE_FOCUS.x,STORAGE_FOCUS.y,STORAGE_FOCUS.z):new THREE.Vector3(3.05,.65,(minZ+maxZ)/2),direction=camera.position.clone().sub(controls.target).normalize();
  const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect),radius=storageFocused?Math.hypot(STORAGE_FOCUS.width,STORAGE_FOCUS.depth,STORAGE_FOCUS.height)/2:Math.hypot(14,maxZ-minZ+1.2,3.3)/2;
  const distance=radius/Math.sin(Math.min(vertical,horizontal)/2)*1.08;camera.position.copy(target).addScaledVector(direction,distance);controls.target.copy(target);controls.maxDistance=Math.max(28,distance*1.8);camera.far=Math.max(80,distance+metrics.totalDepth*3);camera.updateProjectionMatrix();
  scene.fog.near=distance+radius;scene.fog.far=distance+radius*5;
  const span=Math.max(12,metrics.totalDepth*.75);sun.position.set(-5,Math.max(9,span),metrics.centerZ+7);sun.target.position.set(3,0,metrics.centerZ);scene.add(sun.target);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,far:Math.max(50,span*5)});sun.shadow.camera.updateProjectionMatrix();
 }
 function focusStorage(){cameraFocus='storage';camera.position.copy(controls.target).add(new THREE.Vector3(1.1,1.2,1.6));fitCamera()}
 function focusCafe(){cameraFocus='cafe';fitCamera()}
 function updateStructure(state){
  const key=JSON.stringify(growthLevels(state));if(key===lastGrowthKey)return;lastGrowthKey=key;
  structure.traverse(o=>{if(o.isMesh)for(const material of(Array.isArray(o.material)?o.material:[o.material]))originalMaps.delete(material)});
  scene.remove(structure);disposeExpansion(structure);structure=buildExpansion(state);metrics=expansionMetrics(state);scene.add(structure);if(backWall)backWall.position.z=originalBackZ+metrics.rearOffset;lastFinishes='';fitCamera();
 }
 const instances=new Map(),actors=new Map(),textureCache=new Map(),originalMaps=new Map(),people=createCharacterFactory({foodFactory});let selection=null,lastFinishes='',layout=null;
 const highlight=new THREE.BoxHelper(new THREE.Object3D(),0xe7a155);highlight.visible=false;scene.add(highlight);
 function texture(kind,surface){const key=surface+':'+kind;if(!textureCache.has(key)){const tex=createFinishTexture(kind);if(tex)tex.repeat.set(...(surface==='wall'?[2,2]:surface==='terrace'?[4,2]:[4,4]));textureCache.set(key,tex)}return textureCache.get(key)}
 function setFinishes(state){const f={wall:'plain',floor:'wood',terrace:'deck',...state.finishes},key=JSON.stringify(f);if(key===lastFinishes)return;lastFinishes=key;
  for(const root of[room.scene,structure])root.traverse(n=>{if(!n.isMesh)return;for(const mat of(Array.isArray(n.material)?n.material:[n.material])){const surface=mat.name==='MAT_FLOOR'?'floor':mat.name==='MAT_WALL'?'wall':mat.name==='MAT_TERRACE'?'terrace':null;if(!surface)continue;if(!originalMaps.has(mat))originalMaps.set(mat,mat.map);mat.map=surface==='wall'&&f.wall==='plain'?originalMaps.get(mat):texture(f[surface],surface);mat.needsUpdate=true}});
 }
 function updateDisplays(business={}){
  if(!layout)return;const pastries=availableDisplayRecipes(business),cases=layout.instances.filter(o=>['pastry_case','counter'].includes(o.type)),key=JSON.stringify([cases.map(o=>[o.id,o.type,o.x,o.z,o.rotationDeg]),pastries]);if(key===lastDisplayKey)return;lastDisplayKey=key;displayFood.clear();
  for(const item of cases){const group=new THREE.Group();group.position.set(item.x,0,item.z);group.rotation.y=THREE.MathUtils.degToRad(item.rotationDeg);displayFood.add(group);for(let i=0;i<Math.min(item.type==='counter'?4:6,pastries.length);i++){const counter=item.type==='counter',food=foodFactory.create(pastries[i],{scale:counter?.61:.56,withDish:!counter});if(counter)food.position.set(i%2===0?-.22:.2,1.172,i<2?.7:1.1);else food.position.set(-.35+i%3*.35,i<3?.706:.936,.025);group.add(food)}}
 }
 function updateServedFood(customers){
  if(!layout)return;const keep=new Set();for(const placement of tableFoodPlacements(layout,customers,manifest)){const {key,menuId,x,y,z,scale,hideServing}=placement;keep.add(key);let food=servedFood.get(key);if(!food){food=foodFactory.create(menuId);servedFood.set(key,food);scene.add(food)}food.position.set(x,y,z);food.scale.setScalar(scale);const serving=food.getObjectByName('food_serving');if(serving)serving.visible=!hideServing;}
  for(const[key,food]of servedFood)if(!keep.has(key)){scene.remove(food);servedFood.delete(key)}
 }
 function update(state,selected,business){
  layout=state;updateStructure(state);
  const ids=new Set(state.instances.map(o=>o.id));for(const[id,obj]of instances)if(!ids.has(id)){scene.remove(obj);disposeMaterials(obj);instances.delete(id)}
  for(const o of state.instances){let obj=instances.get(o.id);if(obj&&obj.userData.type!==o.type){scene.remove(obj);disposeMaterials(obj);instances.delete(o.id);obj=null}
   if(!obj){obj=instantiate(prototypes[o.type],o.id,o.type);instances.set(o.id,obj);scene.add(obj)}obj.position.set(o.x,o.type==='pendant'?(manifest.prototypes.pendant.height??2.35):0,o.z);obj.rotation.set(0,THREE.MathUtils.degToRad(o.rotationDeg),0);tint(obj,state.colors);applyAppearance(obj,itemAppearance(o,state));
  }
  tint(room.scene,state.colors);tint(structure,state.colors);setFinishes(state);structure.traverse(o=>{if(o.isMesh&&o.material.name==='MAT_TERRACE')o.material.color.set(state.colors.terrace??'#b99770')});updateDisplays(business);hemi.intensity=state.light.intensity*1.8;sun.intensity=state.light.intensity*3;sun.color.setRGB(1,1-state.light.warmth*.15,1-state.light.warmth*.38);
  selection=instances.get(selected);highlight.visible=!!selection;if(selection)highlight.setFromObject(selection);if(business)updateBusiness(business);
 }
 function routeFor(actor,record,x,z){
  const candidates=[actor.record?.task?.path,record.task?.path,record.path].filter(path=>Array.isArray(path)&&path.length);let best=null;
  for(const path of candidates){let start=0,end=0,near=Infinity,finish=Infinity;path.forEach((p,i)=>{const d=Math.hypot(p.x-actor.model.root.position.x,p.z-actor.model.root.position.z);if(d<near){near=d;start=i}const f=Math.hypot(p.x-x,p.z-z);if(f<finish){finish=f;end=i}});if(end>=start&&finish<.4&&near<.65){best=path.slice(start,end+1).map(p=>({x:p.x,z:p.z}));break}}
  return [...(best??[]),{x,z}];
 }
 function updateBusiness(business){
  business??={};storageView.update(business);const customers=Array.isArray(business)?business:business.customers??[],staff=business.staffActors??[],all=[...customers.map(c=>({...c,actorId:'customer-'+c.id})),...staff.map(c=>({...c,actorId:'staff-'+c.id,staff:true}))].filter(characterVisible),ids=new Set(all.map(c=>c.actorId));
  updateDisplays(business);updateServedFood(customers);
  for(const[id,actor]of actors)if(!ids.has(id)){scene.remove(actor.model.root);actors.delete(id)}
  for(const c of all){const x=c.x,z=c.z;if(!Number.isFinite(x)||!Number.isFinite(z))continue;let actor=actors.get(c.actorId);if(!actor){const model=people.create(c.actorId,{staff:!!c.staff,role:c.role});model.root.position.set(x,0,z);actor={model,record:c,goal:{x,z},path:[],yaw:0,mode:characterMode(c)};actors.set(c.actorId,actor);scene.add(model.root)}
   if(Math.hypot(actor.goal.x-x,actor.goal.z-z)>.015){actor.path=routeFor(actor,c,x,z);actor.goal={x,z}}
   actor.record=c;actor.mode=characterMode(c);const table=layout?.instances.find(o=>o.id===c.tableId),guest=customers.find(g=>g.id===c.task?.customerId),counter=layout?.instances.find(o=>o.type==='counter');const target=c.staff?(c.task?.kind==='prepare'?counter:guest):table;setCharacterMenu(actor.model,c.staff?(guest?.order??[]):(c.order??[]));
   if(target&&Math.hypot(target.x-x,target.z-z)>.03)actor.yaw=Math.atan2(target.x-x,target.z-z);else if(Number.isFinite(c.targetX)&&Math.hypot(c.targetX-x,c.targetZ-z)>.03)actor.yaw=Math.atan2(c.targetX-x,c.targetZ-z);
  }
 }
 function animatePeople(dt,time){
  for(const actor of actors.values()){const root=actor.model.root;let budget=dt*3.4,moving=false,heading=actor.yaw;
   while(actor.path.length&&budget>0){const next=actor.path[0],dx=next.x-root.position.x,dz=next.z-root.position.z,d=Math.hypot(dx,dz);if(d<.025){actor.path.shift();continue}moving=true;heading=Math.atan2(dx,dz);const step=Math.min(budget,d);root.position.x+=dx/d*step;root.position.z+=dz/d*step;budget-=step;if(step>=d-.001)actor.path.shift()}
   const diff=Math.atan2(Math.sin(heading-root.rotation.y),Math.cos(heading-root.rotation.y));root.rotation.y+=diff*(1-Math.exp(-dt*11));const mode=moving&&!actor.record.staff?'walking':actor.mode;updateCharacterPose(actor.model,{mode,time,walking:moving,speed:1},dt);
  }
 }

 function resize(){const w=host.clientWidth||600,h=host.clientHeight||490;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fitCamera()}
 const obs=new ResizeObserver(resize);obs.observe(host);resize();const ray=new THREE.Raycaster(),point=new THREE.Vector2();
 const tapHandlers=createTapHandlers(e=>{const r=renderer.domElement.getBoundingClientRect();point.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(point,camera);const hit=ray.intersectObjects([...instances.values()],true)[0];if(hit){let o=hit.object;while(o&&!o.userData.instanceId)o=o.parent;if(o)select(o.userData.instanceId)}});
 for(const[type,handler]of Object.entries(tapHandlers))renderer.domElement.addEventListener(type,handler);
 let alive=true,frame=0;
 function dispose(){if(!alive)return;alive=false;cancelAnimationFrame(frame);obs.disconnect();for(const[type,handler]of Object.entries(tapHandlers))renderer.domElement.removeEventListener(type,handler);controls.dispose();const retained=new THREE.Group();for(const map of new Set([...originalMaps.values(),...textureCache.values()]))if(map){const material=new THREE.MeshBasicMaterial({map});retained.add(new THREE.Mesh(new THREE.BufferGeometry(),material))}for(const actor of actors.values())scene.remove(actor.model.root);people.dispose();displayFood.clear();for(const food of servedFood.values())scene.remove(food);servedFood.clear();foodFactory.dispose();scene.remove(storageView.root);storageView.dispose();disposeResources([scene,furniture.scene,...Object.values(prototypes),retained]);sun.shadow.dispose();renderer.dispose();host.replaceChildren()}
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();dispose();lost()},{once:true});
 let previous=performance.now();function loop(now=performance.now()){if(!alive)return;frame=requestAnimationFrame(loop);const dt=Math.min(.08,Math.max(0,(now-previous)/1000));previous=now;controls.update();animatePeople(dt,now/1000);if(!host.hidden)renderer.render(scene,camera)}loop();return{update,updateBusiness,resize,dispose,focusStorage,focusCafe};
}
