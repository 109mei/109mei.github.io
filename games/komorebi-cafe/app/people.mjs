import * as THREE from './vendor/three/build/three.module.js';
import {createFoodFactory,FOOD_MODELS} from './food.mjs?v=20261013-qa4';

const TAU=Math.PI*2;
const SKIN=['#d9ab85','#bc805a','#94603f','#e5be9d','#a96f50'];
const SHIRTS=['#b67c59','#587e79','#b9a371','#847093','#ac5960','#739067'];
const HAIR=['#322b25','#5b4230','#785740','#232c2b'];
const PANTS=['#3c4a49','#5c5b4a','#4c5668'];
const ease=(value,target,rate,dt)=>THREE.MathUtils.lerp(value,target,1-Math.exp(-rate*dt));
export function characterSeed(id){let value=2166136261;for(const c of String(id))value=Math.imul(value^c.charCodeAt(0),16777619);return value>>>0}
export function characterMode(actor){if(actor.staff){const kind=actor.task?.kind??'idle';return {deliveryPrepare:'prepare',deliveryPack:'prepare',deliveryHandoff:'deliver'}[kind]??kind;}return ['ordering','preparing','ready','paying'].includes(actor.stage)?'seated':actor.stage==='eating'?'drinking':actor.stage==='walking'?'walking':'idle'}
export function characterVisible(actor){return actor.staff||!['departed','cleaning'].includes(actor.stage)}

