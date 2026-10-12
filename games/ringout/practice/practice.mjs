import {ArenaRenderer,sampleFrames,visiblePads} from '../renderer.mjs?v=d7ca654dbee80c540f71c01e';
import {ownHit,shotFromPull,padDescription,degrees,wrap} from '../app.mjs?v=d7ca654dbee80c540f71c01e';
import {createPracticeSession} from './session.mjs?v=d7ca654dbee80c540f71c01e';

export function mountPractice(doc=document,win=window){
 const $=id=>doc.getElementById(id),canvas=$('practice-arena'),renderer=new ArenaRenderer(canvas),session=createPracticeSession(),motion=win.matchMedia('(prefers-reduced-motion: reduce)');
 let pub=session.getPublic(),selected='p0-2',aim=null,gesture=null,artifact=null,time=0,last=null,dirty=true,disposed=false,frameId=null,speechTimer=null;
 const listeners=[];
 const on=(target,name,fn,options)=>{target.addEventListener(name,fn,options);listeners.push(()=>target.removeEventListener(name,fn,options));};
 const text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 const input=()=>pub.phase==='input'&&!doc.hidden;
 const silence=()=>{if(speechTimer!==null)win.clearTimeout(speechTimer);speechTimer=null;text('practice-announcer','');};
 const announce=(value,delay=0)=>{silence();if(delay)speechTimer=win.setTimeout(()=>{speechTimer=null;if(!disposed)text('practice-announcer',value);},delay);else text('practice-announcer',value);};
 const refresh=()=>{pub=session.getPublic();dirty=true;};
 const cancelGesture=()=>{const g=gesture;gesture=null;if(g&&canvas.hasPointerCapture?.(g.id))canvas.releasePointerCapture?.(g.id);};
 function sync(){
  $('spring-off').setAttribute('aria-pressed',String(!pub.options.spring));$('spring-on').setAttribute('aria-pressed',String(pub.options.spring));
  $('opponent-toggle').setAttribute('aria-pressed',String(pub.options.counter));text('opponent-toggle',pub.options.counter?'相手：よける':'相手：別の駒');
  const fixed=pub.opponent.shot;
  text('opponent-note',`橙${Number(fixed.diskId.at(-1))+1}：${degrees(fixed.angle)}°・${Math.round(fixed.power*100)}%（上0°から時計回り・固定）`);
  for(const id of ['practice-disk','aim-left','aim-right','aim-weaker','aim-stronger','aim-cancel'])$(id).disabled=!input()||!!gesture;
  $('practice-fire').disabled=!input()||!!gesture||!aim;$('resume').hidden=!pub.paused;
  $('practice-disk').value=selected;
  text('practice-aim',aim?`上から時計回り ${degrees(aim.angle)}° · 強さ ${Math.round(aim.power*100)}%`:'方向・強さを選ぶと照準が出ます。');dirty=true;
 }
 function reset(change){
  cancelGesture();silence();aim=null;artifact=null;time=0;last=null;selected='p0-2';
  change?session.configure(change):session.reset();refresh();sync();
  text('practice-status','青3が選択中。自分の駒を引いて離す。');
 }
 function fire(){
  if(!input()||gesture||!aim)return false;
  const actual={...aim},resolved=session.launch(actual,pub.revision);if(!resolved)return false;
  artifact=resolved;aim=null;time=0;last=null;refresh();sync();canvas.focus({preventScroll:true});
  text('practice-status','あなたの一手と、橙の決まった動きを再生中。');announce('発射しました。橙の決まった入力と同時に再生します。');return true;
 }
 function cancel(message='発射を取り消しました。'){
  cancelGesture();aim=null;sync();text('practice-status',message);announce(message);
 }
 function numeric(deltaAngle=0,deltaPower=0){
  if(!input()||gesture)return;
  const current=aim||{diskId:selected,angle:-Math.PI/2,power:.45};
  aim={...current,diskId:selected,angle:wrap(current.angle+deltaAngle),power:Math.min(1,Math.max(.1,Math.round((current.power+deltaPower)*100)/100))};
  sync();const message=`青${Number(selected.at(-1))+1} · ${degrees(aim.angle)}度 · ${Math.round(aim.power*100)}%。発射で試す。`;text('practice-status',message);announce(message,180);
 }
 function point(event,rect){const scale=rect.width*.405/150;return{x:(event.clientX-rect.left-rect.width/2)/scale,y:(event.clientY-rect.top-rect.height/2)/scale};}
 on($('spring-off'),'click',()=>reset({spring:false}));on($('spring-on'),'click',()=>reset({spring:true}));
 on($('opponent-toggle'),'click',()=>reset({counter:!pub.options.counter}));on($('retry'),'click',()=>reset());
 on($('resume'),'click',()=>{if(!doc.hidden&&session.resume(pub.revision)){refresh();last=null;sync();canvas.focus({preventScroll:true});text('practice-status','再生を再開しました。');}});
 on($('practice-fire'),'click',fire);on($('aim-cancel'),'click',()=>{if(input())cancel();});
 on($('practice-disk'),'change',()=>{if(!input()||gesture)return;const id=$('practice-disk').value;if(!pub.state.disks.some(d=>d.id===id&&d.owner===0&&d.alive))return;silence();selected=id;aim=null;sync();const message=`青${Number(id.at(-1))+1}を選択しました。`;text('practice-status',message);announce(message);});
 for(const[id,a,p]of[['aim-left',-Math.PI/24,0],['aim-right',Math.PI/24,0],['aim-weaker',0,-.05],['aim-stronger',0,.05]])on($(id),'click',()=>numeric(a,p));
 on(canvas,'pointerdown',event=>{
  if(!input()||gesture||event.button!==0||event.isPrimary===false)return;
  const r=canvas.getBoundingClientRect(),rect={left:r.left,top:r.top,width:r.width,height:r.height},start=point(event,rect);
  const disk=ownHit(pub.state.disks,start,0,rect.width*.405/150);aim=null;
  if(!disk){cancel('青い自分の駒から引いてください。');return;}
  silence();selected=disk.id;gesture={id:event.pointerId,start,rect,revision:pub.revision,diskId:disk.id,max:0};canvas.setPointerCapture?.(event.pointerId);canvas.focus({preventScroll:true});sync();
 });
 on(canvas,'pointermove',event=>{
  const g=gesture;if(!g||g.id!==event.pointerId||!input()||g.revision!==pub.revision)return;
  const end=point(event,g.rect);g.max=Math.max(g.max,Math.hypot(end.x-g.start.x,end.y-g.start.y));aim=shotFromPull(g.diskId,g.start,end);sync();
  text('practice-status',aim?`強さ${Math.round(aim.power*100)}% · 離すと発射`:'引いて戻すと取消。');
 });
 on(canvas,'pointerup',event=>{
  const g=gesture;if(!g||g.id!==event.pointerId)return;gesture=null;canvas.releasePointerCapture?.(event.pointerId);
  if(!input()||g.revision!==pub.revision)return;
  aim=shotFromPull(g.diskId,g.start,point(event,g.rect));
  if(aim)fire();else cancel(g.max<=6?`青${Number(selected.at(-1))+1}を選択。引いて離すと発射。`:'発射を取り消しました。');
 });
 for(const name of ['pointercancel','lostpointercapture'])on(canvas,name,event=>{if(gesture?.id===event.pointerId)cancel();});
 on(canvas,'keydown',event=>{
  if(!input()||gesture)return;const key=event.key.toLowerCase();if(!['enter','escape','a','d','w','s','q','e'].includes(key))return;event.preventDefault();
  if(key==='enter'){if(event.repeat)return;if(aim)fire();else numeric();}
  else if(key==='escape')cancel();
  else if(key==='q'||key==='e'){const own=pub.state.disks.filter(d=>d.alive&&d.owner===0),i=own.findIndex(d=>d.id===selected);silence();selected=own[(i+(key==='q'?-1:1)+own.length)%own.length].id;aim=null;sync();const message=`青${Number(selected.at(-1))+1}を選択しました。`;text('practice-status',message);announce(message);}
  else numeric(key==='a'?-Math.PI/24:key==='d'?Math.PI/24:0,key==='w'?.05:key==='s'?-.05:0);
 });
 function pause(){
  cancelGesture();silence();aim=null;
  if(session.pause()){refresh();last=null;text('practice-status','再生を止めています。「再生を再開」で続ける。');}sync();
 }
 on(win,'blur',pause);on(doc,'visibilitychange',()=>{if(doc.hidden)pause();});
 on(win,'resize',()=>{if(gesture)cancel('画面が変わったため発射を取り消しました。');renderer.resize();dirty=true;});
 on(win,'pagehide',()=>{pause();});on(win,'pageshow',event=>{if(event.persisted)reset();});
 on(motion,'change',()=>{dirty=true;});
 function render(){
  const replay=pub.phase==='playback'&&artifact,disks=replay?sampleFrames(artifact.frames,time,artifact.events):pub.state.disks,pads=replay?artifact.replayPads:pub.state.pads,events=replay?artifact.events:[];
  renderer.draw({disks,pads,events,time:replay?time:0,viewer:0,selected:input()?selected:null,aim:input()?aim:null,reducedMotion:motion.matches});
  if(input()){
   // The fixed opponent command is deliberately public only in this practice screen.
   renderer.ctx.save();renderer.ctx.beginPath();renderer.ctx.arc(renderer.size/2,renderer.size/2,renderer.size*.496,0,Math.PI*2);renderer.ctx.clip();renderer.ctx.globalAlpha=.55;renderer.aim(pub.opponent.shot,disks,0);renderer.ctx.restore();
  }
  const counts=[0,1].map(o=>disks.filter(d=>d.owner===o&&d.alive).length);text('blue-count',`青 ${counts[0]}`);text('orange-count',`橙 ${counts[1]}`);
  const enemy=pub.opponent.shot,shownPads=visiblePads(pads,events,replay?time:0);
  const pieces=disks.filter(d=>d.alive).map(d=>`${d.owner===0?'青':'橙'}${d.index+1}：${d.x<0?'左':'右'}${Math.round(Math.abs(d.x)/150*100)}%・${d.y<0?'上':'下'}${Math.round(Math.abs(d.y)/150*100)}%。`).join(' ');
  text('practice-description',`練習用の固定局面。位置は中心を0%、中心からリングの縁までを100%として、画面の左右上下で示します。青${counts[0]}個、橙${counts[1]}個。${pieces} ${padDescription(shownPads,0)} 相手の決まった入力は橙${Number(enemy.diskId.at(-1))+1}、上から時計回り${degrees(enemy.angle)}度、強さ${Math.round(enemy.power*100)}%。${aim?`自分は青${Number(aim.diskId.at(-1))+1}、${degrees(aim.angle)}度、強さ${Math.round(aim.power*100)}%。`:''}`);
 }
 function frame(now){
  if(disposed)return;const delta=last===null?0:Math.min(50,Math.max(0,now-last));last=now;
  if(pub.phase==='playback'&&!pub.paused&&!doc.hidden&&artifact){
   time+=delta/1000*.62;dirty=true;
   const end=Math.max(artifact.duration+.25,...artifact.events.filter(e=>e.type==='ringout').map(e=>e.time+.55),.45);
   if(time>=end){session.finish(pub.revision);refresh();artifact=null;sync();const n=[0,1].map(o=>pub.state.disks.filter(d=>d.owner===o&&d.alive).length);const message=`この一手の結果：青${n[0]}個・橙${n[1]}個。「もう一度」で別の狙いを試せます。`;text('practice-status',message);announce(message);}
  }
  if(dirty){render();dirty=false;}frameId=win.requestAnimationFrame(frame);
 }
 renderer.resize();sync();render();frameId=win.requestAnimationFrame(frame);
 return{getPublic:()=>session.getPublic(),dispose(){disposed=true;cancelGesture();silence();for(const remove of listeners)remove();if(frameId!==null)win.cancelAnimationFrame?.(frameId);artifact=null;aim=null;renderer.clear();}};
}
if(typeof document!=='undefined'&&document.getElementById('practice-root'))mountPractice();
