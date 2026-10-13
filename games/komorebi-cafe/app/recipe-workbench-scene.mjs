import * as THREE from './vendor/three/build/three.module.js';
import {createIngredientFactory} from './ingredient-models.mjs?v=20261013-qa4';
import {getWorkbenchBase} from './recipe-workbench.mjs?v=20261013-qa4';
import {STOCK_ITEMS} from './catalog.mjs?v=20261013-qa4';
/** Shares the existing processing renderer. No WebGL context or simulation state. */
export function createWorkbenchScene(){
 const root=new THREE.Group(),factory=createIngredientFactory(),geometry=new THREE.CylinderGeometry(.155,.17,.025,24),idle=new THREE.MeshStandardMaterial({color:'#d6d4bc'}),selected=new THREE.MeshStandardMaterial({color:'#78a88b'});root.name='RECIPE_WORKBENCH';let key='',textures=[],labelMaterials=[];
 function clear(){textures.forEach(t=>t.dispose());labelMaterials.forEach(m=>m.dispose());textures=[];labelMaterials=[];root.clear()}
 function update(selection){const base=getWorkbenchBase(selection?.baseId);if(!base){clear();return}const next=JSON.stringify(selection);if(key===next)return;key=next;clear();const columns=Math.min(5,base.materials.length),rows=Math.ceil(base.materials.length/columns);
 base.materials.forEach((id,i)=>{const count=selection.quantities[id]||0,g=new THREE.Group();g.userData.pickIngredient=id;g.position.set((i%columns-(columns-1)/2)*.43,0,(Math.floor(i/columns)-(rows-1)/2)*.51);const plate=new THREE.Mesh(geometry,count?selected:idle);plate.position.y=.005;g.add(plate);const model=factory.create(id,{withContainer:true,scale:1.1});model.position.y=.025;g.add(model);
 if(globalThis.document){const canvas=document.createElement('canvas');canvas.width=320;canvas.height=80;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#fffdf3';ctx.fillRect(0,0,320,80);ctx.fillStyle='#243d30';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.fillText(`${STOCK_ITEMS[id].name} ×${count}`,160,48);const texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthTest:false});textures.push(texture);labelMaterials.push(material);const label=new THREE.Sprite(material);label.position.set(0,.34,0);label.scale.set(.42,.105,1);g.add(label)}}root.add(g)});root.userData={baseId:base.id,quantities:{...selection.quantities}};
 }
 return {root,update,dispose(){clear();factory.dispose();geometry.dispose();idle.dispose();selected.dispose()}};
}
