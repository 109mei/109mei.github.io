import * as THREE from './vendor/three/build/three.module.js';
import {streetMetrics} from './street-scene.mjs?v=20261013-qa4';

// Presentation only: reservations reference guest IDs, never business/economy state.
export const PARKING_CAPACITY=3;
export function parkingMetrics(layout={}){
 const street=streetMetrics(layout),z=street.sidewalkZ;
 return {street,bounds:{minX:-17.2,maxX:-9.85,minZ:z-5.2,maxZ:z-.95},driveX:-16.2,aisleZ:z-1.35,
  bays:[-14.6,-12.8,-11].map((x,index)=>({index,x,z:z-3.6})),roadLaneZ:z+2.3};
}
export function parkingDriveRoute(bay,layout={}){const m=parkingMetrics(layout);return [{x:-m.street.edgeX-2,z:m.roadLaneZ},{x:m.driveX,z:m.roadLaneZ},{x:m.driveX,z:m.aisleZ},{x:bay.x,z:m.aisleZ},{x:bay.x,z:bay.z}]}
export function parkingWalkRoute(bay,layout={}){const m=parkingMetrics(layout);return [{x:bay.x+.69,z:bay.z},{x:bay.x+.69,z:m.aisleZ},{x:bay.x+.69,z:m.street.sidewalkZ},{x:m.street.laneX,z:m.street.sidewalkZ},{x:m.street.laneX,z:2.96},{x:0,z:2.96},{x:0,z:3.1}]}
const copy=p=>({x:p.x,z:p.z});
export function createParkingController(layout={}){
 let current=layout,disposed=false;const cars=new Map();
 function reserve(id){if(disposed||id===undefined||id===null)return false;if(cars.has(id))return true;
  const bay=parkingMetrics(current).bays.find(b=>![...cars.values()].some(c=>c.bay.index===b.index));if(!bay)return false;
  const route=parkingDriveRoute(bay,current);cars.set(id,{id,bay,phase:'arriving',started:false,position:copy(route[0]),heading:Math.PI/2,route,index:1});return true;}
 function get(id){const c=cars.get(id);return c?{id:c.id,bay:{...c.bay},phase:c.phase,position:copy(c.position),heading:c.heading,visible:c.phase!=='arriving'||c.started}:null;}
 function beginDeparture(id){const c=cars.get(id);if(!c||c.phase!=='parked')return false;c.phase='departing';c.started=false;c.route=parkingDriveRoute(c.bay,current).reverse();c.index=1;return true;}
 function step(dt,{paused=false,reducedMotion=false}={}){if(disposed||paused)return;let delta=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  if(!delta&&!reducedMotion)return;
  const moving=[...cars.values()].find(c=>c.phase!=='parked'&&c.started)||[...cars.values()].find(c=>c.phase!=='parked');
  for(const [id,c]of cars){if(c!==moving)continue;c.started=true;let budget=reducedMotion?Infinity:delta*5;
   while(budget>0&&c.index<c.route.length){const p=c.route[c.index],dx=p.x-c.position.x,dz=p.z-c.position.z,d=Math.hypot(dx,dz);if(d>.001)c.heading=c.phase==='departing'&&c.index===1?Math.atan2(-dx,-dz):Math.atan2(dx,dz);
    if(d<=budget){c.position=copy(p);budget-=d;c.index++;}else{c.position.x+=dx/d*budget;c.position.z+=dz/d*budget;budget=0;}}
   if(c.index>=c.route.length){if(c.phase==='arriving')c.phase='parked';else cars.delete(id);}
  }
 }
 function reset(){cars.clear();}
 return {reserve,get,beginDeparture,step,reset,walkRoute(id){const c=cars.get(id);return c?parkingWalkRoute(c.bay,current):[];},snapshots(){return [...cars.keys()].map(get);},updateLayout(next){current=next;reset();},dispose(){disposed=true;reset();}};
}
export function createParkingScene(layout={}){
 const controller=createParkingController(layout),root=new THREE.Group(),fixtures=new THREE.Group(),vehicles=new THREE.Group();root.name='CAFE_CUSTOMER_PARKING';root.userData.sceneryOnly=true;fixtures.name='PARKING_FIXTURES';vehicles.name='CUSTOMER_CARS';root.add(fixtures,vehicles);
 const geometry=new THREE.BoxGeometry(1,1,1),wheelGeometry=new THREE.CylinderGeometry(1,1,1,10),materials=new Map(),carObjects=new Map();let disposed=false;
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.8}));return materials.get(color)};
 function box(parent,name,color,x,y,z,w,h,d){const o=new THREE.Mesh(geometry,mat(color));o.name=name;o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function build(next){fixtures.clear();const m=parkingMetrics(next),b=m.bounds;root.userData.bounds=b;
  box(fixtures,'PARKING_PAVEMENT','#888b80',(b.minX+b.maxX)/2,-.105,(b.minZ+b.maxZ)/2,b.maxX-b.minX,.1,b.maxZ-b.minZ);
  box(fixtures,'PARKING_DRIVEWAY','#a6a797',m.driveX,-.065,(m.aisleZ+m.roadLaneZ)/2,1.85,.06,m.roadLaneZ-m.aisleZ);
  box(fixtures,'PARKING_REAR_CURB','#d3ccba',(b.minX+b.maxX)/2,.015,b.minZ,b.maxX-b.minX,.2,.13);
  for(const bay of m.bays){for(const dx of[-.84,.84])box(fixtures,'BAY_LINE','#f2e9d1',bay.x+dx,-.047,bay.z,.04,.015,2.65);box(fixtures,'BAY_WHEEL_STOP','#d6ccb3',bay.x,.035,bay.z-1.22,1.1,.15,.16);}
  box(fixtures,'PARKING_SIGN_POST','#526458',-16.65,.9,b.minZ+.3,.07,1.8,.07);box(fixtures,'PARKING_SIGN','#5e8074',-16.65,1.72,b.minZ+.3,.55,.62,.09);
  // Solid-geometry P glyph, no fonts, textures, or fetched assets.
  box(fixtures,'P_STEM','#faf3dc',-16.78,1.72,b.minZ+.355,.055,.39,.018);box(fixtures,'P_TOP','#faf3dc',-16.68,1.89,b.minZ+.355,.22,.05,.018);box(fixtures,'P_MIDDLE','#faf3dc',-16.68,1.72,b.minZ+.355,.22,.05,.018);box(fixtures,'P_LOOP','#faf3dc',-16.57,1.81,b.minZ+.355,.05,.2,.018);
 }
 function makeCar(c){const g=new THREE.Group();g.name='CUSTOMER_CAR_'+String(c.id);g.userData.customerId=c.id;const color=['#b57760','#779c96','#d0b675'][c.bay.index];
  box(g,'CAR_BODY',color,0,.37,0,1.2,.4,2.15);box(g,'CAR_CABIN',color,0,.68,-.05,1.06,.39,1.23);box(g,'CAR_WINDSCREEN','#607d80',0,.72,.575,.91,.23,.022);box(g,'CAR_REAR_WINDOW','#607d80',0,.72,-.675,.91,.23,.022);
  for(const side of[-1,1]){box(g,'CAR_SIDE_WINDOW','#607d80',side*.539,.72,-.05,.016,.23,.91);for(const z of[-.68,.68]){const wheel=new THREE.Mesh(wheelGeometry,mat('#38433e'));wheel.name='CAR_WHEEL';wheel.rotation.z=Math.PI/2;wheel.position.set(side*.61,.23,z);wheel.scale.set(.23,.12,.23);g.add(wheel);}box(g,'CAR_HEADLIGHT','#f7e5af',side*.39,.42,1.084,.22,.14,.025);box(g,'CAR_TAILLIGHT','#b45148',side*.39,.42,-1.084,.2,.12,.025);}
  const owned=new Map();g.traverse(o=>{if(o.isMesh){if(!owned.has(o.material)){const material=o.material.clone();material.transparent=true;owned.set(o.material,material)}o.material=owned.get(o.material)}});g.userData.materials=[...owned.values()];vehicles.add(g);carObjects.set(c.id,g);return g;
 }
 function render(){const cars=controller.snapshots(),ids=new Set(cars.map(c=>c.id));for(const[id,g]of carObjects)if(!ids.has(id)){vehicles.remove(g);g.userData.materials.forEach(m=>m.dispose());carObjects.delete(id)}for(const c of cars){const g=carObjects.get(c.id)||makeCar(c);g.position.set(c.position.x,0,c.position.z);g.rotation.y=c.heading;g.userData.phase=c.phase;g.visible=c.visible;const opacity=Math.max(0,Math.min(1,(27-Math.abs(c.position.x))/3));g.userData.materials.forEach(m=>{m.opacity=opacity;m.depthWrite=opacity>.98});}}
 build(layout);
 return {root,reserve(id){const r=controller.reserve(id);render();return r},get:controller.get,walkRoute:controller.walkRoute,beginDeparture:controller.beginDeparture,snapshots:controller.snapshots,
  step(dt,options){controller.step(dt,options);render()},reset(){controller.reset();render()},updateLayout(next){if(disposed)return;controller.updateLayout(next);build(next);render()},
  dispose(){if(disposed)return;disposed=true;controller.dispose();carObjects.forEach(g=>g.userData.materials.forEach(m=>m.dispose()));carObjects.clear();root.clear();geometry.dispose();wheelGeometry.dispose();materials.forEach(m=>m.dispose());}};
}
