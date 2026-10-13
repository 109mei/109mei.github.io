import * as THREE from './vendor/three/build/three.module.js';
import {expansionMetrics} from './building.mjs?v=20261013-qa6';

/** Street is scenery, never purchased floor or simulation navigation. */
export function streetMetrics(layout={}){
 const m=expansionMetrics(layout),sidewalkZ=m.terraceFloor.maxZ+1.35;
 return {sidewalkZ,roadZ:sidewalkZ+3.35,laneX:-4.35,edgeX:25,fadeStart:17,
  contextBounds:{minX:-17.4,maxX:12.8,minZ:-.8,maxZ:sidewalkZ+5.7}};
}
export function createStreetScene(layout={}){
 const root=new THREE.Group();root.name='NEIGHBORHOOD_STREET';root.userData.sceneryOnly=true;
 const geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),sphere:new THREE.SphereGeometry(1,10,7)};
 const palette=new Map();let disposed=false;
 const mat=color=>{if(!palette.has(color))palette.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return palette.get(color)};
 function mesh(parent,name,kind,color,x,y,z,w,h,d){const o=new THREE.Mesh(geometry[kind],mat(color));o.name=name;o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 const box=(p,n,c,x,y,z,w,h,d)=>mesh(p,n,'box',c,x,y,z,w,h,d);
 function shop(parent,name,x,z,color,awning){
  const g=new THREE.Group();g.name=name;g.position.set(x,0,z);parent.add(g);
  box(g,'NEIGHBOR_PLASTER',color,0,1.42,0,3.7,2.84,3.5);
  box(g,'NEIGHBOR_FLAT_ROOF','#67685b',0,2.92,0,3.95,.16,3.7);
  box(g,'NEIGHBOR_SHOP_WINDOW','#496567',-.65,1.35,1.765,1.85,1.65,.04);
  box(g,'NEIGHBOR_SHOP_DOOR','#38514b',1.03,1.12,1.775,.77,2.24,.055);
  box(g,'NEIGHBOR_DOOR_GLASS','#90aba1',1.03,1.48,1.81,.61,1.26,.02);
  box(g,'NEIGHBOR_WINDOW_SILL','#eee2c9',-.65,.53,1.82,1.98,.12,.2);
  box(g,'NEIGHBOR_FASCIA',awning,0,2.55,1.83,3.48,.35,.13);
  const canopy=box(g,'NEIGHBOR_AWNING',awning,0,2.3,2.04,3.5,.12,.64);canopy.rotation.x=.15;
  // Original simple shop emblems: books on one side, a flower on the other.
  if(name==='NEIGHBOR_BOOKSHOP')for(let i=0;i<5;i++)box(g,'BOOK_WINDOW_DISPLAY',['#bc7259','#baa76b','#6d8780'][i%3],-1.3+i*.3,.81,1.82,.19,.43+(i%2)*.12,.09);
  else for(const x of[-1.1,-.4]){box(g,'FLOWER_STEM','#627752',x,.93,1.83,.035,.6,.03);for(let i=0;i<5;i++)mesh(g,'FLOWER_PETAL','sphere','#d7a170',x+Math.cos(i*1.257)*.13,1.24+Math.sin(i*1.257)*.13,1.85,.1,.1,.05)}
 }
 function update(state={}){
  root.clear();const m=streetMetrics(state);root.userData.metrics=m;const z=m.sidewalkZ;
  box(root,'STREET_ASPHALT','#777d78',0,-.23,m.roadZ,80,.14,4.8);
  box(root,'STREET_SIDEWALK','#c7c1af',0,-.09,z,80,.15,2.15);
  box(root,'STREET_CURB_LEFT','#ece4d0',-28.6,-.05,z+1.09,22.8,.2,.13);
  box(root,'STREET_CURB_RIGHT','#ece4d0',12.4,-.05,z+1.09,55.2,.2,.13);
  box(root,'PARKING_DRIVEWAY_CROSSING','#a9b2a6',-16.2,-.006,z,2,.015,2.2);
  box(root,'CAFE_SIDE_ACCESS','#c7c1af',m.laneX,-.09,(2.94+z)/2,1.02,.15,z-2.94);
  box(root,'CAFE_FRONT_ACCESS','#c7c1af',-2.17,-.09,2.96,4.36,.15,.4);
  for(let x=-36;x<=36;x+=4)box(root,'ROAD_DASH','#e0d9c2',x,-.151,m.roadZ,1.6,.014,.10);
  for(let x=-24;x<=24;x+=2)box(root,'PAVEMENT_JOINT','#aaa997',x,-.009,z,.018,.008,2.02);
  // Neither façade overlaps café (-3.6..4.1) or storage (4.2..9.8, z< -1).
  shop(root,'NEIGHBOR_BOOKSHOP',-7.6,z-3.12,'#d0bfa6','#6f897c');
  shop(root,'NEIGHBOR_FLOWER_SHOP',10.8,z-3.12,'#d5c3b2','#b87e63');
  for(const x of[-11.3,15.3]){
   mesh(root,'STREET_LAMP_POST','cylinder','#4c5c53',x,1.35,z+.68,.047,2.75,.047);
   box(root,'STREET_LAMP','#f7e6b9',x,2.78,z+.68,.31,.29,.31);
   box(root,'STREET_LAMP_CAP','#4c5c53',x,2.96,z+.68,.43,.08,.43);
  }
 }
 update(layout);return {root,update,dispose(){if(disposed)return;disposed=true;root.clear();Object.values(geometry).forEach(g=>g.dispose());palette.forEach(m=>m.dispose())}};
}
