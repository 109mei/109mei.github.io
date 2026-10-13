import * as THREE from './vendor/three/build/three.module.js';
export function cloneMaterials(root){const clones=new Map();root.traverse(n=>{if(n.isMesh){const clone=m=>{if(!clones.has(m))clones.set(m,m.clone());return clones.get(m)};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);n.castShadow=true;n.receiveShadow=true}})}
export function instantiate(prototype,id,type){const wrapper=new THREE.Group();wrapper.add(prototype.clone(true));wrapper.userData={instanceId:id,type};cloneMaterials(wrapper);return wrapper}
export function tint(root,colors){root.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material])){const key={MAT_FLOOR:'floor',MAT_WALL:'wall',MAT_WOOD:'wood'}[m.name];if(key)m.color.set(colors[key])}})}
export function disposeMaterials(root){const seen=new Set();root.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))if(!seen.has(m)){seen.add(m);m.dispose()}})}
export function disposeResources(roots){const mats=new Set(),geoms=new Set(),textures=new Set();for(const root of roots)root?.traverse(n=>{if(n.geometry)geoms.add(n.geometry);if(n.material)for(const m of(Array.isArray(n.material)?n.material:[n.material])){mats.add(m);for(const val of Object.values(m))if(val?.isTexture)textures.add(val)}});for(const t of textures)t.dispose();for(const m of mats)m.dispose();for(const g of geoms)g.dispose()}