/** Shared low-poly geometry and palette materials; each person has independent articulated joints. */
export function createCharacterFactory({foodFactory=null}={}){
 const food=foodFactory??createFoodFactory(),ownsFood=!foodFactory;
 const geometries={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,16,12),cylinder:new THREE.CylinderGeometry(1,1,1,12),taper:new THREE.CylinderGeometry(.85,1,1,12),hair:new THREE.SphereGeometry(1,16,10,0,TAU,0,Math.PI*.54),ring:new THREE.TorusGeometry(1,.2,6,12),smile:new THREE.TorusGeometry(1,.1,5,12,Math.PI)};
 const palette=new Map();let disposed=false;
 function material(color,roughness=.85){const key=color+':'+roughness;if(!palette.has(key))palette.set(key,new THREE.MeshStandardMaterial({color,roughness}));return palette.get(key)}
 function create(id,{staff=false,role='service',seed=characterSeed(id)}={}){
  if(disposed)throw Error('Character factory is disposed');const root=new THREE.Group();root.name=`PERSON_${id}`;root.userData={personId:id,staff,role};
  const skin=material(SKIN[seed%SKIN.length]),shirt=material(staff?'#eee4ce':SHIRTS[(seed>>>3)%SHIRTS.length]),pants=material(PANTS[(seed>>>5)%PANTS.length]),hair=material(HAIR[(seed>>>7)%HAIR.length]),shoe=material('#333b34'),white=material('#f7f0dc'),apron=material(role==='barista'?'#7b6545':'#456c5c'),pocket=material(role==='barista'?'#95835e':'#688878'),coffee=material('#4b3020'),black=material('#243129');
  const joints={},props={};
  function group(name,parent,x=0,y=0,z=0){const o=new THREE.Group();o.name=name;o.position.set(x,y,z);parent.add(o);joints[name]=o;return o}
  function mesh(name,parent,geometry,mat,x,y,z,sx,sy,sz){const o=new THREE.Mesh(geometries[geometry],mat);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
  const hips=group('hips',root,0,.88,0),torso=group('torso',hips,0,.045,0);
  mesh('tailored_pelvis',hips,'sphere',pants,0,-.045,0,.16,.075,.125);
  mesh('shirt_torso',torso,'taper',shirt,0,.235,0,.205,.425,.137);
  mesh('shirt_hem',torso,'cylinder',shirt,0,.025,0,.19,.04,.132);
  mesh('neck',torso,'cylinder',skin,0,.489,0,.053,.085,.052);
  const head=group('head',torso,0,.655,0);
  mesh('face',head,'sphere',skin,0,0,0,.137,.169,.126);
  mesh('hair_crown',head,'hair',hair,0,.026,-.009,.146,.163,.136);
  const fringe=mesh('swept_fringe',head,'sphere',hair,-.035,.103,.076,.107,.045,.085);fringe.rotation.z=-.2;
  if((seed>>>10)%3===1){mesh('hair_bun',head,'sphere',hair,0,.025,-.135,.092,.093,.063)}else if((seed>>>10)%3===2){mesh('hair_back',head,'sphere',hair,0,-.027,-.063,.147,.145,.095)}
  for(const x of[-.143,.143])mesh('ear',head,'sphere',skin,x,-.02,-.004,.027,.04,.024);
  for(const x of[-.047,.047]){mesh('eye',head,'sphere',black,x,.015,.12,.013,.018,.011);mesh('eye_glint',head,'sphere',white,x-.003,.019,.128,.004,.005,.003);const brow=mesh('eyebrow',head,'box',hair,x,.052,.119,.035,.009,.008);brow.rotation.z=x>0?-.08:.08}
  mesh('nose',head,'sphere',skin,0,-.023,.13,.024,.031,.026);
  const smile=mesh('smile',head,'smile',material('#946151'),0,-.073,.113,.026,.016,.015);smile.rotation.z=Math.PI;
  for(const side of[-1,1]){
   const suffix=side===-1?'L':'R',hip=group('hip'+suffix,hips,side*.1,-.055,0);
   mesh('trouser_thigh'+suffix,hip,'taper',pants,0,-.19,0,.078,.38,.079);
   const knee=group('knee'+suffix,hip,0,-.38,0);mesh('trouser_shin'+suffix,knee,'taper',pants,0,-.165,0,.06,.33,.061);
   mesh('shoe'+suffix,knee,'sphere',shoe,0,-.365,.045,.08,.067,.139);mesh('shoe_sole'+suffix,knee,'box',material('#a09b85'),0,-.416,.043,.135,.02,.224);
   const shoulder=group('shoulder'+suffix,torso,side*.211,.396,0);shoulder.rotation.order='ZXY';mesh('sleeve'+suffix,shoulder,'sphere',shirt,side*.015,-.078,0,.082,.14,.09);
   mesh('upper_arm'+suffix,shoulder,'cylinder',skin,0,-.178,0,.052,.16,.052);
   const elbow=group('elbow'+suffix,shoulder,0,-.267,0);mesh('forearm'+suffix,elbow,'taper',skin,0,-.111,0,.049,.223,.047);
   const hand=group('hand'+suffix,elbow,0,-.263,0);mesh('palm'+suffix,hand,'sphere',skin,0,0,.009,.049,.067,.038);mesh('thumb'+suffix,hand,'sphere',skin,-side*.042,.012,.025,.02,.038,.025);
  }
  if(staff){
   mesh('apron_skirt',hips,'box',apron,0,-.043,.143,.31,.39,.031);mesh('apron_bib',torso,'box',apron,0,.242,.139,.238,.287,.028);mesh('apron_pocket',hips,'box',pocket,0,-.055,.162,.165,.103,.019);
   for(const x of[-.1,.1])mesh('apron_strap',torso,'box',apron,x,.394,.116,.028,.135,.022);
   const cap=mesh('staff_cap',head,'taper',apron,0,.167,-.004,.144,.06,.139);mesh('cap_brim',head,'sphere',apron,0,.141,.111,.144,.018,.09);
   mesh('name_badge',torso,'box',white,-.057,.29,.158,.06,.032,.007);
  }
  if(role==='courier'){
   const bag=material('#b78251'),strap=material('#594c39');
   mesh('courier_insulated_bag',torso,'box',bag,0,.23,-.255,.36,.43,.26);
   mesh('courier_bag_lid',torso,'box',strap,0,.455,-.255,.38,.035,.28);
   mesh('courier_bag_reflector',torso,'box',white,0,.24,-.391,.27,.035,.015);
   for(const x of[-.125,.125])mesh('courier_shoulder_strap',torso,'box',strap,x,.27,.141,.033,.38,.022);
  }
  // Props remain attached to real hand or torso joints and only appear for the relevant task.
  const cup=group('cup',joints.handR,0,-.007,.055);mesh('cup_body',cup,'taper',white,0,.035,0,.043,.075,.043);mesh('coffee_surface',cup,'cylinder',coffee,0,.074,0,.036,.003,.036);const handle=mesh('cup_handle',cup,'ring',white,.049,.042,0,.032,.032,.024);handle.rotation.y=Math.PI/2;props.cup=cup;
  const tray=group('tray',torso,0,.215,.415);mesh('wooden_tray',tray,'cylinder',material('#8d6545'),0,0,0,.226,.024,.154);mesh('tray_cup',tray,'taper',white,-.075,.047,0,.045,.08,.045);mesh('tray_coffee',tray,'cylinder',coffee,-.075,.088,0,.038,.003,.038);mesh('tray_plate',tray,'cylinder',white,.095,.027,.014,.073,.008,.073);mesh('tray_cake',tray,'taper',material('#c49a61'),.095,.056,.014,.044,.05,.041);props.tray=tray;
  const cloth=group('cloth',joints.handR,0,-.015,.024);mesh('cleaning_cloth',cloth,'box',material('#c5d8ba'),0,0,0,.12,.016,.09);props.cloth=cloth;
  const pad=group('notepad',joints.handL,0,-.016,.02);mesh('order_notepad',pad,'box',white,0,0,0,.083,.012,.12);props.notepad=pad;
  const pen=group('pen',joints.handR,0,-.018,.012);const pencil=mesh('order_pencil',pen,'cylinder',material('#80664b'),0,0,0,.006,.10,.006);pencil.rotation.x=.8;props.pen=pen;
  Object.values(props).forEach(p=>p.visible=false);
  const utensil=group('utensil',joints.handR,0,-.01,.032);mesh('utensil_handle',utensil,'cylinder',material('#b4b5a6',.3),0,.027,0,.004,.087,.004);mesh('utensil_bowl',utensil,'sphere',material('#b4b5a6',.3),0,.076,0,.013,.003,.022);props.utensil=utensil;utensil.visible=false;
  const person={root,joints,props,seed,staff,role,foodFactory:food,menuIds:null};updateCharacterPose(person,{mode:'idle',time:0},1);return person;
 }
 return {create,dispose(){if(disposed)return;disposed=true;for(const g of Object.values(geometries))g.dispose();for(const m of palette.values())m.dispose();if(ownsFood)food.dispose()},get geometryCount(){return Object.keys(geometries).length},get materialCount(){return palette.size}};
}

