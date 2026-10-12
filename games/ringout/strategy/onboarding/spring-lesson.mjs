/** Optional practice candidate. Replays a legal prefix of the RECONSTRUCTED game. */
import { createMatch, resolveTurn } from '../../core/game.mjs?v=d7ca654dbee80c540f71c01e';
const radians = degrees => degrees * Math.PI / 180;
const command = (diskId, degrees, power) => ({ shot: {diskId, angle:radians(degrees), power} });
export const LESSON_BRANCHES = Object.freeze({
  route:{label:'ばねで曲がる',own:[-15,1],enemy:['p1-0',180,.1]},
  weak:{label:'届かない弱さ',own:[-15,.2],enemy:['p1-0',180,.1]},
  gentle:{label:'曲がって止まる',own:[-15,.7],enemy:['p1-0',180,.1]},
  direct:{label:'直接ねらう',own:[-82.5,1],enemy:['p1-0',180,.1]},
  counter:{label:'相手がよける',own:[-15,1],enemy:['p1-2',127.5,.45]},
});
function controls(commands) {
  return commands.map(({shot,placement},owner)=>({owner,unitNumber:Number(shot.diskId.at(-1))+1,
    canonicalAngleDegrees:shot.angle*180/Math.PI,
    privateBearingDegrees:((shot.angle*180/Math.PI+(owner?180:0)+90)%360+360)%360,
    powerPercent:Math.round(shot.power*100),...(placement?{placement:{anchorNumber:3,positionBearing:75,outletBearing:0,distance:35}}:{})}));
}
export function createSpringLesson({branch='route',spring=true}={}) {
  const option=LESSON_BRANCHES[branch];if(!option)throw new RangeError('unknown lesson branch');
  let state=createMatch(),history=[];
  const opening=[command('p0-1',-90,1),command('p1-0',0,.5)];
  let resolved=resolveTurn(state,opening);history.push({before:state,commands:opening,controls:controls(opening),result:resolved});state=resolved.state;
  const anchor=state.disks.find(d=>d.id==='p0-2');
  const placement={anchorId:anchor.id,x:anchor.x+35*Math.cos(radians(-15)),y:anchor.y+35*Math.sin(radians(-15)),angle:radians(-90)};
  const preparation=[command('p0-1',225,.65),command('p1-0',180,.1)];
  if(spring)preparation[0].placement=placement;
  resolved=resolveTurn(state,preparation);history.push({before:state,commands:preparation,controls:controls(preparation),result:resolved});state=resolved.state;
  const commands=[command('p0-2',...option.own),command(...option.enemy)];
  const result=resolveTurn(state,commands);
  return {id:`rebuild-spring-${branch}-${spring?'on':'off'}`,label:option.label,state,commands,
    controls:controls(commands),placement,history,result,
    scope:{reconstructedBaseline:true,legalNonzeroPrefix:true,currentBrowserVerified:false,
      claim:'A readable candidate comparison, not a necessary spring strategy, guaranteed outcome against unknown input, or human enjoyment evidence.'}};
}
