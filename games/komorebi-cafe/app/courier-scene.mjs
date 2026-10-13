/** Couriers follow scheduled, actual orders only; never create orders or change handoff time. */
export function courierRecords(business={}){
 const minute=Number(business.minute)||0;
 return (business.delivery?.orders??[]).filter(o=>['queued','preparing','packing','ready'].includes(o.stage)&&Number.isFinite(o.courierArrivalMinute)&&minute>=o.courierArrivalMinute-10).map(o=>({id:o.id,actorId:'courier-'+o.id,courier:true,role:'courier',stage:'queue',x:0,z:2.6,targetX:0,targetZ:2.6,path:[{x:0,z:3.1},{x:0,z:2.6}],order:[],deliveryOrderId:o.id}));
}
