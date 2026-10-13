/** Recipe-composed original geometry. Families share construction rules, not a
 * single tinted placeholder. Ingredient pieces, layers, cuts and vessels vary.
 * Coordinates are metres; all generated parts join the factory material batches. */
export function resolveRecipeBaseColor(recipe){
 const id=recipe.id,v=recipe.visual??{},fallback=v.baseColor??'#d9ab68';if(recipe.category!=='drink')return fallback;
 if(id==='white_cocoa')return '#fff0d5';
 if(/matcha/.test(id))return '#77934d';
 if(/cocoa|chocolate/.test(id))return '#724337';
 if(/coffee/.test(id))return ['smoothie','shake'].includes(v.family)?'#ad835e':'#583024';
 if(/kiwi/.test(id))return '#91b65c';
 if(/watermelon/.test(id))return '#dc6966';
 if(/(^|_)grape(_|$)/.test(id))return '#795187';
 if(/banana/.test(id))return v.family==='tea'?'#d1b481':'#eee1ae';
 if(/pineapple/.test(id))return '#e9cf78';
 if(/orange/.test(id)&&['juice','soda','smoothie'].includes(v.family))return '#edb058';
 if(/lemon|yuzu/.test(id)&&['juice','soda'].includes(v.family))return '#e5da9c';
 if(/lime/.test(id)&&v.family==='soda')return '#c8db9a';
 if(/apple_yogurt|oat_smoothie/.test(id))return '#e4d9bc';
 return fallback;
}
export function buildRecipeFood(recipe,g){
 const {plate,cup,glass,sphere,box,cylinder,lathe,tube,ring,rounded,triangle,leaf,strawberry,cream,cherry,blueberries,salad,latteArt}=g;
 const v=recipe.visual??{},family=v.family??recipe.visualFamily,base=/tomato_juice/.test(recipe.id)?'#b74931':/carrot_(smoothie|juice)/.test(recipe.id)?'#eca34c':/avocado_smoothie/.test(recipe.id)?'#b1bf79':/coffee_jelly/.test(recipe.id)?'#52372a':/tea_jelly/.test(recipe.id)?'#b58238':/panna_cotta/.test(recipe.id)&&!/berry/.test(recipe.id)?'#fff3de':resolveRecipeBaseColor(recipe),dessert=recipe.category==='dessert',accent=/demi_omelet/.test(recipe.id)?'#77432c':dessert&&(/custard_pudding|firm_pudding|pumpkin_pudding|basque_cheesecake/.test(recipe.id))?'#925126':v.accentColor??'#bd6843';
 const seed=Number.isInteger(v.variant)?v.variant:[...recipe.id].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,0),phase=seed*.61803398875,variation=(seed%17)/16;
 const shape=v.shape??'round',layers=Math.min(5,Math.max(1,v.layers??2)),toppings=v.toppings??[],TAU=Math.PI*2;
 let top=.065,radius=.11,centerX=0,centerZ=0,drink=false;
 const piece=(name,color,x,y,z,w,d,h)=>shape==='triangle'?triangle(name,color,w,d,h,x,y,z,phase%1):shape==='square'||shape==='layered'?rounded(name,color,w,d,h,.014,x,y,z,phase%1*.3):cylinder(name,color,x,y+h/2,z,w/2,h,d/2);
 const scatter=(n,r,y,fn)=>{for(let i=0;i<n;i++){const a=i*2.399963+phase,rr=r*Math.sqrt((i+.65)/n);fn(Math.cos(a)*rr,y+(i%3)*.002,Math.sin(a)*rr,i,a)}};
 function rice(y=.055){sphere('steamed_rice_mound','cream',0,y,0,.125,.042,.10);scatter(22,.098,y+.036,(x,yy,z,i)=>sphere('rice_grain','egg',x,yy-Math.hypot(x,z)*.16,z,.005,.003,.0025));top=y+.041}
 function noodle(y=.053){for(let i=0;i<9+seed%4;i++){const pts=[];for(let j=0;j<=15;j++){const a=j/15*TAU*1.25+i*.78+phase,rr=.025+(i%4)*.021+j*.0012;pts.push([Math.cos(a)*rr,y+(i%3)*.008+Math.sin(a*2+i)*.007,Math.sin(a)*rr*.8])}tube('curved_noodle','pasta',pts,.0044,24)}top=y+.038}
 function scoops(y=.065){const n=2+seed%3;for(let i=0;i<n;i++){const a=i*TAU/n+phase,x=Math.cos(a)*.043,z=Math.sin(a)*.038;sphere('icecream_scoop',i%2?accent:base,x,y+(i%2)*.023,z,.042,.041,.042);for(let k=0;k<5;k++)sphere('scoop_scallop',i%2?accent:base,x+Math.cos(k*TAU/5)*.029,y-.017+(i%2)*.023,z+Math.sin(k*TAU/5)*.029,.018,.011,.018)}top=y+.061}
 switch(family){
 case'coffee':case'tea':case'cocoa':{
  drink=true;const tall=shape==='tall',iced=/iced|cold_brew|float/.test(recipe.id),espresso=/^espresso$|ristretto|doppio/.test(recipe.id),h=espresso?.061+variation*.009:iced?.20+variation*.02:tall?.136+variation*.018:.096+variation*.018,r=espresso?.041+variation*.004:tall?.052+variation*.005:.063+variation*.008;
  const c=iced?glass({r,h,fill:h-.018,liquid:base}):cup({r,h,color:family==='tea'?'glass':family==='cocoa'?'cup':'mint',liquid:base});top=c.y+.005;radius=r*.64;
  if(iced){scatter(3+seed%3,r*.5,c.y,(x,y,z,i)=>box('iced_coffee_cube','ice',x,y,z,.018,.021,.02,0,i,.15));tube('cold_drink_straw',accent,[[.025,.075,0],[.028,h+.034,0]],.003,3)}
  if(family==='coffee'&&layers>=2&&(v.components??[]).some(c=>c==='milk'||c==='cream')){latteArt(c.y,c.r);for(let i=0;i<seed%4;i++)ring('foam_heart_ring','cream',.009+i*.004,.0012,0,top+i*.0005,0)}
  if(family==='tea'){tube('tea_tag_string','cream',[[.025,c.y,0],[r,c.top,0],[r+.02,.045,.004]],.001,6);box('tea_tag','mint',r+.02,.042,.004,.019,.024,.002);}
  if(family==='cocoa')cream(0,top,0,.03+variation*.009);
  break;
 }
 case'soda':case'smoothie':case'juice':case'shake':{
  drink=true;const h=shape==='tall'?.238:.187+variation*.023,c=glass({r:.053+variation*.006,h,fill:h-.015,liquid:base});top=c.y+.008;radius=.037;
  if(layers>1&&family!=='soda')for(let i=1;i<layers;i++)cylinder('blended_drink_layer',i%2?accent:base,0,c.base+.025+i*(h-.06)/layers,0,.041+i*.002,.021);
  if(family==='soda'||family==='juice')scatter(4+seed%3,.035,top-.007,(x,y,z,i)=>box('ice_cube','ice',x,y,z,.019,.022,.022,i*.1,i*.7,.2));
  if(family==='soda')scatter(10,.035,.045,(x,y,z,i)=>sphere('carbonation_bubble','cream',x,y+i*.012,z,.002));
  if(family==='shake')cream(0,c.top+.005,0,.039);
  tube('bent_drinking_straw',accent,[[.025,.09,-.014],[.03,h+.05,-.014],[.065,h+.068,-.014]],.0032,5);
  break;
 }
 case'toast':{
  plate();const n=shape==='layered'?2:1;
  for(let i=0;i<n;i++){rounded('bread_crust',base,.21,.19,.026,.038,0,.018+i*.03,0,-.12+i*.15);rounded('toasted_crumb','crumb',.19,.168,.005,.029,0,.045+i*.03,0,-.12+i*.15);for(let j=0;j<3;j++)box('toast_score','bread',(j-1)*.045,.052+i*.03,0,.002,.002,.13,0,-.12,0)}top=.055+(n-1)*.03;break;
 }
 case'sandwich':{
  plate();for(const side of[-1,1]){const x=side*.06,rot=side>0?Math.PI:.05;
  for(let i=0;i<layers;i++){triangle('sandwich_bread','crumb',.13,.145,.014,x,.019+i*.025,0,rot);triangle('sandwich_filling',i%2?accent:base,.132,.146,.011,x,.033+i*.025,0,rot)}triangle('sandwich_top','crumb',.13,.145,.014,x,.019+layers*.025,0,rot);
  for(let i=0;i<3;i++)leaf('sandwich_lettuce',x+(i-1)*.025,.04,.048,.019,i)}top=.037+layers*.025;radius=.095;break;
 }
 case'pancakes':{
  plate();if(/galette/.test(recipe.id)){rounded('thin_crepe','bread',.225,.215,.006,.018,0,.019,0);for(let i=0;i<4;i++){const a=i*Math.PI/2;box('folded_crepe_edge','toast',Math.sin(a)*.095,.03,Math.cos(a)*.095,.18,.005,.025,Math.cos(a)*.45,a,0)}top=.037;radius=.067;break}for(let i=0;i<layers+1;i++){cylinder('pancake_edge','bread',0,.031+i*.025,0,.101,.024);sphere('pancake_fluff',base,0,.035+i*.025,0,.102,.012,.10);cylinder('golden_pancake_top','toast',0,.047+i*.025,0,.095,.002)}top=.049+layers*.025;sphere('syrup_pool',accent,0,top,0,.078,.002,.072);for(let i=0;i<2+seed%3;i++){const a=phase+i*1.6;tube('syrup_drip',accent,[[Math.cos(a)*.068,top,Math.sin(a)*.068],[Math.cos(a)*.103,top-.01,Math.sin(a)*.103],[Math.cos(a)*.104,top-.035,Math.sin(a)*.104]],.003,7)}break;
 }
 case'rice':case'curry':{
  plate({r:.20,bowl:true});if(family==='curry'){sphere('curry_sauce',base,0,.04,0,.147,.014,.13);sphere('rice_side','cream',.073,.067,0,.062,.036,.11);scatter(20,.045,.095,(x,y,z)=>sphere('rice_grain','egg',x+.073,y,z*1.7,.005,.0025,.003));top=.062;centerX=-.035;radius=.074}else{if(!/croquette/.test(recipe.id))rice();if(/omelet/.test(recipe.id)){sphere('folded_egg_blanket','yellow',0,.073,0,.13,.036,.085);top=.106}else if(/croquette/.test(recipe.id)){for(let i=0;i<3;i++)sphere('rice_croquette','bread',(i-1)*.074,.06,0,.04,.037,.041);top=.10}else if(/doria|gratin/.test(recipe.id)){sphere('baked_cheese',base,0,.093,0,.123,.013,.092);scatter(12,.093,.11,(x,y,z)=>sphere('browned_cheese_spot','toast',x,y,z,.009,.001,.006));top=.111}else if(shape==='triangle'){for(let i=0;i<3;i++){triangle('rice_ball','cream',.09,.095,.05,(i-1)*.085,.032,0,i*.25);box('nori_wrap','#294737',(i-1)*.085,.052,.024,.036,.043,.054)}top=.085}else sphere('rice_sauce',base,0,.096,0,.10,.007,.081)}break;
 }
 case'pasta':{
  plate({r:.20,bowl:true});sphere('pasta_sauce',base,0,.038,0,.143,.011,.123);if(/lasagna/.test(recipe.id)){for(let i=0;i<layers;i++)rounded('lasagna_sheet',i%2?base:'pasta',.20,.17,.012,.01,0,.047+i*.016,0,.12);top=.05+layers*.016}else if(/penne|macaroni|gratin/.test(recipe.id)){scatter(23,.11,.06,(x,y,z,i,a)=>{const o=cylinder('penne_pasta','pasta',x,y,z,.006,.039);o.rotation.set(.7,a,.7)});top=.091}else noodle();break;
 }
 case'soup':{
  plate({r:.17,bowl:true});lathe('deep_soup_bowl','ceramic',[[0,.01],[.09,.01],[.142,.09],[.145,.1],[.139,.102],[.127,.083],[0,.028]]);cylinder('soup_surface',base,0,.084,0,.129,.009);scatter(5+seed%5,.092,.091,(x,y,z,i)=>rounded('crouton','bread',.023,.024,.018,.004,x,y,z,i));top=.098;radius=.104;break;
 }
 case'salad':{
  plate({r:.20,bowl:true});scatter(18+seed%5,.115,.054,(x,y,z,i,a)=>{const o=sphere('salad_leaf',i%3?base:'green',x,y,z,.031,.008,.021);o.rotation.set((i%3)*.23,a,.15)});top=.074;radius=.105;break;
 }
 case'pizza':{
  plate({r:.20});cylinder('pizza_crust','bread',0,.032,0,.164,.027);cylinder('pizza_sauce',base,0,.047,0,.148,.004);ring('raised_pizza_crust','toast',.15,.013,0,.043,0);cylinder('melted_pizza_cheese','butter',0,.051,0,.14,.004);for(let i=0;i<4+seed%3;i++){const a=i*TAU/(4+seed%3);tube('pizza_slice_cut','bread',[[0,.055,0],[Math.cos(a)*.149,.055,Math.sin(a)*.149]],.0014,2)}top=.057;radius=.13;break;
 }
 case'pastry':{
  plate({r:.18});if(/muffin/.test(recipe.id)){lathe('muffin_paper','bread',[[0,.017],[.06,.017],[.073,.073],[0,.073]]);for(let i=0;i<18;i++){const a=i*TAU/18;tube('muffin_liner_fold','toast',[[Math.cos(a)*.06,.02,Math.sin(a)*.06],[Math.cos(a)*.073,.074,Math.sin(a)*.073]],.002,2)}sphere('muffin_crown',base,0,.083,0,.083,.037,.078);top=.12;radius=.054}
  else if(/scone/.test(recipe.id)){piece('scone_crumb',base,0,.021,0,.135,.13,.049);scatter(13,.054,.074,(x,y,z)=>sphere('scone_crag','crumb',x,y,z,.011,.004,.01));top=.08;radius=.047}
  else if(/cinnamon_roll/.test(recipe.id)){cylinder('cinnamon_roll_dough',base,0,.056,0,.084,.072);const pts=[];for(let i=0;i<100;i++){const a=i*.2,r=.006+i*.00072;pts.push([Math.cos(a)*r,.093,Math.sin(a)*r])}tube('cinnamon_spiral','chocolate',pts,.0037,90);top=.1;radius=.058}
  else if(/madeleine/.test(recipe.id)){sphere('madeleine_shell',base,0,.044,0,.064,.027,.097);for(let i=0;i<7;i++){const x=(i-3)*.014;tube('madeleine_shell_ridge','toast',[[x*.6,.049,-.08],[x,.068,0],[x*.6,.05,.08]],.0025,9)}top=.075;radius=.045}
  else if(/pie/.test(recipe.id)&&shape==='triangle'){triangle('pie_crust','bread',.17,.19,.026,0,.018,0,.2);triangle('pie_filling',base,.158,.178,.035,0,.044,0,.2);triangle('pie_top','toast',.165,.185,.008,0,.079,0,.2);top=.091;radius=.057}
  else if(/donut/.test(recipe.id)){ring('donut_baked_dough','bread',.069,.027,0,.049,0);ring('donut_icing',base,.069,.020,0,.067,0);top=.09;radius=.072}
  else if(/croissant/.test(recipe.id)){tube('continuous_croissant_dough',base,[[-.101,.045,.044],[-.065,.058,.019],[0,.063,0],[.065,.058,.019],[.101,.045,.044]],.021,24);for(let i=0;i<7;i++){const t=(i-3)/3,x=t*.10,y=.044+Math.cos(t*1.2)*.018,z=t*t*.044;const o=sphere('croissant_fold',i%2?base:'bread',x,y,z,.028*(1-Math.abs(t)*.35),.028*(1-Math.abs(t)*.45),.061*(1-Math.abs(t)*.5));o.rotation.y=-t*.5}top=.088;radius=.077}
  else {rounded('pastry_base','bread',.17,.15,.035,.027,0,.018,0);rounded('pastry_glaze',base,.15,.13,.009,.024,0,.052,0);for(let i=0;i<5;i++)box('pastry_lattice','toast',(i-2)*.027,.069,0,.01,.009,.142,0,.2,0);top=.075}break;
 }
 case'cake':{
  plate({r:.18});const n=layers+1;for(let i=0;i<n;i++){piece('cake_sponge',base,0,.018+i*.029,0,.17,.19,.021);piece('cake_cream_layer',i%2?accent:'cream',0,.039+i*.029,0,.171,.191,.008)}top=.019+n*.029;radius=.061;break;
 }
 case'tart':{
  plate({r:.18});cylinder('tart_shortcrust','bread',0,.036,0,.122,.037);cylinder('tart_filling',base,0,.06,0,.111,.014);ring('tart_crimped_rim','toast',.116,.011,0,.061,0);for(let i=0;i<20;i++){const a=i*TAU/20;sphere('fluted_tart_edge','bread',Math.cos(a)*.119,.05,Math.sin(a)*.119,.009,.017,.009)}top=.073;radius=.092;break;
 }
 case'pudding':{
  if(/jelly/.test(recipe.id)){plate({r:.16,bowl:true});for(let i=0;i<8;i++){const a=i*2.4+phase;box('gelatin_cube',base,Math.cos(a)*.052,.054+(i%3)*.013,Math.sin(a)*.047,.037,.035,.034,0,a,.08)}top=.105;radius=.055;break}
  plate({r:.16});lathe('pudding_custard',base,[[0,.017],[.082,.017],[.065,.114],[.06,.122],[0,.122]]);cylinder('caramel_cap',accent,0,.123,0,.059,.004);for(let i=0;i<3+seed%3;i++){const a=i*1.7+phase;tube('caramel_drizzle',accent,[[Math.cos(a)*.045,.126,Math.sin(a)*.045],[Math.cos(a)*.067,.108,Math.sin(a)*.067],[Math.cos(a)*.075,.065,Math.sin(a)*.075]],.0024,6)}top=.13;radius=.043;break;
 }
 case'parfait':{
  const c=glass({r:.067,h:.174+variation*.016,fill:.025,liquid:accent,stem:true});for(let i=0;i<layers+2;i++){const y=.032+i*.13/(layers+2),r=.049+i*.002;cylinder('parfait_layer',i%2?base:'cream',0,c.base+y,0,r,.13/(layers+2));}scoops(c.top);radius=.041;break;
 }
 case'icecream':{plate({r:.16,bowl:true});scoops(.091);radius=.064;break}
 case'waffle':{
  plate({r:.19});const n=shape==='layered'?2:1;for(let j=0;j<n;j++){rounded('waffle_base',base,.20,.18,.026,.014,0,.018+j*.032,0);for(let x=0;x<6;x++)for(let z=0;z<5;z++){box('waffle_pocket','toast',(x-2.5)*.031,.045+j*.032,(z-2)*.032,.023,.003,.024)}for(let i=0;i<7;i++)box('waffle_ridge','bread',(i-3)*.031,.049+j*.032,0,.005,.008,.17)}top=.056+(n-1)*.032;break;
 }
 default:throw Error(`Unsupported recipe food family: ${family} (${recipe.id})`);
 }
 const availableHeight=drink?.047:Math.max(.018,.31-top),s=Math.min(drink?.016:.021,availableHeight*.38);
 // Every topping name corresponds to physical ingredient pieces, never a decal.
 toppings.forEach((t,ti)=>{const a=phase+ti*2.4,rr=toppings.length>1?radius*.44:radius*.12,x=centerX+Math.cos(a)*rr,z=centerZ+Math.sin(a)*rr,y=top+.004+ti*.001;
  switch(t){
   case'berries':if(/blueberry/.test(recipe.id)){blueberries(x,y+.008,z,5+seed%3,s*.5)}else{strawberry(x,y+s,z,s);if(!/strawberry/.test(recipe.id))blueberries(x+s*1.3,y+.006,z-s,2+seed%3,s*.42)}break;
   case'citrus':{const o=cylinder('citrus_rind',/lime/.test(recipe.id)?'green':/orange|grapefruit/.test(recipe.id)?'carrot':'yellow',x,y+.005,z,s*1.2,.005);cylinder('citrus_flesh',/lime/.test(recipe.id)?'#c6d987':/grapefruit/.test(recipe.id)?'#ecb0a0':/orange/.test(recipe.id)?'#edb058':'#f4d875',x,y+.008,z,s,.002);for(let i=0;i<6;i++){const a=i*TAU/6;tube('citrus_segment','cream',[[x,y+.01,z],[x+Math.cos(a)*s*.93,y+.01,z+Math.sin(a)*s*.93]],.0008,2)}break}
   case'fruit':if(recipe.id==='fruit_tart'){
    // A fruit tart needs a visible fruit-covered surface, not one tiny center garnish.
    for(let i=0;i<8;i++){const a=i*TAU/8,xx=Math.cos(a)*.067,zz=Math.sin(a)*.067;if(i%2===0)strawberry(xx,y+.022,zz,.024);else{cylinder('kiwi_slice','#91b65c',xx,y+.009,zz,.022,.006);cylinder('kiwi_center','cream',xx,y+.013,zz,.006,.001);for(let k=0;k<6;k++){const b=k*TAU/6;sphere('kiwi_seed','coffee',xx+Math.cos(b)*.012,y+.014,zz+Math.sin(b)*.012,.0013,.0008,.001)}}}
    blueberries(0,y+.008,0,7,.011);break;
   }for(let i=0;i<3+seed%3;i++){const a=i*2.4+phase,xx=x+Math.cos(a)*s,zz=z+Math.sin(a)*s;
   if(/banana/.test(recipe.id)){cylinder('banana_slice','egg',xx,y+.008,zz,s*.57,.006);sphere('banana_center','butter',xx,y+.012,zz,s*.18,.001,s*.17)}
   else if(/kiwi/.test(recipe.id)){cylinder('kiwi_slice','#91b65c',xx,y+.008,zz,s*.68,.006);cylinder('kiwi_center','cream',xx,y+.012,zz,s*.18,.001);for(let k=0;k<6;k++){const a=k*TAU/6;sphere('kiwi_seed','coffee',xx+Math.cos(a)*s*.4,y+.013,zz+Math.sin(a)*s*.4,.0013,.0008,.001)}}
   else if(/apple|pear|peach/.test(recipe.id)){const fruit=/apple/.test(recipe.id)?'apple':/pear/.test(recipe.id)?'pear':'peach';sphere(fruit+'_skin',fruit==='apple'?'red':fruit==='pear'?'green':'pink',xx,y+.007,zz,s*.7,.005,s*.47);sphere(fruit+'_slice',fruit==='peach'?'#edbd92':'egg',xx,y+.01,zz,s*.66,.004,s*.42)}
   else if(/grape/.test(recipe.id)){sphere('grape','berry',xx,y+.012,zz,s*.5,s*.52,s*.46)}
   else if(/watermelon/.test(recipe.id)){triangle('watermelon_wedge','red',s*1.2,s*1.2,.006,xx,y+.006,zz,a);box('watermelon_rind','green',xx,y+.008,zz+s*.5,s,.006,.003,0,a,0)}
   else sphere(/mango/.test(recipe.id)?'mango_chunk':/pineapple/.test(recipe.id)?'pineapple_chunk':'cut_fruit',/mango/.test(recipe.id)?'#efb243':/pineapple/.test(recipe.id)?'yellow':i%2?accent:'yellow',xx,y+.009,zz,s*.66,s*.38,s*.51)
  }break;
   case'cream':if(recipe.category==='food'&&['rice','pasta','soup'].includes(family))sphere('cream_sauce','cream',x,y+.003,z,.04,.002,.032);else cream(x,y,z,Math.min(.026,s*1.05));break;
   case'chocolate':for(let i=0;i<3+seed%4;i++)box('chocolate_shard','chocolate',x+(i-2)*.009,y+.01+(i%2)*.006,z,.015,.004,.024,.1,i*.6,.18);break;
   case'mint':leaf('mint_leaf',x,y+.009,z,s*1.1,a);leaf('mint_leaf',x+.012,y+.012,z+.003,s*.85,a+1.2);break;
   case'nuts':for(let i=0;i<5+seed%4;i++){const a=i*2.4+phase;sphere('almond_piece','bread',x+Math.cos(a)*s,y+.006,z+Math.sin(a)*s,.006,.004,.01)}break;
   case'egg':if(/omelet/.test(recipe.id)){tube('omelet_fold','butter',[[-.11,.073,.037],[0,.061,.081],[.11,.074,.037]],.004,12);break}if(/scrambled/.test(recipe.id)){for(let i=0;i<8;i++){const a=i*2.4+phase;sphere('scrambled_egg','egg',x+Math.cos(a)*.027,y+.01,z+Math.sin(a)*.022,.01,.007,.012)}break}if(dessert){sphere('custard_dollop','egg',x,y+.009,z,.023,.012,.021);break}sphere('fried_egg_white','cream',x,y+.004,z,.043,.006,.034);sphere('egg_yolk','yellow',x,y+.013,z,.018,.01,.017);break;
   case'vegetables':if(drink){if(/carrot/.test(recipe.id)){for(let i=0;i<2;i++)box('carrot_garnish','carrot',x+i*.009,y+.018,z,.007,.034,.007,0,0,.18)}else if(/tomato/.test(recipe.id)){sphere('tomato_wedge','red',x,y+.009,z,.016,.007,.019);leaf('tomato_leaf',x,y+.017,z,.009,.4)}else{leaf('green_drink_leaf',x,y+.009,z,.02,a);if(/avocado/.test(recipe.id))sphere('avocado_slice','#c9d997',x+.013,y+.008,z,.014,.006,.025)}break}if(dessert){if(/carrot/.test(recipe.id)){for(let i=0;i<6;i++)box('sweet_carrot_shred','carrot',x+(i-3)*.005,y+.006,z,.002,.002,.025,0,i*.2,0);break}for(let i=0;i<3;i++)sphere('sweet_pumpkin_slice','#eab253',x+(i-1)*.014,y+.01,z,.008,.011,.025);break}if(/avocado/.test(recipe.id)){for(let i=0;i<4;i++){const o=sphere('avocado_wedge','#b5c77e',x+(i-1.5)*.012,y+.01,z,.009,.008,.032);o.rotation.y=.3}break}if(/mushroom/.test(recipe.id)){for(let i=0;i<4;i++){const a=i*2.4+phase,xx=x+Math.cos(a)*.023,zz=z+Math.sin(a)*.023;cylinder('mushroom_stem','cream',xx,y+.007,zz,.004,.016);sphere('mushroom_cap','#a98058',xx,y+.018,zz,.014,.006,.013)}break}if(/spinach/.test(recipe.id)){for(let i=0;i<5;i++)leaf('spinach_leaf',x+Math.cos(i*2.4)*.022,y+.004,z+Math.sin(i*2.4)*.022,.023,i);break}if(/corn/.test(recipe.id)){for(let i=0;i<12;i++){const a=i*2.4+phase;sphere('corn_kernel','yellow',x+Math.cos(a)*.031,y+.007,z+Math.sin(a)*.023,.004,.005,.004)}break}if(/potato|pumpkin|eggplant/.test(recipe.id)){for(let i=0;i<4;i++){const a=i*2.4+phase;sphere(/eggplant/.test(recipe.id)?'eggplant_slice':/pumpkin/.test(recipe.id)?'pumpkin_chunk':'potato_chunk',/eggplant/.test(recipe.id)?'#76546b':/pumpkin/.test(recipe.id)?'#e7ab4f':'potato',x+Math.cos(a)*.024,y+.012,z+Math.sin(a)*.024,.012,.009,.021)}break}for(let i=0;i<4+seed%3;i++){const a=i*2.4,xx=x+Math.cos(a)*s*1.2,zz=z+Math.sin(a)*s*1.2;if(i%3===0)sphere('broccoli_floret','darkgreen',xx,y+.016,zz,.014,.015,.013);else if(i%3===1)box('carrot_chunk','carrot',xx,y+.012,zz,.02,.017,.017,0,a,.1);else sphere('roasted_tomato','red',xx,y+.013,zz,.013,.011,.012)}break;
   case'sauce':{if(family==='pudding'){sphere('caramel_puddle',accent,0,.019,0,.099,.002,.087);break}const pts=[];for(let i=0;i<9;i++)pts.push([centerX+(i-4)*radius*.18,y+.008,centerZ+(i%2?-1:1)*(.016+variation*.01)]);tube('sauce_zigzag',accent,pts,.0035,20);break}
   case'cheese':if(dessert){cream(x,y,z,.021);break}for(let i=0;i<6+seed%4;i++){const a=i*2.4+phase;box('cheese_shaving','butter',x+Math.cos(a)*s*1.3,y+.009,z+Math.sin(a)*s*1.3,.023,.003,.009,0,a,.08)}break;
   case'sugar':for(let i=0;i<9+seed%6;i++){const a=i*2.4+phase;box('sugar_crystal','white',x+Math.cos(a)*s*1.6,y+.004,z+Math.sin(a)*s*1.6,.0025,.002,.0025)}break;
   case'beans':if(family==='coffee'){const cold=/iced|cold_brew|float/.test(recipe.id);for(let i=0;i<3;i++)sphere('coffee_bean_garnish','coffee',(cold?0:.086)+Math.cos(phase+i*2.4)*.012,cold?y+.002:.022,Math.sin(phase+i*2.4)*.016,cold?.002:.006,cold?.001:.003,cold?.002:.004)}else if(family==='tea'||/tea|earl/.test(recipe.id)||drink&&/matcha|hojicha/.test(recipe.id)){for(let i=0;i<8;i++){const a=i*2.4+phase;box('tea_leaf_flake',/matcha|green/.test(recipe.id)?'darkgreen':'chocolate',x+Math.cos(a)*s,y+.005,z+Math.sin(a)*s,.003,.001,.005,0,a,0)}}else{for(let i=0;i<6+seed%4;i++){const a=i*2.4+phase;sphere('sweet_bean',accent,x+Math.cos(a)*s,y+.007,z+Math.sin(a)*s,.008,.006,.005)}}break;
   default:throw Error(`Unknown food topping: ${t}`);
  }
 });
 return {family,baseColor:base,accentColor:accent};
}
