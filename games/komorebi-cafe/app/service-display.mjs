import {MENU} from './catalog.mjs?v=20261013-qa4';
import {FOOD_MODELS} from './food.mjs?v=20261013-qa4';

/** Case stock is a preview of meals that can actually be prepared now. */
export function availableDisplayRecipes(business={}){
 return (business.progression?.unlockedRecipes??['coffee','latte','cake']).filter(id=>business.menuEnabled?.[id]!==false&&MENU[id]&&Object.entries(MENU[id].recipe).every(([ingredient,quantity])=>(business.stock?.[ingredient]??0)>=quantity)).slice(-6);
}

/** Stable table-local serving slots avoid plate overlap when several guests share a table. */
export function tableFoodPlacements(layout,customers,manifest){
 const groups=new Map(),result=[];
 for(const customer of customers){if(!['eating','paying','cleaning'].includes(customer.stage)||!customer.ingredientsConsumed)continue;const table=layout?.instances.find(o=>o.id===customer.tableId);if(!table||!Array.isArray(customer.order))continue;if(!groups.has(table.id))groups.set(table.id,{table,guests:[]});groups.get(table.id).guests.push(customer)}
 for(const {table,guests}of groups.values()){
  const items=guests.sort((a,b)=>a.id.localeCompare(b.id)).flatMap(c=>c.order.map((id,index)=>({c,id,index}))),p=manifest.prototypes[table.type],width=Math.min(.64,p.width-.12),depth=Math.min(.62,p.depth-.12),cols=Math.max(1,Math.ceil(Math.sqrt(items.length*width/depth))),rows=Math.ceil(items.length/cols),scale=Math.min(.76,width/cols/.42*.84,depth/rows/.42*.84),angle=(table.rotationDeg??0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  const slots=items.map((_,i)=>{const lx=((i%cols)+.5)*width/cols-width/2,lz=(Math.floor(i/cols)+.5)*depth/rows-depth/2;return {x:table.x+lx*cos+lz*sin,z:table.z-lx*sin+lz*cos}});
  for(const {c,id,index}of items){let best=0;for(let i=1;i<slots.length;i++)if(Math.hypot(slots[i].x-c.x,slots[i].z-c.z)<Math.hypot(slots[best].x-c.x,slots[best].z-c.z))best=i;const slot=slots.splice(best,1)[0],heldDrink=c.order.find(id=>FOOD_MODELS[id]?.category==='drink');result.push({key:`${c.id}:${index}:${id}`,menuId:id,x:slot.x,y:table.type==='outdoor_table'?.78:.765,z:slot.z,scale,hideServing:c.stage==='eating'&&id===heldDrink})}
 }
 return result;
}