/** Procedural extensions share geometry across instances, like the original GLB prototypes. */
export function buildProceduralPrototype(type){
 const root=new THREE.Group();root.name=`PROCEDURAL_${type.toUpperCase()}`;
 const materials={};const material=(key,color,options={})=>materials[key]??=(Object.assign(new THREE.MeshStandardMaterial({color,roughness:.73,...options}),{name:key}));
 const main=material('MAT_ITEM_COLOR','#a97b52'),accent=material('MAT_ITEM_ACCENT','#76856a'),metal=material('MAT_IRON','#354638',{metalness:.55,roughness:.4}),cream=material('MAT_CERAMIC','#f3e8d0'),leaf=material('MAT_LEAF','#466447'),leafLight=material('MAT_LEAF_LIGHT','#718f56');
 function mesh(geometry,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0){const object=new THREE.Mesh(geometry,mat);object.position.set(x,y,z);object.rotation.set(rx,ry,rz);object.castShadow=true;object.receiveShadow=true;root.add(object);return object}
 const box=(w,h,d,mat,x=0,y=h/2,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const cylinder=(r1,r2,h,mat,x=0,y=h/2,z=0,n=20)=>mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat,x,y,z);
 const sphere=(r,mat,x,y,z,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,12,8),mat,x,y,z);o.scale.set(sx,sy,sz);return o};
 const legs=(w,d,height,mat=metal)=>{for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])box(.055,height,.055,mat,x,height/2,z)};
 if(type==='outdoor_table'){
  cylinder(.44,.44,.065,main,0,.74);cylinder(.043,.043,.69,metal,0,.36);cylinder(.28,.34,.055,metal,0,.028);
  cylinder(.095,.075,.05,cream,0,.799);cylinder(.03,.043,.12,accent,0,.88);sphere(.075,leaf,0,.99,0,1,1.2,1);
 }else if(type==='outdoor_chair'){
  legs(.38,.37,.43);box(.46,.06,.44,main,0,.45);box(.43,.045,.37,accent,0,.502,.01);
  for(const x of[-.2,.2])box(.04,.38,.04,metal,x,.65,-.2);
  for(let y=.59;y<=.84;y+=.08)box(.46,.047,.04,main,0,y,-.23);
 }else if(type==='sofa'){
  legs(1.35,.46,.15,main);box(1.6,.22,.69,main,0,.26);box(1.56,.44,.14,accent,0,.53,-.28);box(.15,.4,.7,main,-.745,.44);box(.15,.4,.7,main,.745,.44);
  for(const x of[-.36,.36]){box(.65,.15,.51,accent,x,.435,.04);box(.57,.27,.11,accent,x,.64,-.17)}
  const cushion=box(.22,.22,.13,cream,.48,.59,.02);cushion.rotation.z=-.15;
 }else if(type==='bench'){
  legs(1.09,.35,.42);for(const z of[-.17,0,.17])box(1.3,.06,.13,main,0,.44,z);
 }else if(type==='plant'){
  cylinder(.21,.15,.36,main,0,.18);cylinder(.19,.19,.022,material('MAT_SOIL','#352d24'),0,.359);
  for(let i=0;i<7;i++){const a=i*2.399,h=.55+i*.056,x=Math.cos(a)*.135,z=Math.sin(a)*.135;cylinder(.012,.013,h-.34,leaf,x/2,(h+.34)/2,z/2,8);const l=sphere(.105,i%2?leaf:leafLight,x,h,z,1.08,.52,.58);l.rotation.z=Math.cos(a)*.6;l.rotation.y=a}
 }else if(type==='planter'){
  box(1.18,.37,.38,main,0,.185);box(1.1,.025,.31,material('MAT_SOIL','#352d24'),0,.38);
  for(let i=0;i<6;i++)sphere(.17,i%2?leaf:leafLight,-.45+i*.18,.56,0,.78,1.35,.9);
 }else if(type==='parasol'){
  cylinder(.17,.23,.05,metal,0,.025);cylinder(.027,.033,2.22,main,0,1.13);
  main.side=accent.side=THREE.DoubleSide;const geometry=new THREE.ConeGeometry(.85,.35,8,1,true);geometry.clearGroups();for(let i=0;i<8;i++)geometry.addGroup(i*3,3,i%2);mesh(geometry,[main,accent],0,2.11,0,0,Math.PI/8);
  // Alternate canopy panels and ribs make the shade readable from above and below.
  for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4,x=Math.sin(a)*.39,z=Math.cos(a)*.39;const rib=box(.016,.016,.82,cream,x,2.1,z);rib.rotation.y=a;rib.rotation.x=-.2}
  cylinder(.035,.035,.075,main,0,2.325);
 }else if(type==='rug'){
  box(1.79,.012,1.19,accent,0,.012);box(1.62,.014,1.02,main,0,.015);
  for(let x=-.82;x<=.83;x+=.1){box(.027,.014,.085,cream,x,.015,-.556);box(.027,.014,.085,cream,x,.015,.556)}
 }else if(type==='menu_board'){
  for(const z of[-.17,.17])for(const x of[-.21,.21]){const leg=box(.036,.8,.035,main,x,.4,z);leg.rotation.x=z>0?.1:-.1}
  box(.49,.56,.065,main,0,.55,-.055);box(.405,.47,.012,material('MAT_CHALKBOARD','#253b32'),0,.55,-.014);
  const chalk=material('MAT_CHALK','#e9e6c8');for(let i=0;i<4;i++)box(.26-i%2*.07,.014,.009,chalk,-.015,.69-i*.075,-.003);
  box(.37,.022,.03,cream,0,.335,.015);
 }else if(type==='lamp'){
  cylinder(.22,.22,.04,metal,0,.02);cylinder(.02,.023,1.32,main,0,.68);
  cylinder(.14,.225,.32,accent,0,1.48);cylinder(.17,.17,.018,cream,0,1.315);
 }else if(type==='pastry_case'){
  box(1.08,.64,.63,main,0,.32);box(1.09,.05,.64,cream,0,.67);box(1.09,.04,.65,metal,0,1.13);
  const glass=material('MAT_GLASS','#c4e4db',{transparent:true,opacity:.2,roughness:.08,metalness:.15,depthWrite:false});box(1.04,.42,.015,glass,0,.905,.3);for(const x of[-.53,.53]){box(.025,.45,.61,glass,x,.905);box(.026,.48,.026,metal,x,.9,.31);box(.026,.48,.026,metal,x,.9,-.31)}
  // The shell stays empty: live food is supplied by the stock-aware serving adapter.
  box(1.06,.025,.59,cream,0,.92);
 }else throw Error(`Unknown procedural furniture: ${type}`);
 const used=new Set();root.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))used.add(m)});for(const m of Object.values(materials))if(!used.has(m))m.dispose();
 return root;
}
export function applyAppearance(root,appearance){root.traverse(n=>{if(!n.isMesh)return;for(const m of(Array.isArray(n.material)?n.material:[n.material])){
 if(['MAT_WOOD','MAT_ITEM_COLOR'].includes(m.name))m.color.set(appearance.color);
 if(['MAT_LINEN','MAT_ITEM_ACCENT','MAT_TERRACOTTA','MAT_LAMP'].includes(m.name))m.color.set(appearance.accent);
 if(['MAT_WOOD','MAT_ITEM_COLOR','MAT_LINEN','MAT_ITEM_ACCENT'].includes(m.name)){m.roughness=appearance.style==='modern'?.35:appearance.style==='vintage'?.95:.75;m.metalness=appearance.style==='modern'?.13:0}
 if(m.name==='MAT_IRON'){m.color.set(appearance.style==='vintage'?'#776048':appearance.style==='modern'?'#293e38':'#354638')}
}})}

