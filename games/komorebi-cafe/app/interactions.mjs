// View-independent interaction orchestration, exercised by regression tests.
// Observe gestures without capturing pointers or preventing camera/scroll defaults.
export function createTapHandlers(onTap,threshold=6){
 const active=new Set();let candidate=null;
 const move=e=>{if(candidate?.id===e.pointerId&&Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)>threshold)candidate=null};
 const cancel=e=>{active.delete(e.pointerId);candidate=null};
 return {
  pointerdown(e){const first=active.size===0;active.add(e.pointerId);candidate=first&&e.button===0&&e.isPrimary!==false?{id:e.pointerId,x:e.clientX,y:e.clientY}:null},
  pointermove:move,
  pointerup(e){move(e);const tap=candidate?.id===e.pointerId&&e.button===0;active.delete(e.pointerId);candidate=null;if(tap)onTap(e)},
  pointercancel:cancel,
  lostpointercapture:cancel
 };
}
export function furnitureKey(event,id,{select,render,move,rotate,focus}){
 const keys={ArrowUp:[0,-.1],ArrowDown:[0,.1],ArrowLeft:[-.1,0],ArrowRight:[.1,0]};
 if(!['Enter',' ','r','R',...Object.keys(keys)].includes(event.key))return false;
 event.preventDefault();select(id);
 if(event.key==='Enter'||event.key===' ')render();
 else if(keys[event.key])move(...keys[event.key]);
 else rotate();
 // Rendering replaces SVG elements: resolve the new node only after rendering.
 focus(id);return true;
}
export function createViewController({load,ready,show,status,onError}){
 let loading=null,cached=null,generation=0;
 return {
  get requested(){return '3d'},
  async request(){
   if(cached){show('3d');status('3d');return}
   if(loading)return loading;
   const token=++generation;show('loading');status('loading');
   loading=(async()=>{let candidate;try{
    candidate=await Promise.resolve().then(load);
    if(token!==generation){candidate?.dispose?.();return}
    ready(candidate);cached=candidate;show('3d');status('3d');
   }catch(error){candidate?.dispose?.();cached=null;if(token===generation){show('error');status('error');onError?.(error)}}finally{if(token===generation)loading=null}})();
   return loading;
  },
  invalidate(){generation++;cached=null;loading=null;show('lost');status('lost')}
 };
}
