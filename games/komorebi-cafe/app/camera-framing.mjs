// Fit projected box corners, rather than a sphere that leaves the cafe tiny.
export function fitBoxDistance({width,depth,height=3.3,aspect=1,fov=39,direction=[1,1.05,1.5],padding=1.12}){
 const length=Math.hypot(...direction),n=direction.map(v=>v/length),rLength=Math.hypot(n[0],n[2]),r=[n[2]/rLength,0,-n[0]/rLength],u=[-n[1]*n[0]/rLength,rLength,-n[1]*n[2]/rLength];
 const tanY=Math.tan(fov*Math.PI/360),tanX=tanY*Math.max(.2,aspect);let distance=0;
 for(const x of[-width/2,width/2])for(const y of[-height/2,height/2])for(const z of[-depth/2,depth/2]){const v=[x,y,z],dot=a=>v.reduce((sum,b,i)=>sum+b*a[i],0),near=dot(n);distance=Math.max(distance,near+Math.abs(dot(r))*padding/tanX,near+Math.abs(dot(u))*padding/tanY)}
 return Math.max(6,distance);
}
