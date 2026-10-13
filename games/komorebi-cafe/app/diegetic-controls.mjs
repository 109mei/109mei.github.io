import * as THREE from './vendor/three/build/three.module.js';

// Visual-only service fixtures outside all editable floors and customer routes.
// The notebook remains the accessible source of text, numbers, and controls.
export const CAFE_CONTROL_SPECS=Object.freeze([
 Object.freeze({key:'menu',label:'メニュー',name:'MENU_BOARD',x:3.6,z:2.15}),
 Object.freeze({key:'report',label:'帳簿',name:'LEDGER',x:3.6,z:.65}),
 Object.freeze({key:'growth',label:'レシピ開発',name:'RECIPE_BOOK',x:3.6,z:-.85}),
 Object.freeze({key:'staff',label:'スタッフ',name:'STAFF_BOARD',x:3.6,z:-2.35}),
 Object.freeze({key:'storage',label:'倉庫',name:'STOCK_CRATE',x:5.05,z:-.35})
]);
export function cafeControlKey(object){for(let n=object;n;n=n.parent)if(CAFE_CONTROL_SPECS.some(s=>s.key===n.userData.cafeControl))return n.userData.cafeControl;return null}

export function createCafeControls(){
 const root=new THREE.Group();root.name='CAFE_3D_CONTROLS';root.userData.visualOnly=true;
 const geometry=new THREE.BoxGeometry(1,1,1),materials=[],textures=[],targets=[];let disposed=false;
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});materials.push(m);return m};
 const wood=material('#805a3d'),dark=material('#294c42'),paper=material('#f7edcf'),gold=material('#d5a25f'),green=material('#5e8a6f'),red=material('#bb7658');
 function box(parent,name,w,h,d,mat,x,y,z){const o=new THREE.Mesh(geometry,mat);o.name=name;o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function label(parent,text,y,width=.94){
  let mat=paper;
  if(globalThis.document?.createElement){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');if(c){c.fillStyle='#f7edcf';c.fillRect(0,0,512,128);c.fillStyle='#294c42';c.textAlign='center';c.textBaseline='middle';c.font='bold 52px sans-serif';c.fillText(text,256,67,475);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);mat=material('#ffffff',{map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.15})}}
  box(parent,'ACTION_LABEL',width,.235,.025,mat,0,y,.34);
 }
 for(const spec of CAFE_CONTROL_SPECS){
  const g=new THREE.Group();g.name=`CONTROL_${spec.name}`;g.position.set(spec.x,0,spec.z);g.userData.cafeControl=spec.key;g.userData.accessibleLabel=spec.label;root.add(g);targets.push(g);
  if(spec.key==='menu'||spec.key==='staff'){
   for(const x of[-.38,.38]){const leg=box(g,'BOARD_LEG',.07,1.55,.08,wood,x,.775,0);leg.rotation.x=-.14;box(g,'BOARD_FOOT',.13,.055,.63,wood,x,.028,0)}
   box(g,'BOARD_FRAME',.96,1.04,.105,wood,0,1.23,.13);box(g,'BOARD_FACE',.83,.89,.032,dark,0,1.23,.20);
   if(spec.key==='menu'){for(let i=0;i<3;i++){box(g,'CHALK_MENU_LINE',.49-i*.065,.025,.016,paper,-.04,1.45-i*.17,.225);box(g,'CHALK_PRICE',.09,.025,.018,gold,.29,1.45-i*.17,.225)}}
   else for(const x of[-.21,.21]){box(g,'STAFF_NOTE',.29,.4,.02,paper,x,1.25,.23);box(g,'NOTE_PIN',.055,.055,.022,red,x,1.4,.253);box(g,'NOTE_WRITING',.17,.025,.018,green,x,1.25,.25)}
   label(g,spec.label,1.84);
  }else if(spec.key==='storage'){
   box(g,'CRATE_BODY',.87,.61,.68,wood,0,.335,0);for(const x of[-.32,0,.32])box(g,'CRATE_BINDING',.075,.66,.72,gold,x,.36,0);
   box(g,'STOCK_SACK',.45,.25,.45,paper,0,.79,0);box(g,'CRATE_LABEL_POST',.045,.74,.045,dark,0,1.05,0);label(g,spec.label,1.47);
  }else{
   box(g,'DESK_FOOT',.76,.07,.68,wood,0,.035,0);box(g,'DESK_STEM',.12,.86,.12,wood,0,.49,0);box(g,'DESK_TOP',1,.09,.72,wood,0,.955,0);
   const book=new THREE.Group();book.name='OPEN_BOOK';book.position.set(0,1.04,0);book.rotation.x=.35;g.add(book);
   for(const side of[-1,1]){const page=new THREE.Group();page.rotation.z=side*-.13;book.add(page);box(page,'BOOK_COVER',.40,.045,.49,spec.key==='report'?green:red,side*.21,0,0);box(page,'BOOK_PAGES',.37,.038,.45,paper,side*.21,.039,0);for(let j=0;j<3;j++)box(page,'BOOK_INK',.25,.006,.012,dark,side*.21,.061,-.12+j*.10)}
   box(g,'BOOK_SPINE',.035,.055,.49,gold,0,1.06,0);box(g,'DESK_LABEL_POST',.035,.39,.035,dark,0,1.31,.28);label(g,spec.label,1.61,1.12);
  }
 }
 function dispose(){if(disposed)return;disposed=true;geometry.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.clear()}
 return{root,targets,dispose};
}
