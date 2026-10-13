import {restoreTutorial} from './tutorial.mjs?v=20261013-qa4';
import {parseSave} from './core.mjs?v=20261013-qa4';
import {parseManagementSave,validateManagement} from './management.mjs?v=20261013-qa4';
export const SAVE_FORMAT='komorebi-cafe-game';
export const SAVE_VERSION=2;
export const MAX_GAME_SAVE_BYTES=1000000;
const ownedGrowth=business=>({...business.progression?.expansions??{indoor:0,terrace:0}});
const sameGrowth=(a,b)=>['indoor','terrace'].every(key=>(a?.[key]??0)===(b?.[key]??0));
/** A layout file supplies furniture and finishes, never paid land ownership. */
export function layoutForBusiness(layout,business,manifest){
 const next=JSON.parse(JSON.stringify(layout));next.growth=ownedGrowth(business);
 try{return parseSave(JSON.stringify(next),manifest)}catch(error){throw Error(`購入済みの敷地に配置できません。拡張状況を確認してください。${error.message}`)}
}
function assertOwnership(layout,business){if(!sameGrowth(layout.growth,ownedGrowth(business)))throw Error('敷地の拡張と購入記録が一致しません。経営データを含む正しい保存ファイルを選んでください')}
export function encodeGame(layout,business,tutorial){const problem=validateManagement(business);if(problem)throw Error(problem);assertOwnership(layout,business);const text=JSON.stringify({format:SAVE_FORMAT,version:SAVE_VERSION,layout,business,...(tutorial===undefined?{}:{tutorial:restoreTutorial(tutorial)})});if(new TextEncoder().encode(text).length>MAX_GAME_SAVE_BYTES)throw Error('ゲームの保存データが1MBの上限を超えています');return text}
export function decodeGame(text,manifest){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_GAME_SAVE_BYTES)throw Error('ゲームの保存ファイルは1MB以下にしてください');
 let data;try{data=JSON.parse(text)}catch{throw Error('保存ファイルのJSONを読み取れません')}
 if(data?.format!==SAVE_FORMAT||![1,SAVE_VERSION].includes(data.version))throw Error('こもれび珈琲店のゲーム保存ファイルではありません');
 const layout=parseSave(JSON.stringify(data.layout),manifest),business=parseManagementSave(JSON.stringify(data.business));
 assertOwnership(layout,business);return {layout,business,...(Object.hasOwn(data,'tutorial')?{tutorial:restoreTutorial(data.tutorial)}:{})};
}
