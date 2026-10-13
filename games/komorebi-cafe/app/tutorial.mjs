/** UI-only Day 1 guidance. Never changes the simulation or spends funds. */
export const createTutorial=()=>({version:1,step:'stock'});
const steps=['stock','prices','open','service','review','done','skipped'];
export function restoreTutorial(value){return value?.version===1&&steps.includes(value.step)?{version:1,step:value.step}:{version:1,step:'done'}}
export function tutorialStep(tutorial,business){
 const {step}=restoreTutorial(tutorial);
 if(business.day!==1||step==='done'||step==='skipped')return null;
 if(business.phase==='closed')return 'review';
 if(business.phase==='open')return 'service';
 return ['stock','prices','open'].includes(step)?step:'open';
}
export function advanceTutorial(tutorial,business,event){
 const step=tutorialStep(tutorial,business);
 if(!step)return restoreTutorial(tutorial);
 if(event==='skip')return {version:1,step:'skipped'};
 if(event==='confirm'&&['stock','prices','review'].includes(step))return {version:1,step:{stock:'prices',prices:'open',review:'done'}[step]};
 return restoreTutorial(tutorial);
}
export const TUTORIAL_CARDS={
 stock:{number:1,title:'まずは、食材を確認',tab:'stock',link:'仕入れを見に行く',body:'「仕入れ」で豆・ミルク・ケーキの在庫と仕入れ額を見てみましょう。最初は開業支援の在庫があります。追加購入は任意。必要な分だけ、自分で購入ボタンを押します。',confirm:'在庫を確認した →'},
 prices:{number:2,title:'メニューと価格を確認',tab:'menu',link:'メニューを見に行く',body:'販売中の商品、価格、材料原価を確認しましょう。初期価格のままでも開店できます。価格を変える場合は入力欄を離れると保存。粗利から人件費や家賃も支払います。',confirm:'価格を確認した →'},
 open:{number:3,title:'準備ができたら開店',tab:'service',link:'営業の操作へ',body:'「営業」の「お店を開ける」を押しましょう。開店すると時間が進みます。仕入れ・価格・勤務体制の変更は閉店中に。未保存の入力があれば先に確定してください。'},
 service:{number:4,title:'お客様の流れを見守る',tab:'service',link:'店内の動きを見る',body:'開店したばかりは近所に知られておらず、来店が0人の日もあります。注文・調理・配膳・会計・片づけは店主が進めます。上の倍速で待ち時間を短縮でき、Ⅱ / ▶ で停止・再開。来店がなくても閉店後の案内へ進みます。案内はいつでもスキップできます。'},
 review:{number:5,title:'帳簿で、1日目を振り返る',tab:'report',link:'帳簿を見に行く',body:'売上・利益・現金収支、食材切れ、待ち時間を確認しましょう。家賃や人件費は閉店時に精算します。次の日は仕入れや価格を自由に工夫できます。案内は1日目だけです。',confirm:'案内を終える'}
};