/** Tileable neutral patterns multiply with the chosen surface color. */
export function createFinishTexture(kind,doc=globalThis.document){
 if(!doc?.createElement)return null;const c=doc.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');if(!g)return null;g.fillStyle='#ffffff';g.fillRect(0,0,256,256);g.lineWidth=2;
 const line=(x1,y1,x2,y2,color='#cfccc3',width=2)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
 if(['wood','deck'].includes(kind)){for(let y=0;y<256;y+=64){line(0,y,256,y,'#b4a89a',3);line(y%128===0?85:175,y,y%128===0?85:175,y+64,'#c1b6a8');for(let i=0;i<8;i++)line((i*39+y*3)%256,y+12+i*5,Math.min(256,(i*39+y*3)%256+65),y+12+i*5,'#f0eee7',1)}}
 else if(kind==='tile'){for(let p=0;p<=256;p+=64){line(p,0,p,256,'#c5c4be',3);line(0,p,256,p,'#c5c4be',3)}for(let x=0;x<4;x++)for(let y=0;y<4;y++)if((x+y)%2===0){g.fillStyle='#e5e7df';g.fillRect(x*64+3,y*64+3,58,58)}}
 else if(kind==='stripe'){for(let x=0;x<256;x+=64){g.fillStyle='#e2e7de';g.fillRect(x,0,25,256);line(x+31,0,x+31,256,'#d2d8cc',2)}}
 else if(kind==='brick'){for(let y=0;y<256;y+=64){line(0,y,256,y,'#c3b5a4',5);for(let x=(y%128?0:64);x<256;x+=128)line(x,y,x,y+64,'#c3b5a4',5)}}
 else if(kind==='stone'){for(let y=0;y<256;y+=85){line(0,y,256,y,'#c6c9c2',3);for(let x=(y%2?25:95);x<256;x+=127)line(x,y,x,y+85,'#c6c9c2',3)}for(let i=0;i<150;i++){g.fillStyle=i%2?'#e8e9e4':'#f4f3ed';g.fillRect((i*47)%256,(i*83)%256,3,2)}}
 else if(kind==='botanical'){for(let x=32;x<256;x+=96)for(let y=24;y<256;y+=96){line(x,y+50,x+18,y,'#b9c9b3',2);for(let i=0;i<4;i++){g.save();g.translate(x+8+i*3,y+9+i*10);g.rotate(i%2?.7:-.7);g.fillStyle=i%2?'#c8d6c3':'#b5c9ae';g.beginPath();g.ellipse(i%2?9:-9,0,13,5,0,0,Math.PI*2);g.fill();g.restore()}}}
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}