/** Bind visible props to the actual order. Empty/unknown orders never produce phantom food.
 * Accepts a canonical menu ID or the simulation's full order array. Shared food resources
 * belong to the character/food factory, so changing orders only detaches old instances.
 */
export function setCharacterMenu(person,order){
 const ids=(Array.isArray(order)?order:typeof order==='string'?[order]:[]).filter(id=>Object.hasOwn(FOOD_MODELS,id)).slice(0,3),key=ids.join('|');
 if(person.menuKey===key)return person;person.menuKey=key;person.menuIds=ids;person.root.userData.order=[...ids];
 const cup=person.props.cup,tray=person.props.tray;cup.clear();for(const child of [...tray.children])if(child.name!=='wooden_tray')tray.remove(child);tray.userData.order=[...ids];
 const drink=ids.find(id=>FOOD_MODELS[id].category==='drink');person.drinkMenuId=drink??null;cup.userData.menuId=drink??null;
 if(drink){const model=person.foodFactory.create(drink,{scale:.78,withDish:false}),lip=model.userData.drinkLipHeight??.15;model.position.y=.075-lip*.78;cup.add(model)}
 ids.forEach((id,i)=>{const drinkItem=FOOD_MODELS[id].category==='drink',n=ids.length,model=person.foodFactory.create(id,{scale:n===1?(drinkItem?.88:.76):n===2?(drinkItem?.72:.55):.43});model.position.set(n===1?0:n===2?(i===0?-.104:.096):(i-1)*.125,.017,n===3?(i===1?.045:-.024):0);tray.add(model)});
 return person;
}

