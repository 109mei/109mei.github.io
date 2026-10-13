// Fictional game cash planning only. No sales or new purchase assumptions.
export function operatingOutlook(state,{rent,storage,settings,roles,items}){
 const duration=settings.closingMinute-settings.openingMinute,wages=Math.round(Object.entries(state.staff).reduce((sum,[role,count])=>sum+count*roles[role].hourlyWage*Math.max(240,duration)/60,0));
 const utilities=Math.round(450+duration*.65)+storage,daily=rent+wages+utilities+settings.promotionBudget,useDay=state.phase==='closed'?state.day+1:state.day;
 const expiries=Object.entries(state.batches).flatMap(([id,batches])=>{const soon=batches.filter(b=>b.quantity>0&&b.expiresDay<=useDay+2);return soon.length?[{id,name:items[id].name,unit:items[id].unit,quantity:soon.reduce((s,b)=>s+b.quantity,0),closeDay:Math.min(...soon.map(b=>b.expiresDay-1))}]:[]});
 return {daily,rent,wages,utilities,promotion:settings.promotionBudget,runway:daily?Math.max(0,Math.floor(state.cash/daily)):0,expiries};
}
