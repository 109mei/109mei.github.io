import {createSpringLesson} from '../strategy/onboarding/spring-lesson.mjs?v=d7ca654dbee80c540f71c01e';
import {resolveTurn} from '../core/game.mjs?v=d7ca654dbee80c540f71c01e';
const clone=x=>structuredClone(x);
/** Public, fixed-opponent practice only. No connection to a private two-player session. */
export function createPracticeSession(initial={}){
 let options={spring:initial.spring??true,counter:initial.counter??false},state,opponent,phase='input',paused=false,result=null,revision=0;
 const rebuild=()=>{
  if(typeof options.spring!=='boolean'||typeof options.counter!=='boolean')throw new TypeError('practice settings must be boolean');
  const scene=createSpringLesson({branch:options.counter?'counter':'route',spring:options.spring});
  state=scene.state;opponent=scene.commands[1];phase='input';paused=false;result=null;revision++;
 };
 rebuild();
 return{
  getPublic:()=>clone({options,state,opponent,phase,paused,revision}),
  configure(next={}){
   const candidate={...options,...next};
   if(typeof candidate.spring!=='boolean'||typeof candidate.counter!=='boolean')throw new TypeError('practice settings must be boolean');
   options={spring:candidate.spring,counter:candidate.counter};rebuild();return this.getPublic();
  },
  reset(){rebuild();return this.getPublic();},
  launch(shot,expected=revision){
   if(expected!==revision||phase!=='input')return null;
   // Resolve the actual caller's input. The fixture's reference result is never replayed here.
   const resolved=resolveTurn(state,[{shot},opponent]);
   result=resolved;phase='playback';paused=false;revision++;return clone(resolved);
  },
  pause(){if(phase!=='playback'||paused)return false;paused=true;revision++;return true;},
  resume(expected=revision){if(expected!==revision||phase!=='playback'||!paused)return false;paused=false;revision++;return true;},
  finish(expected=revision){if(expected!==revision||phase!=='playback'||paused)return false;state=result.state;phase='result';result=null;revision++;return true;},
 };
}