/** Poses are render-only: accounting and simulation remain entirely outside the model. */
export function updateCharacterPose(person,{mode='idle',time=0,walking=false,speed=1}={},dt=1/60){
 const j=person.joints,p=person.props,phase=time*7.5+(person.seed%100)/10,walk=walking||mode==='walking',seated=['seated','drinking'].includes(mode),drink=mode==='drinking'&&(person.menuIds===null||!!person.drinkMenuId),eat=mode==='drinking'&&person.menuIds!==null&&!person.drinkMenuId&&person.menuIds.length>0,sway=Math.sin(time*1.35+person.seed%10);
 const pose={hipsY:seated?.56:.88,torsoX:0,torsoZ:0,headX:0,headY:sway*.035,hipLX:seated?-1.35:0,hipRX:seated?-1.35:0,kneeLX:seated?1.35:0,kneeRX:seated?1.35:0,shoulderLX:seated?-.72:.04,shoulderRX:seated?-.72:.04,shoulderLZ:.08,shoulderRZ:-.08,elbowLX:seated?-1.05:-.1,elbowRX:seated?-1.05:-.1};
 if(walk){const amplitude=Math.min(1,Math.max(.25,speed));pose.hipLX=Math.sin(phase)*.57*amplitude;pose.hipRX=-pose.hipLX;pose.kneeLX=Math.max(0,-Math.sin(phase))*.55;pose.kneeRX=Math.max(0,Math.sin(phase))*.55;pose.shoulderLX=-Math.sin(phase)*.37;pose.shoulderRX=-pose.shoulderLX;pose.hipsY=.88+Math.abs(Math.sin(phase))*.018;pose.torsoZ=Math.sin(phase)*.026}
 Object.values(p).forEach(prop=>prop.visible=false);p.cup.rotation.z=0;
 if(drink){const sip=(Math.sin(time*.9+person.seed%4)+1)/2;pose.shoulderRX=-.72-sip*.84;pose.elbowRX=-1.05-sip*.64;pose.shoulderRZ=-.08+sip*.75;pose.headX=sip*.07;p.cup.visible=true;p.cup.rotation.x=-(pose.shoulderRX+pose.elbowRX+pose.torsoX)-sip*.45;p.cup.rotation.z=-pose.shoulderRZ}
 if(eat){const bite=(Math.sin(time*1.2+person.seed%4)+1)/2;pose.shoulderRX=-.77-bite*.7;pose.elbowRX=-1.1-bite*.48;pose.shoulderRZ=-.1+bite*.57;pose.headX=.06;pose.shoulderLX=-.86;pose.elbowLX=-.95;p.utensil.visible=true;p.utensil.rotation.x=-(pose.shoulderRX+pose.elbowRX);p.utensil.rotation.z=-pose.shoulderRZ}
 if(mode==='deliver'){pose.shoulderLX=pose.shoulderRX=-.93;pose.elbowLX=pose.elbowRX=-.67;p.tray.visible=true;pose.headX=.04}
 if(mode==='order'||mode==='checkout'){pose.shoulderLX=-.93;pose.elbowLX=-.85;pose.shoulderRX=-.91+Math.sin(time*6)*.07;pose.elbowRX=-1.18;pose.headX=.14;p.notepad.visible=mode==='order';p.pen.visible=mode==='order'}
 if(mode==='prepare'){pose.shoulderLX=-.8;pose.shoulderRX=-.96+Math.sin(time*5)*.14;pose.elbowLX=-.83;pose.elbowRX=-.75;pose.torsoX=.055;pose.headX=.14;p.cup.visible=person.menuIds===null||!!person.drinkMenuId;p.utensil.visible=person.menuIds!==null&&!person.drinkMenuId&&person.menuIds.length>0;p.cup.rotation.x=1.7}
 if(mode==='clean'&&!walk){pose.torsoX=.36;pose.headX=.16;pose.shoulderRX=-1.0+Math.sin(time*7)*.2;pose.shoulderRZ=-.15+Math.sin(time*4)*.15;pose.elbowRX=-.42;pose.shoulderLX=-.25;p.cloth.visible=true}
 const rate=walk?15:9,step=Math.min(.2,Math.max(0,dt));j.hips.position.y=ease(j.hips.position.y,pose.hipsY,rate,step);j.torso.rotation.x=ease(j.torso.rotation.x,pose.torsoX,rate,step);j.torso.rotation.z=ease(j.torso.rotation.z,pose.torsoZ,rate,step);j.head.rotation.x=ease(j.head.rotation.x,pose.headX,rate,step);j.head.rotation.y=ease(j.head.rotation.y,pose.headY,rate,step);
 for(const side of['L','R']){for(const part of['hip','knee','shoulder','elbow'])j[part+side].rotation.x=ease(j[part+side].rotation.x,pose[part+side+'X'],rate,step);j['shoulder'+side].rotation.z=ease(j['shoulder'+side].rotation.z,pose['shoulder'+side+'Z'],rate,step)}
 return person;
}
