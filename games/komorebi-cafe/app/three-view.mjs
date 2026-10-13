import {courierRecords} from './courier-scene.mjs?v=20261013-qa5';
import {createParkingScene} from './parking-scene.mjs?v=20261013-qa5';
import {createStreetScene} from './street-scene.mjs?v=20261013-qa5';
import {approachRoute,interiorRoute,departureRoute,streetOpacity,cleanRoute} from './street-arrivals.mjs?v=20261013-qa5';
import{fitBoxDistance}from'./camera-framing.mjs?v=20261013-qa5';
import * as THREE from 'three';
import {createCafeControls,cafeControlKey} from './diegetic-controls.mjs?v=20261013-qa5';
import {createTapHandlers} from './interactions.mjs?v=20261013-qa5';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {instantiate,tint,disposeMaterials,disposeResources,buildProceduralPrototype,applyAppearance,createFinishTexture} from './scene-data.mjs?v=20261013-qa5';
import {itemAppearance,growthLevels} from './core.mjs?v=20261013-qa5';
import {buildExpansion,expansionMetrics,disposeExpansion} from './building.mjs?v=20261013-qa5';
import {createStorageView,STORAGE_BOUNDS,STORAGE_FOCUS} from './storage-view.mjs?v=20261013-qa5';
import {createFoodFactory} from './food.mjs?v=20261013-qa5';
import {availableDisplayRecipes,tableFoodPlacements} from './service-display.mjs?v=20261013-qa5';
import {createCharacterFactory,updateCharacterPose,characterMode,characterVisible,setCharacterMenu} from './people.mjs?v=20261013-qa5';

