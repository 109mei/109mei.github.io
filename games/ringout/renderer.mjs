// Fresh reconstructed presentation. World coordinates always use the initial R150.
export const WORLD_RADIUS=150;
export const COLORS=['#83e8e3','#ffa084'];
export function viewPoint(p,viewer=0){const s=viewer===1?-1:1;return {...p,x:p.x*s,y:p.y*s,...(Number.isFinite(p.angle)?{angle:p.angle+(viewer===1?Math.PI:0)}:{})};}
export function sampleFrames(frames,time,events=[]){
 if(!frames?.length)return [];
 let i=0;while(i+1<frames.length&&frames[i+1].time<=time)i++;
 const a=frames[i],b=frames[Math.min(i+1,frames.length-1)],t=b.time>a.time?Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))):0;
 const next=new Map(b.disks.map(d=>[d.id,d]));
 const outIds=new Set(events.filter(e=>e.type==='ringout'&&e.time<=time).map(e=>e.diskId));
 return a.disks.map(d=>{const e=next.get(d.id),sample=e&&d.alive&&e.alive?{...d,x:d.x+(e.x-d.x)*t,y:d.y+(e.y-d.y)*t}:{...d};if(outIds.has(d.id))sample.alive=false;return sample;});
}
export function visiblePads(pads,events=[],time=Infinity){
 return pads.map(p=>{const pulse=events.find(e=>e.type==='spring-pulse'&&e.padId===p.id&&e.time<=time);return {...p,status:pulse?'consumed':p.status,pulseAge:pulse?time-pulse.time:null};});
}
export function contactIds(events,time,lifetime=.25){return [...new Set(events.filter(e=>e.type==='collision'&&time-e.time>=0&&time-e.time<lifetime).flatMap(e=>e.ids))];}
export function ringoutEffects(events,time,lifetime=.55){return events.filter(e=>e.type==='ringout'&&time-e.time>=0&&time-e.time<lifetime).map(e=>({...e,age:time-e.time,progress:(time-e.time)/lifetime}));}
function circle(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);}
export class ArenaRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.size=0;this.scale=1;}
 resize(){const size=Math.max(1,this.canvas.getBoundingClientRect().width),dpr=Math.min(globalThis.devicePixelRatio||1,3);this.size=size;this.scale=size*.405/150;this.canvas.width=Math.round(size*dpr);this.canvas.height=Math.round(size*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
 point(p,viewer){const q=viewPoint(p,viewer);return {x:this.size/2+q.x*this.scale,y:this.size/2+q.y*this.scale};}
 clear(){this.ctx.clearRect(0,0,this.size,this.size);}
 disk(d,viewer,{opacity=1,shrink=1,selected=false}={}){
  const c=this.ctx,p=this.point(d,viewer),r=d.r*this.scale*shrink;c.save();c.globalAlpha=opacity;
  if(selected){circle(c,p.x,p.y,r+4);c.strokeStyle='#eff7f2';c.lineWidth=2;c.stroke();}
  circle(c,p.x,p.y,r);c.fillStyle=COLORS[d.owner];c.fill();c.strokeStyle='#0d2931';c.lineWidth=1.5;c.stroke();
  if(d.owner===1){c.beginPath();c.moveTo(p.x,p.y-r*.8);c.lineTo(p.x+r*.8,p.y);c.lineTo(p.x,p.y+r*.8);c.lineTo(p.x-r*.8,p.y);c.closePath();c.fillStyle='#18343e';c.fill();c.fillStyle='#fff0e2';}
  else {circle(c,p.x,p.y,r*.66);c.fillStyle='#c4ffff';c.fill();c.fillStyle='#16343d';}
  c.font=`750 ${Math.max(7,Math.max(12,Math.min(15,d.r*this.scale*1.03))*shrink)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(String((d.index??Number(d.id.split('-').at(-1)))+1),p.x,p.y+.4);c.restore();
 }
 pad(p,viewer,actors,reducedMotion=false){
  const c=this.ctx,q=this.point(p,viewer),r=(p.radius||10)*this.scale,active=p.status==='armed',consumed=p.status==='consumed';
  if(p.status==='expired'||(consumed&&(!Number.isFinite(p.pulseAge)||p.pulseAge<0||p.pulseAge>=.4)))return;
  if(consumed){
   // An actual activation leaves a short hollow pulse, never an inactive arrow.
   const progress=Math.max(0,Math.min(1,p.pulseAge/.4));
   c.save();c.globalAlpha=1-progress;c.setLineDash([]);c.strokeStyle='#f0f7bd';c.lineWidth=2;
   circle(c,q.x,q.y,r*(reducedMotion?1.4:1+.8*progress));c.stroke();c.restore();return;
  }
  c.save();c.globalAlpha=1;circle(c,q.x,q.y,r);c.fillStyle=active?'#64754c':'#263e3e';c.fill();c.strokeStyle='#e5efad';c.lineWidth=1.7;c.setLineDash(active?[]:[3,3]);c.stroke();c.setLineDash([]);
  const a=p.angle+(viewer===1?Math.PI:0),len=r*.75,dx=Math.cos(a),dy=Math.sin(a);c.beginPath();c.moveTo(q.x-dx*len*.55,q.y-dy*len*.55);c.lineTo(q.x+dx*len,q.y+dy*len);c.moveTo(q.x+dx*len-Math.cos(a-.65)*len*.6,q.y+dy*len-Math.sin(a-.65)*len*.6);c.lineTo(q.x+dx*len,q.y+dy*len);c.lineTo(q.x+dx*len-Math.cos(a+.65)*len*.6,q.y+dy*len-Math.sin(a+.65)*len*.6);c.stroke();
  if(active){const n=Math.max(1,Math.min(2,p.activeTurnsRemaining||2)),w=4.5,gap=3,total=n*w+(n-1)*gap,x=q.x-total/2,y=q.y+r+4;
   const clear=actors.filter(d=>d.alive).every(d=>{const z=this.point(d,viewer);return Math.hypot(z.x-(x+total/2),z.y-(y+w/2))>d.r*this.scale+total/2+5;});
   if(clear&&Math.hypot(x+total/2-this.size/2,y+w/2-this.size/2)+total/2<this.size*.48){c.fillStyle='#f0f7bd';for(let i=0;i<n;i++)c.fillRect(x+i*(w+gap),y,w,w);}
  }c.restore();
 }
 aim(aim,disks,viewer){
  if(!aim)return;const d=disks.find(d=>d.id===aim.diskId&&d.alive);if(!d)return;
  const c=this.ctx,p=this.point(d,viewer),a=aim.angle+(viewer===1?Math.PI:0),len=(25+aim.power*65)*this.scale,dx=Math.cos(a),dy=Math.sin(a),start=d.r*this.scale+4,end={x:p.x+dx*len,y:p.y+dy*len};
  c.save();c.strokeStyle=COLORS[d.owner];c.lineWidth=3;c.beginPath();c.moveTo(p.x+dx*start,p.y+dy*start);c.lineTo(end.x,end.y);c.lineTo(end.x-Math.cos(a-.55)*8,end.y-Math.sin(a-.55)*8);c.moveTo(end.x,end.y);c.lineTo(end.x-Math.cos(a+.55)*8,end.y-Math.sin(a+.55)*8);c.stroke();
  const text=`${Math.round(aim.power*100)}%`;c.font='700 13px sans-serif';const width=c.measureText(text).width+12,height=23;
  const candidates=[{x:end.x-dy*24,y:end.y+dx*24},{x:end.x+dy*24,y:end.y-dx*24},{x:p.x-dx*32,y:p.y-dy*32},{x:this.size/2,y:this.size*.93}];
  const badge=candidates.find(b=>Math.hypot(b.x-this.size/2,b.y-this.size/2)+Math.hypot(width/2,height/2)<this.size*.49&&disks.filter(d=>d.alive).every(d=>{const q=this.point(d,viewer),ex=Math.max(Math.abs(q.x-b.x)-width/2,0),ey=Math.max(Math.abs(q.y-b.y)-height/2,0);return Math.hypot(ex,ey)>d.r*this.scale+5;}));
  if(badge){c.fillStyle='#11252d';c.fillRect(badge.x-width/2,badge.y-height/2,width,height);c.fillStyle='#eff7f2';c.textAlign='center';c.textBaseline='middle';c.fillText(text,badge.x,badge.y);}c.restore();
 }
 draw({disks=[],pads=[],events=[],time=0,viewer=0,selected=null,aim=null,candidates=[],reducedMotion=false}){
  if(!this.size)this.resize();const c=this.ctx,w=this.size;c.clearRect(0,0,w,w);c.save();circle(c,w/2,w/2,w*.496);c.clip();
  circle(c,w/2,w/2,w*.49);c.fillStyle='#132b34';c.fill();circle(c,w/2,w/2,150*this.scale);c.fillStyle='#38535a';c.fill();c.strokeStyle='#b8d7d1';c.lineWidth=2;c.stroke();
  circle(c,w/2,w/2,75*this.scale);c.strokeStyle='#77929955';c.lineWidth=1;c.setLineDash([3,8]);c.stroke();c.setLineDash([]);
  for(const p of candidates){const q=this.point(p,viewer);circle(c,q.x,q.y,3);c.fillStyle=p.ok?'#dbe9b699':'#a78c8399';c.fill();}
  for(const p of visiblePads(pads,events,time))this.pad(p,viewer,disks,reducedMotion);
  for(const e of events.filter(e=>e.type==='collision'&&time>=e.time&&time-e.time<.18)){const p=this.point(e,viewer);c.globalAlpha=1-(time-e.time)/.18;circle(c,p.x,p.y,5);c.strokeStyle='#fffbe6';c.lineWidth=2;c.stroke();}c.globalAlpha=1;
  for(const d of disks.filter(d=>d.alive))this.disk(d,viewer,{selected:d.id===selected});
  for(const id of contactIds(events,time)){const d=disks.find(d=>d.id===id&&d.alive);if(d){const p=this.point(d,viewer);circle(c,p.x,p.y,d.r*this.scale+3);c.strokeStyle='#fff7ca';c.lineWidth=2;c.stroke();}}
  for(const e of ringoutEffects(events,time)){const d=disks.find(d=>d.id===e.diskId)||{id:e.diskId,owner:e.owner,r:14};this.disk({...d,x:e.x,y:e.y},viewer,{opacity:1-e.progress,shrink:reducedMotion?1:1-e.progress*.65});const p=this.point(e,viewer),dx=p.x-w/2,dy=p.y-w/2,l=Math.hypot(dx,dy)||1,q={x:w/2+dx/l*Math.min(l-24,w*.425),y:w/2+dy/l*Math.min(l-24,w*.425)};c.fillStyle=COLORS[e.owner];c.font='750 12px sans-serif';c.textAlign='center';c.textBaseline='middle';c.globalAlpha=1-e.progress;c.fillText('OUT',q.x,q.y);c.globalAlpha=1;}
  this.aim(aim,disks,viewer);c.restore();
 }
}
