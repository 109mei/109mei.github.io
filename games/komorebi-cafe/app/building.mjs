import * as THREE from './vendor/three/build/three.module.js';
import {layoutBounds,growthLevels} from './core.mjs?v=20261013-qa4';

/** Dimensions are derived from the same purchased bounds as placement and pathfinding. */
export function expansionMetrics(layout={}){
 const bounds=layoutBounds(layout),growth=growthLevels(layout),indoorExtra=2.4*growth.indoor,terraceExtra=1.2*growth.terrace;
 return {bounds,growth,indoorExtra,terraceExtra,rearOffset:-indoorExtra,
  indoorFloor:{minX:-3,maxX:3,minZ:-2.75-indoorExtra,maxZ:-2.75},
  terraceFloor:{minX:-3.5,maxX:3.5,minZ:3.15,maxZ:6.65+terraceExtra},
  centerZ:(bounds.indoor.minZ+bounds.terrace.maxZ)/2,
  totalDepth:bounds.terrace.maxZ-bounds.indoor.minZ+1.2};
}

/** Rebuildable annex and terrace. The original room and furniture stay untouched. */
export function buildExpansion(layout={}){
 const root=new THREE.Group();root.name='CAFE_PURCHASED_EXPANSION';const metrics=expansionMetrics(layout);root.userData.metrics=metrics;
 const materials=new Map();
 const mat=(name,color,props={})=>{if(!materials.has(name)){const material=new THREE.MeshStandardMaterial({color,roughness:.84,...props});material.name=name;materials.set(name,material)}return materials.get(name)};
 const floor=mat('MAT_FLOOR','#c2ad8a'),wall=mat('MAT_WALL','#e8dfcf'),wood=mat('MAT_WOOD','#70543e'),terrace=mat('MAT_TERRACE','#b99770'),stone=mat('MAT_FOUNDATION','#898376'),rail=mat('MAT_GARDEN_RAIL','#657457'),leaf=mat('MAT_GARDEN_LEAF','#71895b'),soil=mat('MAT_GARDEN_SOIL','#4e4939'),glass=mat('MAT_ANNEX_GLASS','#b5d3d0',{transparent:true,opacity:.22,roughness:.16,depthWrite:false}),metal=mat('MAT_ANNEX_METAL','#455a47',{roughness:.45}),lamp=mat('MAT_ANNEX_GLOW','#fff0c5',{emissive:'#ffd887',emissiveIntensity:.38});
 const add=(geometry,material,x,y,z,name)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh};
 const box=(w,h,d,material,x,y,z,name)=>add(new THREE.BoxGeometry(w,h,d),material,x,y,z,name);
 const cylinder=(r,h,material,x,y,z,name)=>add(new THREE.CylinderGeometry(r,r,h,10),material,x,y,z,name);
 // Original floor ends at -2.75 m. No threshold or wall blocks this full-width opening.
 for(let i=0;i<metrics.growth.indoor;i++){
  const z=-2.75-2.4*(i+.5),tag=`ANNEX_${i+1}`;
  box(6,.05,2.4,floor,0,-.025,z,`${tag}_FLOOR`);
  box(6.4,.27,2.4,stone,0,-.185,z,`${tag}_FOUNDATION`);
  // The left wall repeats the original sill, plaster and large timber-framed windows.
  box(.16,.86,2.4,wall,-3.08,.43,z,`${tag}_SILL_WALL`);
  box(.16,.3,2.4,wall,-3.08,2.85,z,`${tag}_TOP_WALL`);
  for(const dz of[-1.14,1.14])box(.16,1.84,.12,wall,-3.08,1.78,z+dz,`${tag}_WALL_PIER`);
  box(.015,1.72,2.14,glass,-3.075,1.79,z,`${tag}_WINDOW_GLASS`);
  for(const dz of[-1.09,0,1.09])box(.095,1.82,.07,wood,-2.994,1.79,z+dz,`${tag}_WINDOW_MULLION`);
  for(const y of[.88,1.76,2.69])box(.105,.065,2.23,wood,-2.982,y,z,`${tag}_WINDOW_RAIL`);
  box(.24,.07,2.26,wood,-2.96,.865,z,`${tag}_WINDOW_SILL`);
  box(.12,.14,2.4,wood,-3,.07,z,`${tag}_LEFT_SKIRT`);
  // Right side is cut away, matching the original GLB's hidden right wall.
  box(.12,.13,2.4,wood,3.015,.065,z,`${tag}_CUTAWAY_EDGE`);
  box(.18,3,.16,wood,-3.06,1.5,z-1.2,`${tag}_LEFT_POST`);
  // High beams and pendants mark each construction bay without obstructing people.
  box(6.18,.115,.115,wood,0,2.99,z+1.2,`${tag}_BEAM`);
  cylinder(.012,.38,metal,0,2.79,z,`${tag}_LIGHT_CABLE`);
  const shade=add(new THREE.ConeGeometry(.18,.13,16,1,true),wood,0,2.55,z,`${tag}_PENDANT_SHADE`);shade.material.side=THREE.DoubleSide;
  add(new THREE.SphereGeometry(.065,10,7),lamp,0,2.51,z,`${tag}_BULB`);
 }
 const deckDepth=metrics.terraceFloor.maxZ-metrics.terraceFloor.minZ,deckZ=(metrics.terraceFloor.minZ+metrics.terraceFloor.maxZ)/2;
 box(7.1,.19,deckDepth+.1,stone,0,-.11,deckZ,'TERRACE_FOUNDATION');
 box(7,.06,deckDepth,terrace,0,-.015,deckZ,'TERRACE_DECK');
 box(.065,.09,deckDepth+.06,stone,-3.54,-.02,deckZ,'TERRACE_LEFT_CURB');
 box(.065,.09,deckDepth+.06,stone,3.54,-.02,deckZ,'TERRACE_RIGHT_CURB');
 box(7.1,.09,.065,stone,0,-.02,metrics.terraceFloor.maxZ+.03,'TERRACE_FRONT_CURB');
 box(.48,.09,deckDepth,leaf,3.82,-.12,deckZ,'TERRACE_GARDEN_BED');
 for(let z=3.45;z<metrics.terraceFloor.maxZ;z+=.55){const bush=add(new THREE.SphereGeometry(.23,10,7),leaf,3.8,.015,z,'TERRACE_SHRUB');bush.scale.set(.9,.6,1)}
 // Growth adds visible garden pergola bays; all supports remain outside editable bounds.
 for(let i=0;i<metrics.growth.terrace;i++){
  const z=6.65+1.2*i;
  for(const x of[-3.56,3.56]){
   box(.11,2.55,.11,wood,x,1.26,z,'TERRACE_PERGOLA_POST');
   box(.12,.1,1.27,wood,x,2.56,z+.6,'TERRACE_PERGOLA_RAIL');
  }
  // Thin festoon wire and small bulbs keep the deck open to the sky.
  box(7.15,.018,.018,metal,0,2.47,z,'TERRACE_LIGHT_WIRE');
  for(let x=-2.75;x<=2.76;x+=1.1){cylinder(.008,.08,metal,x,2.425,z,'TERRACE_LIGHT_DROP');add(new THREE.SphereGeometry(.045,8,6),lamp,x,2.36,z,'TERRACE_BULB')}
 }
 if(metrics.growth.terrace){
  const z=metrics.terraceFloor.maxZ+.2;
  for(const x of[-2.55,2.55]){box(1.35,.34,.34,wood,x,.12,z,'TERRACE_BORDER_PLANTER');box(1.24,.02,.25,soil,x,.3,z,'TERRACE_BORDER_SOIL');for(let i=0;i<5;i++){const bush=add(new THREE.SphereGeometry(.18,10,7),leaf,x-.47+i*.235,.44,z,'TERRACE_BORDER_FOLIAGE');bush.scale.set(.8,1.05,.8)}}
 }
 // These shared palette entries were not used in a level-zero shell.
 const used=new Set();root.traverse(o=>{if(o.isMesh)used.add(o.material)});for(const material of materials.values())if(!used.has(material))material.dispose();
 return root;
}

/** Keep cached finish textures alive while replacing the generated shell. */
export function disposeExpansion(root){
 const geometries=new Set(),materials=new Set();root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))materials.add(m)});
 for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
}
