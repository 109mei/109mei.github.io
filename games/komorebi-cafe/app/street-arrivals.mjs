import {streetMetrics} from './street-scene.mjs?v=20261013-qa5';
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
export function cleanRoute(path){return (path??[]).filter(point).map(p=>({x:p.x,z:p.z})).filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>.015)}
export function streetSide(id){let n=0;for(const c of String(id))n=(n*31+c.charCodeAt(0))|0;return n&1?1:-1}
export function approachRoute(id,layout={}){const m=streetMetrics(layout);return [{x:streetSide(id)*m.edgeX,z:m.sidewalkZ},{x:m.laneX,z:m.sidewalkZ},{x:m.laneX,z:2.96},{x:0,z:2.96},{x:0,z:3.1}]}
export function interiorRoute(record,business={}){
 const seat=business.floor?.seatPositions?.find(s=>s.id===record.seatId),queue=business.floor?.queuePositions?.[record.queueSlot];
 return cleanRoute([...(seat?.entrancePath??queue?.path??record.path??[]),{x:record.x,z:record.z}]);
}
/** Depart from the nearest remaining point of the actual route, never through tables. */
export function departureRoute(id,position,entryPath,layout={},exteriorPath=null){
 const path=cleanRoute(entryPath);let nearest=0,distance=Infinity;
 path.forEach((p,i)=>{const d=Math.hypot(p.x-position.x,p.z-position.z);if(d<distance){nearest=i;distance=d}});
 return cleanRoute([...path.slice(0,nearest+1).reverse(),...[...(exteriorPath??approachRoute(id,layout))].reverse()]);
}
export function streetOpacity(position,layout={}){const m=streetMetrics(layout);return Math.max(0,Math.min(1,(m.edgeX-Math.abs(position.x))/(m.edgeX-m.fadeStart)))}
