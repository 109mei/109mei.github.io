import {getGrowthBounds} from './progression.mjs?v=20261013-qa6';
export const LABELS={table:'テーブル',chair:'チェア',counter:'カウンター',shelf:'シェルフ',pendant:'ペンダント',sofa:'ソファ',bench:'ベンチ',plant:'観葉植物',planter:'プランター',outdoor_table:'テラス・テーブル',outdoor_chair:'テラス・チェア',parasol:'パラソル',rug:'ラグ',menu_board:'メニューボード',lamp:'フロアランプ',pastry_case:'ケーキケース'};
export const MAX_ITEMS=80,MAX_PENDANTS=12;
export const ZONES=Object.freeze({indoor:Object.freeze({minX:-2.88,maxX:2.88,minZ:-2.63,maxZ:2.63}),terrace:Object.freeze({minX:-3.4,maxX:3.4,minZ:3.25,maxZ:6.55})});
export const STYLES=Object.freeze({natural:'ナチュラル',modern:'モダン',vintage:'ヴィンテージ'});
export const FINISHES=Object.freeze({wall:Object.freeze({plain:'無地',stripe:'ストライプ',tile:'タイル',botanical:'リーフ'}),floor:Object.freeze({wood:'板張り',tile:'タイル',stone:'石目'}),terrace:Object.freeze({deck:'ウッドデッキ',stone:'石畳',brick:'レンガ'})});
export const snap=n=>Math.round(n*10)/10;
export const clone=x=>JSON.parse(JSON.stringify(x));
export const itemZone=o=>o.zone===undefined?'indoor':o.zone;
export const MAX_EXPANSION_LEVEL=6;
export const growthLevels=source=>({...{indoor:0,terrace:0},...source?.growth});
export const furnitureLimit=layout=>MAX_ITEMS+12*(growthLevels(layout).indoor+growthLevels(layout).terrace);
export const pendantLimit=layout=>MAX_PENDANTS+2*growthLevels(layout).indoor;
export const layoutBounds=layout=>getGrowthBounds(layout??{});
export const zoneBounds=(zone,layout)=>Object.hasOwn(ZONES,zone)?layoutBounds(layout)[zone]:null;
export const itemLayer=(o,m)=>m.prototypes[o.type]?.layer??(o.type==='pendant'?'overhead':'furniture');
export function itemAppearance(o,s){return {color:o.appearance?.color??s.colors.wood,accent:o.appearance?.accent??'#76856a',style:o.appearance?.style??'natural'}}
export function defaults(manifest){return {version:1,growth:{indoor:0,terrace:0},instances:clone(manifest.initialInstances),colors:{floor:'#c2ad8a',wall:'#e8dfcf',wood:'#70543e',terrace:'#b99770'},finishes:{wall:'plain',floor:'wood',terrace:'deck'},light:{intensity:1,warmth:0.6}}}
export function footprint(o,m){const p=m.prototypes[o.type];return o.rotationDeg%180?{w:p.depth,d:p.width}:{w:p.width,d:p.depth}}
function overlaps(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2-1e-7&&Math.abs(a.z-b.z)<(a.d+b.d)/2-1e-7}
const isColor=x=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x);
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function validate(s,m){
 if(!isRecord(s)||s.version!==1||!Array.isArray(s.instances))return '保存形式のバージョンが違います';
 if(s.growth!==undefined&&(!isRecord(s.growth)||Object.keys(s.growth).some(k=>!['indoor','terrace'].includes(k))||!['indoor','terrace'].every(k=>Number.isInteger(s.growth[k])&&s.growth[k]>=0&&s.growth[k]<=MAX_EXPANSION_LEVEL)))return '増築レベルが不正です';
 if(s.instances.length>furnitureLimit(s))return `家具は最大${furnitureLimit(s)}点です`;
 if(s.instances.filter(o=>o?.type==='pendant').length>pendantLimit(s))return `ペンダント照明は最大${pendantLimit(s)}点です`;
 const ids=new Set(),rects=[];
 for(const o of s.instances){
  if(!isRecord(o)||typeof o.id!=='string'||!/^[a-zA-Z0-9_-]{1,48}$/.test(o.id)||ids.has(o.id))return '家具IDが不正です';ids.add(o.id);
  if(typeof o.type!=='string'||!Object.hasOwn(m.prototypes,o.type)||![0,90,180,270].includes(o.rotationDeg)||![o.x,o.z].every(n=>Number.isFinite(n)&&Math.abs(n-snap(n))<1e-7))return '位置または家具の種類が不正です';
  const zone=itemZone(o),p=m.prototypes[o.type],b=zoneBounds(zone,s);
  if(typeof zone!=='string'||!Object.hasOwn(ZONES,zone)||(p.zones&&!p.zones.includes(zone)))return 'この家具を置けるエリアを選んでください';
  if(o.appearance!==undefined&&(!isRecord(o.appearance)||Object.entries(o.appearance).some(([k,v])=>k==='style'?!Object.hasOwn(STYLES,v):['color','accent'].includes(k)?!isColor(v):false)||o.appearance.style!==undefined&&typeof o.appearance.style!=='string'))return '家具の色またはスタイルが不正です';
  const f=footprint(o,m),layer=itemLayer(o,m),r={x:o.x,z:o.z,w:f.w,d:f.d,zone,layer};
  if(r.x-r.w/2<b.minX-1e-7||r.x+r.w/2>b.maxX+1e-7||r.z-r.d/2<b.minZ-1e-7||r.z+r.d/2>b.maxZ+1e-7)return zone==='indoor'?'壁の内側に配置してください':'テラスの内側に配置してください';
  if(layer==='furniture'&&overlaps(r,zone==='indoor'?{x:0,z:2.35,w:1.2,d:0.8}:{x:0,z:3.45,w:1.2,d:0.6}))return '入口のスペースを空けてください';
  if(rects.some(q=>q.zone===zone&&q.layer===layer&&overlaps(q,r)))return 'ほかの家具と重なっています';rects.push(r);
 }
 if(!isRecord(s.colors)||!['floor','wall','wood'].every(k=>isColor(s.colors[k]))||s.colors.terrace!==undefined&&!isColor(s.colors.terrace))return '色の値が不正です';
 if(s.finishes!==undefined&&(!isRecord(s.finishes)||Object.entries(s.finishes).some(([k,v])=>Object.hasOwn(FINISHES,k)&&(typeof v!=='string'||!Object.hasOwn(FINISHES[k],v)))))return '仕上げの値が不正です';
 if(!isRecord(s.light)||!Number.isFinite(s.light.intensity)||s.light.intensity<0.2||s.light.intensity>2||!Number.isFinite(s.light.warmth)||s.light.warmth<0||s.light.warmth>1)return '照明の値が不正です';
 return null;
}
export function parseSave(text,m){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>50000)throw Error('ファイルは50KB以下にしてください');let s;try{s=JSON.parse(text)}catch{throw Error('JSONを読み取れません')}
 const error=validate(s,m);if(error)throw Error(error);
 const d=defaults(m);return {version:1,growth:growthLevels(s),instances:s.instances.map(o=>{const clean={id:o.id,type:o.type,x:o.x,z:o.z,rotationDeg:o.rotationDeg};if(o.zone!==undefined)clean.zone=o.zone;if(o.appearance!==undefined){clean.appearance={};for(const k of['color','accent','style'])if(o.appearance[k]!==undefined)clean.appearance[k]=o.appearance[k]}return clean}),colors:{floor:s.colors.floor,wall:s.colors.wall,wood:s.colors.wood,terrace:s.colors.terrace??d.colors.terrace},finishes:{wall:s.finishes?.wall??d.finishes.wall,floor:s.finishes?.floor??d.finishes.floor,terrace:s.finishes?.terrace??d.finishes.terrace},light:{intensity:s.light.intensity,warmth:s.light.warmth}};
}
/** Layout history never rolls back purchased floor area. Full-game loading uses reset. */
export function createStore(initial,m){
 const error=validate(initial,m);if(error)throw Error(error);
 let state={...clone(initial),growth:growthLevels(initial)},past=[],future=[];
 const withGrowth=next=>({...clone(next),growth:clone(state.growth)});
 return {
  get state(){return clone(state)},get canUndo(){return !!past.length},get canRedo(){return !!future.length},
  commit(fn){const next=clone(state);fn(next);next.growth=clone(state.growth);const error=validate(next,m);if(error)return error;if(JSON.stringify(next)===JSON.stringify(state))return null;past.push(state);if(past.length>100)past.shift();state=clone(next);future=[];return null},
  replace(next){return this.commit(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,clone(next))})},
  syncGrowth(growth){if(!isRecord(growth))return '増築レベルが不正です';const next={...clone(state),growth:clone(growth)},error=validate(next,m);if(error)return error;if(['indoor','terrace'].some(k=>growth[k]<state.growth[k]))return '購入済みの増築を取り消すことはできません';state=next;return null},
  reset(next){const error=validate(next,m);if(error)return error;state={...clone(next),growth:growthLevels(next)};past=[];future=[];return null},
  undo(){if(past.length){future.push(state);state=withGrowth(past.pop())}},
  redo(){if(future.length){past.push(state);state=withGrowth(future.pop())}}
 };
}
export function findPlacement(type,state,m,zone){
 if(!Object.hasOwn(m.prototypes,type))return null;const p=m.prototypes[type];zone??=p.zones?.[0]??'indoor';const b=zoneBounds(zone,state);if(!b||p.zones&&!p.zones.includes(zone)||state.instances.length>=furnitureLimit(state))return null;
 let id='new-search',n=1;const ids=new Set(state.instances.map(o=>o.id));while(ids.has(id))id=`new-search-${n++}`;
 const minX=Math.ceil((b.minX+p.width/2)*10),maxX=Math.floor((b.maxX-p.width/2)*10),minZ=Math.ceil((b.minZ+p.depth/2)*10),maxZ=Math.floor((b.maxZ-p.depth/2)*10);
 const candidate=clone(state);candidate.instances.push(null);for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){const o={id,type,x:x/10,z:z/10,rotationDeg:0,zone};candidate.instances[candidate.instances.length-1]=o;if(!validate(candidate,m))return o}return null;
}
