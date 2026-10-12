/** Fresh reconstructed local physics baseline. No claim of old-engine parity.
 * Units: world units, seconds, radians; y increases downward. Equal disk mass1.
 */
export const ARENA_RADIUS=150;
export const DISK_RADIUS=14;
export const SPRING_RADIUS=10;
export const FRICTION=250;
export const MAX_TRAVEL=220;
export const MAX_SPEED=Math.sqrt(2*FRICTION*MAX_TRAVEL);
export const RESTITUTION=.92;
export const PHYSICS=Object.freeze({arenaRadius:ARENA_RADIUS,diskRadius:DISK_RADIUS,springRadius:SPRING_RADIUS,friction:FRICTION,maxTravel:MAX_TRAVEL,maxSpeed:MAX_SPEED,restitution:RESTITUTION,fixedDt:1/120,frameInterval:1/30,maxSeconds:12,maxFrames:512,maxEvents:2048,maxSubsteps:60000});
const EPS=1e-9,STOP=1e-7,CONTACT=1e-7,ENTRY_DEPTH=1e-11,TAU=2*Math.PI;
function record(value,name){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${name} must be a data record`);return Object.getOwnPropertyDescriptors(value);}
function field(descriptors,key,fallback){const d=descriptors[key];if(!d)return fallback;if(!Object.hasOwn(d,'value'))throw new TypeError(`${key} must be an own data property`);return d.value;}
function finite(value,name){if(!Number.isFinite(value))throw new TypeError(`${name} must be finite`);return value;}
function number(d,key,fallback){return finite(field(d,key,fallback),key);}
function identity(value,name){if(typeof value!=='string'||!value.length||value.length>64)throw new TypeError(`${name} must be a nonempty short string`);return value;}
function angle(value){return((finite(value,'angle')%TAU)+TAU)%TAU;}
const order=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
function normalize(input){
 const q=record(input,'input'),radius=number(q,'radius',ARENA_RADIUS),fixedDt=number(q,'fixedDt',PHYSICS.fixedDt);
 if(radius<50||radius>10000||fixedDt<1/1000||fixedDt>1/30)throw new RangeError('radius or fixedDt outside supported range');
 const rawDisks=field(q,'disks'),rawShots=field(q,'shots',[]),rawPads=field(q,'pads',[]);
 if(!Array.isArray(rawDisks)||rawDisks.length>6||!Array.isArray(rawShots)||rawShots.length>2||!Array.isArray(rawPads)||rawPads.length>2)throw new TypeError('Expected up to6 disks,2 shots and2 pads');
 const ids=new Set();const disks=rawDisks.map(raw=>{const d=record(raw,'disk'),id=identity(field(d,'id'),'disk.id'),owner=field(d,'owner'),alive=field(d,'alive',true),r=number(d,'r',DISK_RADIUS),x=number(d,'x'),y=number(d,'y'),vx=number(d,'vx',0),vy=number(d,'vy',0);if(ids.has(id)||![0,1].includes(owner)||typeof alive!=='boolean'||r<1||r>radius/3||Math.abs(x)>1e6||Math.abs(y)>1e6||Math.hypot(vx,vy)>STOP)throw new RangeError('Invalid identity, geometry or non-resting disk');ids.add(id);return{id,owner,x,y,r,vx:0,vy:0,alive};}).sort(order);
 for(let i=0;i<disks.length;i++)for(let j=i+1;j<disks.length;j++){const a=disks[i],b=disks[j];if(a.alive&&b.alive&&Math.hypot(b.x-a.x,b.y-a.y)<a.r+b.r-1e-7)throw new RangeError('Living disks must not overlap');}
 const owners=new Set();const shots=rawShots.map(raw=>{const d=record(raw,'shot'),diskId=identity(field(d,'diskId'),'shot.diskId'),a=angle(number(d,'angle')),power=number(d,'power');const disk=disks.find(d=>d.id===diskId);if(!disk||!disk.alive||owners.has(disk.owner)||power<.1||power>1)throw new RangeError('A shot requires one living owned disk per team and power .1..1');owners.add(disk.owner);return{diskId,angle:a,power};}).sort((a,b)=>a.diskId<b.diskId?-1:a.diskId>b.diskId?1:0);
 const padIds=new Set(),maxR=Math.max(0,...disks.filter(d=>d.alive).map(d=>d.r));
 const pads=rawPads.map(raw=>{const d=record(raw,'pad'),id=identity(field(d,'id'),'pad.id'),x=number(d,'x'),y=number(d,'y'),r=number(d,'radius',SPRING_RADIUS),a=angle(number(d,'angle')),armed=field(d,'armed',true);if(padIds.has(id)||typeof armed!=='boolean'||r<=0||r>radius/3||Math.hypot(x,y)+r>radius)throw new RangeError('Pad must fit entirely inside the ring');padIds.add(id);return{id,x,y,radius:r,angle:a,armed,consumed:false,blocked:new Set(disks.filter(p=>p.alive&&Math.hypot(p.x-x,p.y-y)<=p.r+r+CONTACT).map(p=>p.id))};}).sort(order);
 for(let i=0;i<pads.length;i++)for(let j=i+1;j<pads.length;j++){const a=pads[i],b=pads[j];if(a.armed&&b.armed&&Math.hypot(a.x-b.x,a.y-b.y)<a.radius+b.radius+2*maxR+1e-6)throw new RangeError('Expanded pad trigger zones must be separated');}
 return{disks,shots,pads,radius,fixedDt};
}
export function freeStopDistance(power){finite(power,'power');if(power<0||power>1)throw new RangeError('power must be0..1');return MAX_TRAVEL*power*power;}
const snapshot=(disks,time)=>({time,disks:disks.map(d=>({...d}))});
const energy=disks=>disks.reduce((sum,d)=>sum+(d.alive?.5*(d.vx*d.vx+d.vy*d.vy):0),0);
function drag(disks,amount){for(const d of disks)if(d.alive){const v=Math.hypot(d.vx,d.vy);if(v<=amount+STOP){d.vx=0;d.vy=0;}else{const scale=(v-amount)/v;d.vx*=scale;d.vy*=scale;}}}
function ringOut(disks,radius,time,emit){for(const d of disks)if(d.alive&&Math.hypot(d.x,d.y)>=radius+d.r-EPS){d.alive=false;d.vx=0;d.vy=0;emit({type:'ringout',time,diskId:d.id,owner:d.owner,x:d.x,y:d.y});}}
function entryTime(px,py,vx,vy,r){const a=vx*vx+vy*vy,b=px*vx+py*vy,c=px*px+py*py-r*r;if(a<=1e-14||b>=-r*1e-8)return null;const disc=b*b-a*c;if(disc<0)return null;return c<=EPS?0:c/(-b+Math.sqrt(disc));}
function entersPad(d,p){const x=d.x-p.x,y=d.y-p.y,a=d.vx*d.vx+d.vy*d.vy,b=x*d.vx+y*d.vy,r=d.r+p.radius,c=x*x+y*y-r*r;return a>1e-14&&b<0&&(b*b-a*c)/a>2*r*ENTRY_DEPTH-ENTRY_DEPTH*ENTRY_DEPTH;}
/** Simultaneous normal-impulse solve. Jacobi updates avoid pair-order priority.
 * Rare inconsistent restitution targets are stabilized per connected component
 * by capping relative kinetic energy while preserving its total momentum.
 */
function contacts(disks,time,emit,stats){
 const pairs=[];for(let i=0;i<disks.length;i++)for(let j=i+1;j<disks.length;j++){const a=disks[i],b=disks[j];if(!a.alive||!b.alive)continue;const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy),sum=a.r+b.r;if(distance>sum+CONTACT)continue;const nx=dx/distance,ny=dy/distance,g=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;pairs.push({i,j,nx,ny,g,target:Math.max(0,-RESTITUTION*g)});}
 if(!pairs.length||!pairs.some(p=>p.g<-EPS))return;
 const original=disks.map(d=>({vx:d.vx,vy:d.vy})),m=pairs.length,A=Array.from({length:m},()=>Array(m).fill(0));
 for(let i=0;i<m;i++)for(let j=0;j<m;j++){const p=pairs[i],q=pairs[j],dot=p.nx*q.nx+p.ny*q.ny;A[i][j]=dot*((p.i===q.i?1:0)+(p.j===q.j?1:0)-(p.i===q.j?1:0)-(p.j===q.i?1:0));}
 const alpha=.8/Math.max(...A.map(row=>row.reduce((s,x)=>s+Math.abs(x),0)));let impulse=Array(m).fill(0);
 for(let n=0;n<512;n++){let change=0;const next=impulse.map((value,i)=>{const g=pairs[i].g+A[i].reduce((s,a,j)=>s+a*impulse[j],0);const v=Math.max(0,value+alpha*(pairs[i].target-g));change=Math.max(change,Math.abs(v-value));return v;});impulse=next;if(change<1e-10)break;}
 for(let i=0;i<m;i++){const p=pairs[i],j=impulse[i];disks[p.i].vx-=j*p.nx;disks[p.i].vy-=j*p.ny;disks[p.j].vx+=j*p.nx;disks[p.j].vy+=j*p.ny;}
 const unseen=new Set(pairs.flatMap(p=>[p.i,p.j]));while(unseen.size){const group=new Set([unseen.values().next().value]);for(let changed=true;changed;){changed=false;for(const p of pairs)if(group.has(p.i)||group.has(p.j)){if(!group.has(p.i)||!group.has(p.j))changed=true;group.add(p.i);group.add(p.j);}}for(const i of group)unseen.delete(i);const list=[...group],mx=list.reduce((s,i)=>s+original[i].vx,0)/list.length,my=list.reduce((s,i)=>s+original[i].vy,0)/list.length,before=list.reduce((s,i)=>s+(original[i].vx-mx)**2+(original[i].vy-my)**2,0),after=list.reduce((s,i)=>s+(disks[i].vx-mx)**2+(disks[i].vy-my)**2,0);if(after>before+1e-7){const scale=Math.sqrt(before/after);for(const i of list){disks[i].vx=mx+(disks[i].vx-mx)*scale;disks[i].vy=my+(disks[i].vy-my)*scale;}stats.energyClamps++;}}
 for(let i=0;i<m;i++)if(impulse[i]>1e-7){const p=pairs[i],a=disks[p.i],b=disks[p.j];emit({type:'collision',time,ids:[a.id,b.id],x:(a.x+b.x)/2,y:(a.y+b.y)/2});stats.collisions++;}
 // Only tiny numerical overlap is repaired, using a symmetric correction.
 for(let n=0;n<8;n++){const delta=disks.map(()=>({x:0,y:0}));let max=0;for(const p of pairs){const a=disks[p.i],b=disks[p.j],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),over=a.r+b.r-len;if(over>0){max=Math.max(max,over);const x=dx/len*over*.5,y=dy/len*over*.5;delta[p.i].x-=x;delta[p.i].y-=y;delta[p.j].x+=x;delta[p.j].y+=y;}}if(max<1e-10)break;for(let i=0;i<disks.length;i++){disks[i].x+=delta[i].x;disks[i].y+=delta[i].y;}}
 for(const p of pairs){const a=disks[p.i],b=disks[p.j];if((b.vx-a.vx)*p.nx+(b.vy-a.vy)*p.ny<-1e-5)throw new Error('Simultaneous contacts did not converge');}
}
function drift(disks,pads,radius,duration,start,emit,stats){let elapsed=0;for(let iterations=0;elapsed<duration-1e-12;iterations++){
 if(iterations>=512)throw new Error('Continuous contact iteration limit');let next=duration-elapsed,event=false;
 for(const p of pads)for(const id of p.blocked){const d=disks.find(d=>d.id===id);if(!d.alive||Math.hypot(d.x-p.x,d.y-p.y)>d.r+p.radius+CONTACT)p.blocked.delete(id);}
 for(let i=0;i<disks.length;i++){const a=disks[i];if(!a.alive)continue;const speed2=a.vx*a.vx+a.vy*a.vy;if(speed2>1e-14){const b=a.x*a.vx+a.y*a.vy,c=a.x*a.x+a.y*a.y-(radius+a.r)**2,t=(-b+Math.sqrt(Math.max(0,b*b-speed2*c)))/speed2;if(t>=-EPS&&t<=next){next=Math.max(0,t);event=true;}}
  for(let j=i+1;j<disks.length;j++){const b=disks[j];if(!b.alive)continue;const t=entryTime(b.x-a.x,b.y-a.y,b.vx-a.vx,b.vy-a.vy,a.r+b.r);if(t!==null&&t>=-EPS&&t<=next){next=Math.max(0,t);event=true;}}
 }
 for(const p of pads)if(p.armed&&!p.consumed)for(const d of disks)if(d.alive&&!p.blocked.has(d.id)&&entersPad(d,p)){const t=entryTime(d.x-p.x,d.y-p.y,d.vx,d.vy,d.r+p.radius);if(t!==null&&t>=-EPS&&t<=next){next=Math.max(0,t);event=true;}}
 for(const d of disks)if(d.alive){d.x+=d.vx*next;d.y+=d.vy*next;}elapsed+=next;const time=start+elapsed;ringOut(disks,radius,time,emit);
 for(const p of pads)if(p.armed&&!p.consumed){const touched=disks.filter(d=>d.alive&&!p.blocked.has(d.id)&&Math.hypot(d.x-p.x,d.y-p.y)<=d.r+p.radius+CONTACT&&entersPad(d,p));if(touched.length){p.consumed=true;const recipients=touched.map(d=>{const before={vx:d.vx,vy:d.vy},speed=Math.hypot(d.vx,d.vy);d.vx=speed*Math.cos(p.angle);d.vy=speed*Math.sin(p.angle);return{diskId:d.id,owner:d.owner,x:d.x,y:d.y,before,after:{vx:d.vx,vy:d.vy}};});emit({type:'spring-pulse',time,padId:p.id,x:p.x,y:p.y,recipients});stats.pulses++;}}
 if(event)contacts(disks,time,emit,stats);else break;
 }}
export function simulate(input){
 const{disks,shots,pads,radius,fixedDt}=normalize(input),events=[],frames=[],stats={substeps:0,collisions:0,pulses:0,energyClamps:0};
 const emit=event=>{if(events.length>=PHYSICS.maxEvents)throw new Error('Event budget exceeded');events.push(event);};
 ringOut(disks,radius,0,emit);
 for(const shot of shots){const d=disks.find(d=>d.id===shot.diskId);if(!d.alive)throw new RangeError('Cannot launch a disk already outside the ring');d.vx=Math.cos(shot.angle)*MAX_SPEED*shot.power;d.vy=Math.sin(shot.angle)*MAX_SPEED*shot.power;emit({type:'flick',time:0,diskId:d.id,owner:d.owner,angle:shot.angle,power:shot.power});}
 stats.initialEnergy=energy(disks);frames.push(snapshot(disks,0));let time=0,nextFrame=PHYSICS.frameInterval;
 while(disks.some(d=>d.alive&&Math.hypot(d.vx,d.vy)>STOP)){
  if(time>=PHYSICS.maxSeconds||stats.substeps>=PHYSICS.maxSubsteps)throw new Error('Simulation compute budget exceeded');
  const moving=disks.filter(d=>d.alive&&Math.hypot(d.vx,d.vy)>STOP),speed=Math.max(...moving.map(d=>Math.hypot(d.vx,d.vy))),minR=Math.min(...disks.filter(d=>d.alive).map(d=>d.r)),stop=Math.min(...moving.map(d=>Math.hypot(d.vx,d.vy)/FRICTION));
  const h=Math.min(fixedDt,minR*.18/speed,stop,PHYSICS.maxSeconds-time);if(h<=0)throw new Error('Invalid integration step');
  drag(disks,FRICTION*h*.5);drift(disks,pads,radius,h,time,emit,stats);drag(disks,FRICTION*h*.5);time+=h;stats.substeps++;
  if(time>=nextFrame-EPS){if(frames.length>=PHYSICS.maxFrames-1)throw new Error('Frame budget exceeded');frames.push(snapshot(disks,time));nextFrame+=PHYSICS.frameInterval;}
 }
 for(const d of disks){d.vx=0;d.vy=0;}if(frames.at(-1).time!==time)frames.push(snapshot(disks,time));else frames[frames.length-1]=snapshot(disks,time);
 stats.finalEnergy=energy(disks);return{disks:disks.map(d=>({...d})),events,frames,duration:time,stats,consumedPadIds:pads.filter(p=>p.consumed).map(p=>p.id)};
}