export async function create3D(host,manifest,select,lost,onHotspot=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xe9eadf);host.replaceChildren(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xe9eadf,24,55);const camera=new THREE.PerspectiveCamera(39,1,.1,80);camera.position.set(11,11,16);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.5,1.6);controls.minDistance=6;controls.maxDistance=28;controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI*.46;controls.enableDamping=true;controls.dampingFactor=.08;controls.screenSpacePanning=false;controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.rotateSpeed=.65;controls.panSpeed=.7;
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
 const street=createStreetScene();scene.add(street.root);const parking=createParkingScene();scene.add(parking.root);
 const storageView=createStorageView();scene.add(storageView.root);storageView.root.userData.cafeControl='storage';
 const cafeControls=createCafeControls();scene.add(cafeControls.root);let cameraFocus='cafe';
 const backWall=room.scene.getObjectByName('ROOM_BACK'),originalBackZ=backWall?.position.z??0;
 const foodFactory=createFoodFactory(),servedFood=new Map(),displayFood=new THREE.Group();displayFood.name='CAFE_MENU_DISPLAY';scene.add(displayFood);let lastDisplayKey='';
 let cameraTween=null;
 controls.addEventListener('start',()=>{cameraTween=null});
 function fitCamera(smooth=false){
  const storageFocused=cameraFocus==='storage',kitchen=cameraFocus==='kitchen',parkingFocused=cameraFocus==='parking';
  const minZ=metrics.bounds.indoor.minZ,maxZ=metrics.bounds.terrace.maxZ;
  const target=parkingFocused?new THREE.Vector3(-13.5,.6,metrics.terraceFloor.maxZ-1):storageFocused?new THREE.Vector3(STORAGE_FOCUS.x,STORAGE_FOCUS.y,STORAGE_FOCUS.z):kitchen?new THREE.Vector3(0,.9,-1):new THREE.Vector3(0,.75,(minZ+maxZ)/2);
  const direction=new THREE.Vector3(1,1.05,1.5).normalize(),width=parkingFocused?8:storageFocused?STORAGE_FOCUS.width:kitchen?5:8.4,depth=parkingFocused?7:storageFocused?STORAGE_FOCUS.depth:kitchen?4:maxZ-minZ+1.2,height=storageFocused?STORAGE_FOCUS.height:3.3;
  const distance=fitBoxDistance({width,depth,height,aspect:camera.aspect,fov:camera.fov,direction:direction.toArray(),padding:1.15});
  const position=target.clone().addScaledVector(direction,distance);controls.maxDistance=Math.max(28,distance*1.8);camera.far=Math.max(100,distance+metrics.totalDepth*4);camera.updateProjectionMatrix();
  if(smooth&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)cameraTween={position,target};else{cameraTween=null;camera.position.copy(position);controls.target.copy(target);controls.update()}
  const radius=Math.hypot(width,depth,height)/2;scene.fog.near=distance+radius;scene.fog.far=distance+radius*5;
  const span=Math.max(12,metrics.totalDepth*.75);sun.position.set(-5,Math.max(9,span),metrics.centerZ+7);sun.target.position.set(3,0,metrics.centerZ);scene.add(sun.target);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,far:Math.max(50,span*5)});sun.shadow.camera.updateProjectionMatrix();
 }
 function focusStorage(){cameraFocus='storage';fitCamera(true)}
 function focusCafe(){cameraFocus='cafe';fitCamera(true)}
 function focusKitchen(){cameraFocus='kitchen';fitCamera(true)}
 function focusParking(){cameraFocus='parking';fitCamera(true)}
 function resetCamera(){cameraFocus='cafe';fitCamera(true)}
 function constrainCamera(){const before=controls.target.clone();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-18,15);controls.target.y=THREE.MathUtils.clamp(controls.target.y,.3,2);controls.target.z=THREE.MathUtils.clamp(controls.target.z,Math.min(STORAGE_BOUNDS.minZ,metrics.bounds.indoor.minZ)-3,metrics.terraceFloor.maxZ+8);camera.position.add(controls.target.clone().sub(before));camera.position.y=Math.max(.6,camera.position.y)}
 function updateStructure(state){
  const key=JSON.stringify(growthLevels(state));if(key===lastGrowthKey)return;lastGrowthKey=key;
  structure.traverse(o=>{if(o.isMesh)for(const material of(Array.isArray(o.material)?o.material:[o.material]))originalMaps.delete(material)});
  scene.remove(structure);disposeExpansion(structure);structure=buildExpansion(state);metrics=expansionMetrics(state);resetPeople();street.update(state);parking.updateLayout(state);scene.add(structure);if(backWall)backWall.position.z=originalBackZ+metrics.rearOffset;lastFinishes='';fitCamera();
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
 let playback={paused:false,speed:1},businessSnapshot=null,previousBusiness=null;
 function setPlayback(value={}){playback={paused:!!value.paused,speed:Math.max(1,Math.min(4,Number(value.speed)||1))}}
 function actorOpacity(actor,alpha){
  if(alpha>=.999&&!actor.fadeMaterials)return;
  if(!actor.fadeMaterials)actor.fadeMaterials=new Map();
  actor.model.root.traverse(o=>{if(!o.isMesh)return;const material=o.material;
   if(alpha>=.999){if(o.userData.streetBaseMaterial){o.material=o.userData.streetBaseMaterial;delete o.userData.streetBaseMaterial}return}
   if(!o.userData.streetBaseMaterial){o.userData.streetBaseMaterial=material;if(!actor.fadeMaterials.has(material)){const clone=material.clone();clone.transparent=true;clone.depthWrite=false;actor.fadeMaterials.set(material,clone)}o.material=actor.fadeMaterials.get(material)}
   o.material.opacity=o.userData.streetBaseMaterial.opacity*alpha;
  });
  if(alpha>=.999){for(const m of actor.fadeMaterials.values())m.dispose();actor.fadeMaterials=null}
 }
 function removeActor(id,actor){scene.remove(actor.model.root);if(actor.fadeMaterials)for(const m of actor.fadeMaterials.values())m.dispose();actors.delete(id)}
 function resetPeople(){for(const[id,actor]of actors)removeActor(id,actor);previousBusiness=null;businessSnapshot=null;parking.reset()}
 function visualCustomers(customers){return customers.filter(c=>{if(c.stage==='cleaning')return true;const actor=actors.get('customer-'+c.id);return actor&&!actor.approaching&&!actor.departing&&actor.path.length===0})}
 function beginDeparture(actor){
  if(actor.departing)return;actor.departing=true;actor.mode='walking';actor.record={...actor.record,stage:'departed'};if(actor.carArrivalWaiting){actor.cancelledCarArrival=true;return}
  // A customer whose presentation is still outside returns along the access lane.
  if(actor.approaching){const route=actor.approachPath??approachRoute(actor.record.actorId,layout);let nearest=0,d=Infinity;route.forEach((p,i)=>{const n=Math.hypot(p.x-actor.model.root.position.x,p.z-actor.model.root.position.z);if(n<d){d=n;nearest=i}});actor.path=cleanRoute(route.slice(0,nearest+1).reverse());actor.approaching=false}
  else actor.path=departureRoute(actor.record.actorId,actor.model.root.position,actor.entryPath,layout,actor.approachPath);
 }
 function updateBusiness(business){
  business??={};storageView.update(business);
  const customers=Array.isArray(business)?business:business.customers??[],staff=business.staffActors??[];
  // Reset on imported/rewound/new-day state, never carry customer identities across saves.
  if(previousBusiness&&(business.day!==previousBusiness.day||business.minute<previousBusiness.minute||business.phase==='planning'))resetPeople();
  const initial=!previousBusiness;previousBusiness={day:business.day,minute:business.minute};businessSnapshot=business;
  const all=[...customers.map(c=>({...c,actorId:'customer-'+c.id})),...courierRecords(business),...staff.map(c=>({...c,actorId:'staff-'+c.id,staff:true}))].filter(characterVisible),ids=new Set(all.map(c=>c.actorId));
  updateDisplays(business);
  for(const[id,actor]of actors)if(!ids.has(id)){if(actor.record.staff)removeActor(id,actor);else beginDeparture(actor)}
  for(const c of all){const x=c.x,z=c.z;if(!Number.isFinite(x)||!Number.isFinite(z))continue;let actor=actors.get(c.actorId);
   if(!actor){const model=people.create(c.actorId,{staff:!!c.staff,role:c.role}),approaching=!c.staff&&!initial;
    const carArrivalWaiting=approaching&&!c.courier&&parking.reserve(c.actorId),entryPath=interiorRoute(c,business),route=approaching?(carArrivalWaiting?parking.walkRoute(c.actorId):approachRoute(c.actorId,layout)):[];
    model.root.position.set(approaching?route[0].x:x,0,approaching?route[0].z:z);
    actor={model,record:c,goal:{x,z},path:route.slice(1),yaw:0,mode:characterMode(c),approaching,entryPath,approachPath:route,carArrivalWaiting,hasCar:carArrivalWaiting};model.root.visible=!carArrivalWaiting;actors.set(c.actorId,actor);scene.add(model.root);if(approaching)actorOpacity(actor,0);
   }
   if(actor.departing)continue;
   actor.entryPath=interiorRoute(c,business);
   if(Math.hypot(actor.goal.x-x,actor.goal.z-z)>.015){if(!actor.approaching)actor.path=routeFor(actor,c,x,z);actor.goal={x,z}}
   actor.record=c;actor.mode=characterMode(c);const table=layout?.instances.find(o=>o.id===c.tableId),guest=customers.find(g=>g.id===c.task?.customerId)??business.delivery?.orders?.find(o=>o.id===c.task?.deliveryOrderId),counter=layout?.instances.find(o=>o.type==='counter');const target=c.staff?(['prepare','deliveryPrepare','deliveryPack','deliveryHandoff'].includes(c.task?.kind)?counter:guest):table;setCharacterMenu(actor.model,c.staff?(guest?.order??[]):(c.order??[]));
   if(target&&Math.hypot(target.x-x,target.z-z)>.03)actor.yaw=Math.atan2(target.x-x,target.z-z);else if(Number.isFinite(c.targetX)&&Math.hypot(c.targetX-x,c.targetZ-z)>.03)actor.yaw=Math.atan2(c.targetX-x,c.targetZ-z);
  }
  updateServedFood(visualCustomers(customers));
 }
 function animatePeople(dt,time){
  let foodChanged=false;const parkingPaused=playback.paused&&businessSnapshot?.phase==='open';parking.step(dt*playback.speed,{paused:parkingPaused});
  for(const[id,actor]of actors){const root=actor.model.root;
   if(actor.carArrivalWaiting){if(parking.get(id)?.phase!=='parked')continue;actor.carArrivalWaiting=false;if(actor.cancelledCarArrival){parking.beginDeparture(id);removeActor(id,actor);continue}root.visible=true;root.position.set(actor.approachPath[0].x,0,actor.approachPath[0].z);actorOpacity(actor,1)}
   // Once accounting closes, let the final exit finish; explicit pause while open freezes travel.
   const paused=playback.paused&&businessSnapshot?.phase==='open';
   let budget=paused?0:dt*3.4*playback.speed,moving=false,heading=actor.yaw;
   while(actor.path.length&&budget>0){const next=actor.path[0],dx=next.x-root.position.x,dz=next.z-root.position.z,d=Math.hypot(dx,dz);if(d<.025){actor.path.shift();continue}moving=true;heading=Math.atan2(dx,dz);const step=Math.min(budget,d);root.position.x+=dx/d*step;root.position.z+=dz/d*step;budget-=step;if(step>=d-.001)actor.path.shift()}
   if(!actor.path.length){if(actor.departing){if(actor.hasCar)parking.beginDeparture(id);removeActor(id,actor);continue}if(actor.approaching){actor.approaching=false;actor.path=cleanRoute(actor.entryPath);foodChanged=true}else if(moving)foodChanged=true}
   if(!actor.record.staff)actorOpacity(actor,streetOpacity(root.position,layout));
   const diff=Math.atan2(Math.sin(heading-root.rotation.y),Math.cos(heading-root.rotation.y));root.rotation.y+=diff*(1-Math.exp(-dt*11));
   const mode=(moving||actor.approaching||actor.departing)&&!actor.record.staff?'walking':actor.mode;
   updateCharacterPose(actor.model,{mode,time:paused?0:time,walking:moving&&!paused,speed:1},paused?0:dt);
  }
  if(foodChanged&&businessSnapshot)updateServedFood(visualCustomers(Array.isArray(businessSnapshot)?businessSnapshot:businessSnapshot.customers??[]));
 }

 function resize(){const w=host.clientWidth||600,h=host.clientHeight||490;if(w===lastWidth&&h===lastHeight)return;lastWidth=w;lastHeight=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fitCamera()}
 const obs=new ResizeObserver(resize);obs.observe(host);resize();const ray=new THREE.Raycaster(),point=new THREE.Vector2();
 const tapHandlers=createTapHandlers(e=>{const r=renderer.domElement.getBoundingClientRect();point.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(point,camera);const pickable=[];scene.traverseVisible(o=>{if(o.isMesh&&!(o.material?.transparent&&o.material.opacity<.3))pickable.push(o)});const hit=ray.intersectObjects(pickable,false)[0];if(hit){const action=cafeControlKey(hit.object);if(action){onHotspot(action);return}let o=hit.object;while(o&&!o.userData.instanceId)o=o.parent;if(o)select(o.userData.instanceId)}});
 for(const[type,handler]of Object.entries(tapHandlers))renderer.domElement.addEventListener(type,handler);
 let alive=true,frame=0;
 function dispose(){if(!alive)return;alive=false;cancelAnimationFrame(frame);obs.disconnect();for(const[type,handler]of Object.entries(tapHandlers))renderer.domElement.removeEventListener(type,handler);controls.dispose();const retained=new THREE.Group();for(const map of new Set([...originalMaps.values(),...textureCache.values()]))if(map){const material=new THREE.MeshBasicMaterial({map});retained.add(new THREE.Mesh(new THREE.BufferGeometry(),material))}for(const actor of actors.values())scene.remove(actor.model.root);resetPeople();people.dispose();displayFood.clear();for(const food of servedFood.values())scene.remove(food);servedFood.clear();foodFactory.dispose();scene.remove(cafeControls.root);cafeControls.dispose();scene.remove(storageView.root);storageView.dispose();scene.remove(street.root);street.dispose();scene.remove(parking.root);parking.dispose();disposeResources([scene,furniture.scene,...Object.values(prototypes),retained]);sun.shadow.dispose();renderer.dispose();host.replaceChildren()}
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();dispose();lost()},{once:true});
 let previous=performance.now();function loop(now=performance.now()){if(!alive)return;frame=requestAnimationFrame(loop);const dt=Math.min(.08,Math.max(0,(now-previous)/1000));previous=now;if(cameraTween){const alpha=1-Math.exp(-dt*8);camera.position.lerp(cameraTween.position,alpha);controls.target.lerp(cameraTween.target,alpha);if(camera.position.distanceTo(cameraTween.position)<.015){camera.position.copy(cameraTween.position);controls.target.copy(cameraTween.target);cameraTween=null}}controls.update();constrainCamera();animatePeople(dt,now/1000);if(!host.hidden)renderer.render(scene,camera)}loop();return{update,updateBusiness,setPlayback,resetPeople,resize,dispose,focusStorage,focusCafe,focusKitchen,focusParking,resetCamera};
}
