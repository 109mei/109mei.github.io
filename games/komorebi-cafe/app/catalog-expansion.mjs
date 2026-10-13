/** Authored culinary catalogue. Pantry quantities and all financial values are fictional game units.
 * Fruit and vegetables are pooled pantry categories; milk includes butter/yogurt bases.
 * Cheese, cream, chocolate, nuts, honey, spices, gelling agents, legumes and oats have separate paid stock.
 * No external recipe/API dependency is introduced.
 */
const groups = [
 {id:'coffee_house',name:'珈琲工房',category:'drink',family:'coffee',root:'coffee',recipe:'beans1',price:460,prep:2,tags:'coffee',rows:[
  'espresso|エスプレッソ|beans1|beans|round',
  'americano|アメリカーノ||beans|tall',
  'ristretto|リストレット|beans1|beans|round',
  'lungo|ルンゴ|beans1|beans|tall',
  'cold_brew|水出しコーヒー|beans1|beans|tall',
  'iced_coffee|アイスコーヒー|syrup1|beans|tall',
  'cappuccino|カプチーノ|milk1|cream|round',
  'flat_white|フラットホワイト|milk2|cream|round',
  'macchiato|エスプレッソマキアート|milk1|cream|tall',
  'cafe_mocha|カフェモカ|milk1 cocoa1|chocolate cream|tall',
  'vienna_coffee|ウィンナーコーヒー|milk2 syrup1|cream|round',
  'coffee_float|コーヒーフロート|milk2|cream beans|tall',
  'honey_coffee|はちみつコーヒー|syrup2|sugar|round',
  'cinnamon_coffee|シナモンコーヒー|syrup1 milk1|sugar cream|round',
  'orange_coffee|オレンジコーヒー|fruit1 syrup1|citrus|tall',
 ]},
 {id:'tea_room',name:'茶葉の時間',category:'drink',family:'tea',root:'tea',recipe:'tea1',price:430,prep:2,tags:'tea light',rows:[
  'earl_grey|アールグレイ||citrus|round',
  'darjeeling|ダージリン|tea1|beans|round',
  'assam|アッサム|tea1|beans|tall',
  'ceylon|セイロンティー||beans|round',
  'jasmine_tea|ジャスミンティー|tea1|mint|round',
  'hojicha|ほうじ茶|tea1|beans|round',
  'sencha|煎茶||mint|round',
  'genmaicha|玄米茶|rice1|beans|round',
  'oolong|烏龍茶|tea1|beans|tall',
  'lemon_tea|レモンティー|fruit1|citrus|round',
  'apple_tea|アップルティー|fruit1 syrup1|fruit|tall',
  'peach_tea|ピーチティー|fruit2|fruit|tall',
  'berry_tea|ベリーティー|fruit2 syrup1|berries|round',
  'mint_tea|ミントティー|tea1 syrup1|mint|tall',
  'yuzu_tea|ゆず茶|fruit1 syrup2|citrus|round',
 ]},
 {id:'milk_tea',name:'ミルクティー研究',category:'drink',family:'tea',root:'latte',recipe:'tea1 milk1',price:540,prep:3,tags:'tea sweet',rows:[
  'royal_milk_tea|ロイヤルミルクティー|milk1|cream|round',
  'chai|スパイスチャイ|tea1 syrup1|sugar|round',
  'iced_milk_tea|アイスミルクティー|syrup1|cream|tall',
  'hojicha_latte|ほうじ茶ラテ|tea1|beans cream|round',
  'genmaicha_latte|玄米茶ラテ|rice1|beans|round',
  'jasmine_milk_tea|ジャスミンミルクティー|tea1|mint cream|tall',
  'honey_milk_tea|はちみつミルクティー|syrup2|sugar cream|round',
  'caramel_milk_tea|キャラメルミルクティー|syrup2 milk1|sauce|tall',
  'cocoa_milk_tea|ショコラミルクティー|cocoa1|chocolate|round',
  'strawberry_milk_tea|いちごミルクティー|fruit1 syrup1|berries|tall',
  'banana_milk_tea|バナナミルクティー|fruit2|fruit cream|tall',
  'peach_milk_tea|白桃ミルクティー|fruit1|fruit|tall',
  'matcha_float|抹茶フロート|tea1 milk1|cream|tall',
  'chai_float|チャイフロート|milk1 syrup1|cream sugar|tall',
  'tea_affogato|紅茶アフォガート|tea1 milk2|cream beans|round',
 ]},
 {id:'sparkling',name:'喫茶ソーダ',category:'drink',family:'soda',root:'soda',recipe:'syrup2',price:520,prep:2,tags:'fruit light',rows:[
  'lemon_soda|レモンソーダ|fruit1|citrus|tall',
  'lime_soda|ライムソーダ|fruit1 tea1|citrus mint|tall',
  'yuzu_soda|ゆずソーダ|fruit2|citrus|tall',
  'orange_soda|オレンジソーダ|fruit2 syrup1|citrus fruit|tall',
  'grapefruit_soda|グレープフルーツソーダ|fruit2 tea1|citrus|tall',
  'apple_soda|りんごソーダ|fruit1 syrup1|fruit|tall',
  'peach_soda|白桃ソーダ|fruit2 milk1|fruit|tall',
  'berry_soda|ミックスベリーソーダ|fruit2|berries|tall',
  'strawberry_soda|いちごソーダ|fruit1 milk1|berries cream|tall',
  'grape_soda|ぶどうソーダ|fruit2 syrup1|berries|tall',
  'pineapple_soda|パイナップルソーダ|fruit2|fruit citrus|tall',
  'ginger_soda|ジンジャーソーダ|vegetables1|sugar citrus|tall',
  'honey_lemon_soda|はちみつレモンソーダ|fruit1 syrup2|citrus sugar|tall',
  'tea_soda|ティーソーダ|tea1 fruit1|citrus beans|tall',
  'coffee_soda|コーヒーソーダ|beans1|beans|tall',
 ]},
 {id:'fruit_bar',name:'果実ジュース',category:'drink',family:'juice',root:'smoothie',recipe:'fruit2',price:610,prep:2,tags:'fruit light',rows:[
  'orange_juice|オレンジジュース||citrus|tall',
  'apple_juice|りんごジュース|syrup1|fruit|tall',
  'grape_juice|ぶどうジュース|fruit1|berries|tall',
  'grapefruit_juice|グレープフルーツジュース|tea1|citrus|tall',
  'pineapple_juice|パインジュース|syrup1|fruit citrus|tall',
  'peach_nectar|白桃ネクター|fruit1 syrup1|fruit|tall',
  'mango_nectar|マンゴーネクター|fruit1 milk1|fruit cream|tall',
  'pear_juice|洋梨ジュース|fruit1|fruit|tall',
  'watermelon_juice|すいかジュース||fruit mint|tall',
  'kiwi_juice|キウイジュース|syrup1|fruit mint|tall',
  'lemonade|自家製レモネード|syrup2|citrus sugar|tall',
  'yuzu_ade|ゆずエード|syrup2 tea1|citrus|tall',
  'carrot_juice|にんじんりんごジュース|vegetables1|vegetables fruit|tall',
  'tomato_juice|完熟トマトジュース|vegetables2|vegetables|tall',
  'mixed_juice|ミックスジュース|milk1 fruit1|fruit cream|tall',
 ]},
 {id:'smoothie_lab',name:'スムージー工房',category:'drink',family:'smoothie',root:'smoothie',recipe:'fruit2 milk1',price:680,prep:3,tags:'fruit sweet',rows:[
  'banana_smoothie|バナナスムージー|fruit1|fruit cream|tall',
  'strawberry_smoothie|いちごスムージー|syrup1|berries|tall',
  'mango_smoothie|マンゴースムージー|fruit1 syrup1|fruit|tall',
  'peach_smoothie|白桃スムージー|milk1|fruit cream|tall',
  'kiwi_smoothie|キウイスムージー|tea1|fruit mint|tall',
  'pineapple_smoothie|パインスムージー|syrup1|citrus fruit|tall',
  'apple_yogurt|りんごヨーグルトスムージー|milk1 syrup1|fruit cream|tall',
  'berry_yogurt|ベリーヨーグルトスムージー|milk1 fruit1|berries cream|tall',
  'green_smoothie|小松菜バナナスムージー|vegetables1|vegetables fruit|tall',
  'carrot_smoothie|にんじんオレンジスムージー|vegetables1 syrup1|vegetables citrus|tall',
  'avocado_smoothie|アボカドミルクスムージー|vegetables1 milk1|vegetables cream|tall',
  'cocoa_banana_smoothie|チョコバナナスムージー|cocoa1|chocolate fruit|tall',
  'matcha_banana_smoothie|抹茶バナナスムージー|tea2|fruit beans|tall',
  'oat_smoothie|オーツフルーツスムージー|flour1|fruit cream|tall',
  'coffee_banana_smoothie|コーヒーバナナスムージー|beans1|beans fruit|tall',
 ]},
 {id:'milk_bar',name:'ミルクとショコラ',category:'drink',family:'shake',root:'cocoa',recipe:'milk2',price:580,prep:3,tags:'sweet',rows:[
  'vanilla_shake|バニラシェイク|syrup1|cream sugar|tall',
  'chocolate_shake|チョコレートシェイク|cocoa2|chocolate cream|tall',
  'strawberry_shake|いちごシェイク|fruit1 syrup1|berries cream|tall',
  'banana_shake|バナナシェイク|fruit2|fruit cream|tall',
  'coffee_shake|コーヒーシェイク|beans1 syrup1|beans cream|tall',
  'matcha_shake|抹茶シェイク|tea2|beans cream|tall',
  'caramel_shake|キャラメルシェイク|syrup2|sauce cream|tall',
  'cookie_shake|クッキーシェイク|cake1 cocoa1|chocolate nuts|tall',
  'honey_milk|はちみつホットミルク|syrup1|sugar|round',
  'cinnamon_milk|シナモンホットミルク|syrup2|sugar cream|round',
  'hot_chocolate|濃厚ホットチョコレート|cocoa2 syrup1|chocolate|round',
  'white_cocoa|ホワイトココア|cocoa1 milk1|cream|round',
  'orange_cocoa|オレンジココア|cocoa1 fruit1|citrus chocolate|round',
  'mint_cocoa|ミントココア|cocoa1 tea1|mint chocolate|round',
  'marshmallow_cocoa|マシュマロココア|cocoa1 syrup2|sugar cream|round',
 ]},
 {id:'toast_kitchen',name:'トースト工房',category:'food',family:'toast',root:'toast',recipe:'bread1',price:590,prep:3,tags:'savory',rows:[
  'cheese_toast|チーズトースト|milk2|cheese|square',
  'pizza_toast|ピザトースト|milk1 vegetables1|cheese sauce|square',
  'egg_toast|目玉焼きトースト|eggs1 milk1|egg|square',
  'scrambled_toast|スクランブルエッグトースト|eggs2 milk1|egg cream|square',
  'avocado_toast|アボカドトースト|vegetables2|vegetables|square',
  'tomato_toast|トマトバジルトースト|vegetables1 milk1|vegetables mint|square',
  'mushroom_toast|きのこクリームトースト|vegetables2 milk1|vegetables cream|square',
  'corn_toast|コーンマヨトースト|vegetables1 eggs1|vegetables sauce|square',
  'spinach_toast|ほうれん草チーズトースト|vegetables2 milk2|vegetables cheese|square',
  'honey_toast|はちみつトースト|syrup1 milk1|sugar cream|square',
  'cinnamon_toast|シナモントースト|syrup2|sugar|square',
  'banana_toast|チョコバナナトースト|fruit1 cocoa1|fruit chocolate|square',
  'berry_toast|ベリークリームトースト|fruit1 milk2|berries cream|square',
  'apple_toast|焼きりんごトースト|fruit2 syrup1|fruit sugar|square',
  'french_toast|フレンチトースト|eggs1 milk1 syrup1|sugar cream|square',
 ]},
 {id:'sandwich_counter',name:'サンドイッチ屋台',category:'food',family:'sandwich',root:'sandwich',recipe:'bread2',price:760,prep:4,tags:'savory',rows:[
  'vegetable_sandwich|彩り野菜サンド|vegetables2|vegetables|triangle',
  'cheese_sandwich|チーズサンド|milk2 vegetables1|cheese|triangle',
  'tomato_sandwich|トマトモッツァレラサンド|vegetables2 milk2|vegetables cheese|triangle',
  'avocado_sandwich|アボカドたまごサンド|vegetables1 eggs1|vegetables egg|triangle',
  'omelet_sandwich|厚焼きたまごサンド|eggs2 milk1|egg|square',
  'cucumber_sandwich|きゅうりサンド|vegetables1 milk1|vegetables|triangle',
  'mushroom_sandwich|きのこチーズホットサンド|vegetables2 milk1|vegetables cheese|square',
  'spinach_sandwich|ほうれん草たまごホットサンド|vegetables1 eggs2|vegetables egg|square',
  'curry_sandwich|カレーポテトサンド|vegetables2 rice1|sauce vegetables|triangle',
  'corn_sandwich|コーンたまごサンド|vegetables1 eggs1 milk1|vegetables egg|triangle',
  'fruit_sandwich|フルーツサンド|fruit2 milk2|fruit cream|triangle',
  'strawberry_sandwich|いちごサンド|fruit1 milk2|berries cream|triangle',
  'banana_sandwich|チョコバナナサンド|fruit1 cocoa1 milk1|chocolate fruit|triangle',
  'apple_sandwich|りんごクリームチーズサンド|fruit2 milk1|fruit cheese|triangle',
  'caprese_panini|カプレーゼパニーニ|vegetables2 milk2 syrup1|vegetables cheese|oval',
 ]},
 {id:'pasta_table',name:'パスタ食堂',category:'food',family:'pasta',root:'pasta',recipe:'pasta1',price:980,prep:5,tags:'savory hearty',rows:[
  'napolitan|喫茶ナポリタン|vegetables2 syrup1|sauce vegetables|round',
  'arrabbiata|アラビアータ|vegetables2|sauce|round',
  'basil_pasta|バジルパスタ|vegetables1 milk1|mint cheese|round',
  'mushroom_cream_pasta|きのこクリームパスタ|vegetables2 milk2|vegetables cream|round',
  'spinach_cream_pasta|ほうれん草クリームパスタ|vegetables1 milk2|vegetables cream|round',
  'carbonara|たまごカルボナーラ|eggs2 milk1|egg cheese|round',
  'lemon_pasta|レモンクリームパスタ|fruit1 milk2|citrus cream|round',
  'cheese_pasta|濃厚チーズパスタ|milk3|cheese|round',
  'roasted_vegetable_pasta|焼き野菜パスタ|vegetables3|vegetables|round',
  'soy_mushroom_pasta|和風きのこパスタ|vegetables2 tea1|vegetables beans|round',
  'curry_pasta|カレークリームパスタ|vegetables2 milk1|sauce cream|round',
  'corn_pasta|コーンクリームパスタ|vegetables1 milk1 eggs1|vegetables cream|round',
  'cold_tomato_pasta|冷製トマトパスタ|vegetables2 fruit1|vegetables mint|round',
  'eggplant_pasta|なすのトマトパスタ|vegetables3 milk1|vegetables sauce|round',
  'pasta_gratin|焼きパスタグラタン|milk2 vegetables1 flour1|cheese sauce|oval',
 ]},
 {id:'rice_table',name:'ごはんとリゾット',category:'food',family:'rice',root:'omelet_rice',recipe:'rice1',price:940,prep:5,tags:'savory hearty',rows:[
  'egg_fried_rice|たまごチャーハン|eggs1 vegetables1|egg vegetables|round',
  'vegetable_pilaf|野菜ピラフ|vegetables2 milk1|vegetables|round',
  'mushroom_pilaf|きのこピラフ|vegetables2|vegetables beans|round',
  'corn_rice|バターコーンライス|vegetables1 milk1|vegetables cheese|round',
  'tomato_risotto|トマトリゾット|vegetables2 milk1|sauce|round',
  'cheese_risotto|チーズリゾット|milk3|cheese|round',
  'mushroom_risotto|きのこクリームリゾット|vegetables2 milk2|vegetables cream|round',
  'pumpkin_risotto|かぼちゃリゾット|vegetables2 milk1 syrup1|vegetables cream|round',
  'spinach_risotto|ほうれん草リゾット|vegetables2 milk2 eggs1|vegetables cheese|round',
  'vegetable_doria|野菜ドリア|vegetables2 milk2 flour1|cheese vegetables|oval',
  'curry_doria|カレードリア|vegetables2 milk1 flour1|sauce cheese|oval',
  'egg_doria|半熟たまごドリア|eggs2 milk1 flour1|egg cheese|oval',
  'cream_omelet_rice|クリームオムライス|eggs2 milk2 vegetables1|egg cream|oval',
  'demi_omelet_rice|デミグラスオムライス|eggs2 vegetables2|egg sauce|oval',
  'rice_croquette|ライスコロッケ|flour1 eggs1 vegetables1|sauce|round',
 ]},
 {id:'curry_house',name:'スパイス食堂',category:'food',family:'curry',root:'curry',recipe:'rice1 vegetables2',price:990,prep:5,tags:'savory hearty',rows:[
  'egg_curry|ゆでたまごカレー|eggs1|egg|round',
  'cheese_curry|チーズカレー|milk2|cheese|round',
  'mushroom_curry|きのこカレー|vegetables1|vegetables|round',
  'spinach_curry|ほうれん草カレー|vegetables1 milk1|vegetables cream|round',
  'pumpkin_curry|かぼちゃカレー|vegetables1 syrup1|vegetables|round',
  'eggplant_curry|焼きなすカレー|vegetables2|vegetables sauce|round',
  'tomato_curry|完熟トマトカレー|vegetables1 fruit1|sauce vegetables|round',
  'corn_curry|コーンバターカレー|vegetables1 milk1|vegetables cheese|round',
  'bean_curry|豆入りカレー|vegetables2 flour1|beans|round',
  'cream_curry|クリームカレー|milk2|cream sauce|round',
  'dry_curry|野菜ドライカレー|eggs1 vegetables1|egg vegetables|round',
  'baked_curry|焼きチーズカレー|milk2 eggs1|cheese egg|oval',
  'soup_curry|彩りスープカレー|vegetables2 syrup1|vegetables sauce|round',
  'fruit_curry|りんごと野菜のカレー|fruit1 syrup1|fruit vegetables|round',
  'omelet_curry|ふわとろオムカレー|eggs2 milk1|egg sauce|oval',
 ]},
 {id:'garden_bowl',name:'スープとサラダ',category:'food',family:'soup',root:'sandwich',recipe:'vegetables2',price:740,prep:4,tags:'savory light',rows:[
  'minestrone|ミネストローネ|pasta1|vegetables sauce|round',
  'corn_soup|コーンポタージュ|milk2 flour1|cream vegetables|round',
  'pumpkin_soup|かぼちゃポタージュ|milk1 flour1 syrup1|cream vegetables|round',
  'mushroom_soup|きのこクリームスープ|milk2|vegetables cream|round',
  'onion_soup|オニオングラタンスープ|bread1 milk1|cheese vegetables|round',
  'tomato_soup|トマトバジルスープ|milk1|sauce mint|round',
  'potato_soup|じゃがいもポタージュ|milk2 flour1|cream|round',
  'spinach_soup|ほうれん草ポタージュ|milk1 flour1|vegetables cream|round',
  'egg_soup|たまご野菜スープ|eggs1|egg vegetables|round',
  'garden_salad|ガーデンサラダ|vegetables1|vegetables|round|salad',
  'egg_salad|たまごサラダ|eggs2|egg vegetables|round|salad',
  'cheese_salad|チーズクルトンサラダ|milk1 bread1|cheese|round|salad',
  'fruit_salad|フルーツサラダ|fruit2|fruit vegetables|round|salad',
  'pasta_salad|冷製パスタサラダ|pasta1 eggs1|vegetables egg|round|salad',
  'warm_salad|温野菜のサラダ|vegetables2 milk1|vegetables cream|round|salad',
 ]},
 {id:'oven_kitchen',name:'オーブンのごちそう',category:'food',family:'pizza',root:'toast',recipe:'flour1 milk1',price:890,prep:5,tags:'savory hearty',rows:[
  'margherita|マルゲリータ|vegetables2 milk1|cheese mint|round',
  'four_cheese_pizza|クアトロチーズピザ|milk3|cheese|round',
  'mushroom_pizza|きのこピザ|vegetables2|vegetables cheese|round',
  'corn_pizza|コーンマヨピザ|vegetables1 eggs1|vegetables cheese|round',
  'spinach_pizza|ほうれん草たまごピザ|vegetables1 eggs1 milk1|egg vegetables|round',
  'vegetable_pizza|グリル野菜ピザ|vegetables3|vegetables|round',
  'curry_pizza|カレーピザ|vegetables2 rice1|sauce cheese|round',
  'potato_gratin|ポテトグラタン|vegetables2 milk2|cheese|oval|rice',
  'vegetable_quiche|野菜のキッシュ|eggs2 vegetables1|egg vegetables|triangle|tart',
  'mushroom_quiche|きのこのキッシュ|eggs2 vegetables2|egg cheese|triangle|tart',
  'spinach_quiche|ほうれん草のキッシュ|eggs2 vegetables1 milk1|vegetables egg|triangle|tart',
  'savory_pancakes|チーズパンケーキ|eggs1 milk2|cheese|round|pancakes',
  'egg_pancakes|たまごとサラダのパンケーキ|eggs2 vegetables1|egg vegetables|round|pancakes',
  'vegetable_galette|野菜ガレット|eggs1 vegetables2|egg vegetables|square|pancakes',
  'cheese_galette|チーズたまごガレット|eggs2 milk2|egg cheese|square|pancakes',
 ]},
 {id:'cake_studio',name:'ケーキ工房',category:'dessert',family:'cake',root:'cake',recipe:'cake1',price:590,prep:2,tags:'sweet',rows:[
  'strawberry_shortcake|いちごショートケーキ|fruit1 milk1|berries cream|triangle',
  'chocolate_cake|チョコレートケーキ|cocoa2|chocolate|triangle',
  'chocolate_gateaux|ガトーショコラ|cocoa2 eggs1|chocolate sugar|round',
  'baked_cheesecake|ベイクドチーズケーキ|milk2 eggs1|cheese|triangle',
  'rare_cheesecake|レアチーズケーキ|milk2 fruit1|cream fruit|round',
  'basque_cheesecake|バスクチーズケーキ|milk3 eggs1|sauce cheese|round',
  'chiffon_cake|シフォンケーキ|eggs2 milk1|cream|triangle',
  'tea_chiffon|紅茶シフォン|tea1 eggs1|beans cream|triangle',
  'matcha_cake|抹茶ケーキ|tea2 milk1|beans cream|triangle',
  'carrot_cake|キャロットケーキ|vegetables1 milk1|nuts cream|square',
  'banana_cake|バナナケーキ|fruit1 eggs1|fruit|square',
  'lemon_cake|レモンケーキ|fruit1 syrup1|citrus sugar|oval',
  'apple_cake|りんごのアップサイドダウンケーキ|fruit2 syrup1|fruit sauce|round',
  'coffee_cake|コーヒーケーキ|beans1 milk1|beans cream|square',
  'roll_cake|フルーツロールケーキ|fruit1 milk2|fruit cream|round',
 ]},
 {id:'tart_studio',name:'タルトとパイ',category:'dessert',family:'tart',root:'cake',recipe:'flour1 eggs1 milk1',price:660,prep:4,tags:'sweet',rows:[
  'fruit_tart|フルーツタルト|fruit2|fruit|round',
  'strawberry_tart|いちごタルト|fruit1 syrup1|berries|round',
  'blueberry_tart|ブルーベリータルト|fruit2 syrup1|berries cream|round',
  'lemon_tart|レモンタルト|fruit1 eggs1|citrus|round',
  'orange_tart|オレンジタルト|fruit2|citrus fruit|round',
  'apple_tart|焼きりんごタルト|fruit2 syrup2|fruit sauce|round',
  'pear_tart|洋梨タルト|fruit1 milk1|fruit|triangle',
  'banana_tart|チョコバナナタルト|fruit1 cocoa1|fruit chocolate|round',
  'chocolate_tart|生チョコタルト|cocoa2 milk1|chocolate|triangle',
  'cheese_tart|焼きチーズタルト|milk2|cheese|round',
  'custard_tart|エッグタルト|eggs2 syrup1|egg sugar|round',
  'pumpkin_tart|かぼちゃタルト|vegetables1 syrup1|vegetables cream|triangle',
  'apple_pie|アップルパイ|fruit2 syrup1 flour1|fruit sugar|square|pastry',
  'chocolate_pie|チョコレートパイ|cocoa2 flour1|chocolate|triangle|pastry',
  'lemon_meringue_pie|レモンメレンゲパイ|fruit1 eggs2|citrus cream|triangle|pastry',
 ]},
 {id:'pudding_studio',name:'プリンと冷菓',category:'dessert',family:'pudding',root:'cake',recipe:'eggs1 milk1',price:530,prep:3,tags:'sweet',rows:[
  'custard_pudding|カスタードプリン|syrup1|sauce|round',
  'firm_pudding|喫茶店の固めプリン|eggs1 syrup1|sauce cream|round',
  'cream_pudding|なめらかミルクプリン|milk2|cream|round',
  'chocolate_pudding|チョコプリン|cocoa1 syrup1|chocolate|round',
  'matcha_pudding|抹茶プリン|tea2|beans cream|round',
  'tea_pudding|紅茶プリン|tea1 syrup1|beans|round',
  'coffee_pudding|コーヒープリン|beans1|beans cream|round',
  'pumpkin_pudding|かぼちゃプリン|vegetables1 syrup1|vegetables sauce|round',
  'banana_pudding|バナナプリン|fruit1|fruit cream|round',
  'strawberry_pudding|いちごプリン|fruit1 syrup1|berries|round',
  'panna_cotta|パンナコッタ|milk2 syrup1|cream sauce|round',
  'berry_panna_cotta|ベリーパンナコッタ|milk2 fruit1|berries cream|round',
  'coffee_jelly|コーヒーゼリー|beans2 syrup1|beans cream|square',
  'tea_jelly|紅茶ゼリー|tea2 fruit1|citrus|square',
  'fruit_jelly|フルーツゼリー|fruit2 syrup1|fruit|tall',
 ]},
 {id:'parlor',name:'パフェとアイス',category:'dessert',family:'parfait',root:'parfait',recipe:'milk2',price:720,prep:3,tags:'sweet',rows:[
  'strawberry_parfait|いちごパフェ|fruit2 cake1|berries cream|tall',
  'chocolate_parfait|チョコレートパフェ|cocoa2 cake1|chocolate cream|tall',
  'banana_parfait|チョコバナナパフェ|fruit1 cocoa1 cake1|fruit chocolate|tall',
  'matcha_parfait|抹茶パフェ|tea2 cake1|beans cream|tall',
  'coffee_parfait|コーヒーパフェ|beans1 cake1|beans chocolate|tall',
  'peach_parfait|白桃パフェ|fruit2 syrup1|fruit cream|tall',
  'mango_parfait|マンゴーパフェ|fruit2 cake1 syrup1|fruit|tall',
  'yogurt_parfait|ヨーグルトベリーパフェ|milk1 fruit2|berries cream|tall',
  'pudding_parfait|プリンアラモードパフェ|eggs2 fruit1 cake1|fruit sauce|tall',
  'vanilla_icecream|バニラアイス|syrup1|cream|round|icecream',
  'chocolate_icecream|チョコアイス|cocoa2|chocolate|round|icecream',
  'strawberry_icecream|いちごアイス|fruit1 syrup1|berries|round|icecream',
  'matcha_icecream|抹茶アイス|tea2|beans|round|icecream',
  'lemon_sorbet|レモンシャーベット|fruit2 syrup1|citrus|round|icecream',
  'coffee_affogato|エスプレッソアフォガート|beans2|beans cream|round|icecream',
 ]},
 {id:'bake_shop',name:'焼き菓子とワッフル',category:'dessert',family:'pastry',root:'pancakes',recipe:'flour1 eggs1 milk1',price:600,prep:4,tags:'sweet',rows:[
  'plain_scone|プレーンスコーン|flour1|sugar|round',
  'chocolate_scone|チョコチップスコーン|cocoa1 flour1|chocolate|triangle',
  'tea_scone|紅茶スコーン|tea1 flour1|beans|triangle',
  'berry_muffin|ベリーマフィン|fruit1 syrup1|berries|round',
  'banana_muffin|バナナマフィン|fruit1|fruit|round',
  'chocolate_muffin|チョコマフィン|cocoa2|chocolate|round',
  'madeleine|マドレーヌ|syrup1|sugar|oval',
  'financier|フィナンシェ|milk1 flour1|nuts|square',
  'cinnamon_roll|シナモンロール|syrup2 bread1|sugar sauce|round',
  'croissant|バタークロワッサン|milk2 flour1|sugar|oval',
  'plain_waffle|バターワッフル|milk1 syrup1|sugar cream|square|waffle',
  'berry_waffle|ベリーワッフル|fruit2|berries cream|square|waffle',
  'chocolate_waffle|チョコバナナワッフル|fruit1 cocoa1|fruit chocolate|square|waffle',
  'apple_waffle|焼きりんごワッフル|fruit2 syrup1|fruit sauce|square|waffle',
  'matcha_waffle|抹茶クリームワッフル|tea2 milk1|beans cream|square|waffle',
 ]},
];
const freeze=Object.freeze;
const quantities=text=>Object.fromEntries(text.split(' ').filter(Boolean).map(token=>[token.replace(/\d+$/,''),Number(token.match(/\d+$/)[0])]));
const merge=(a,b)=>{const result={...a};for(const [key,n]of Object.entries(b))result[key]=(result[key]??0)+n;return result};
const colors={coffee:'#583024',tea:'#a66c31',soda:'#85c9b7',smoothie:'#dca3b8',juice:'#e9a338',shake:'#e7d1ab',toast:'#c78e4a',sandwich:'#d6b276',pancakes:'#c18a47',rice:'#eee2bd',curry:'#98582b',pasta:'#e6bc64',soup:'#d59a4b',salad:'#77a153',pizza:'#c99756',pastry:'#c49559',cake:'#e5ca95',tart:'#c49a62',pudding:'#e9ce7b',parfait:'#eccfce',icecream:'#f2ddbb',waffle:'#bd8543',cocoa:'#633a2c'};
const accents={berries:'#b63d69',citrus:'#efa938',fruit:'#e8ab54',cream:'#fff2d5',chocolate:'#61352e',mint:'#4b975b',nuts:'#996734',egg:'#edbc47',vegetables:'#65a353',sauce:'#bc5137',cheese:'#ead076',sugar:'#f6efdf',beans:'#765139'};
export const MENU_COLLECTIONS=freeze(groups.map(({id,name,category,root})=>freeze({id,name,category,root})));
// Explicit ingredient families avoid silently charging milk for cheese or syrup for honey.
const creamRecipes=new Set('cappuccino flat_white macchiato vienna_coffee coffee_float matcha_float chai_float tea_affogato strawberry_shortcake rare_cheesecake chiffon_cake tea_chiffon matcha_cake carrot_cake coffee_cake roll_cake fruit_tart strawberry_tart blueberry_tart strawberry_pudding panna_cotta berry_panna_cotta fruit_sandwich strawberry_sandwich banana_sandwich'.split(' '));
const cheeseRecipes=new Set('tomato_sandwich caprese_panini carbonara margherita potato_gratin vegetable_quiche mushroom_quiche spinach_quiche vegetable_doria curry_doria egg_doria pasta_gratin onion_soup'.split(' '));
const spiceRecipes=new Set('chai chai_float ginger_soda cinnamon_coffee cinnamon_milk cinnamon_toast cinnamon_roll carrot_cake'.split(' '));
function culinaryRecipe(id,name,family,raw){
 const recipe={...raw};const replace=(source,target,amount=1)=>{if(recipe[source]){recipe[source]=Math.max(0,recipe[source]-amount);if(!recipe[source])delete recipe[source]}recipe[target]=(recipe[target]??0)+amount};
 if(name.includes('チーズ')||name.includes('モッツァレラ')||cheeseRecipes.has(id)){const amount=id==='four_cheese_pizza'?3:name.includes('濃厚')?2:1;replace('milk','cheese',amount)}
 if(name.includes('クリーム')||name.includes('パフェ')||creamRecipes.has(id))replace('milk','cream',1);
 if(name.includes('チョコ')||name.includes('ショコラ'))replace('cocoa','chocolate',Math.max(1,recipe.cocoa??0));
 if(id.startsWith('honey_'))replace('syrup','honey',1);
 if(family==='curry'||name.includes('カレー')||spiceRecipes.has(id))recipe.spices=1;
 if(['carrot_cake','financier','cookie_shake'].includes(id))recipe.nuts=1;
 if(id==='bean_curry'){replace('vegetables','legumes',2);delete recipe.flour}
 if(id==='oat_smoothie'){replace('flour','oats',1)}
 if(id.endsWith('_jelly')){delete recipe.eggs;recipe.gelatin=1;if(id!=='coffee_jelly')delete recipe.milk}
 if(id.includes('panna_cotta')){delete recipe.eggs;recipe.gelatin=1;recipe.cream=1}
 if(id==='lemon_sorbet'){delete recipe.milk;delete recipe.cream}
 return freeze(recipe);
}
export function buildExpandedCatalog(stock){
 const items={},projects={};
 for(const group of groups){
  const base=quantities(group.recipe);
  group.rows.forEach((row,index)=>{
   const [id,name,extra,toppingText,shape,overrideFamily]=row.split('|'),toppings=freeze(toppingText.split(' ')),family=overrideFamily??group.family;
   const recipe=culinaryRecipe(id,name,family,merge(base,quantities(extra))); 
   const ingredientCost=Object.entries(recipe).reduce((n,[key,q])=>n+stock[key].unitCost*q,0);
   const complexity=Object.values(recipe).reduce((n,q)=>n+q,0),tier=Math.floor(index/5);
   const basePrice=Math.ceil(Math.max(group.price+ingredientCost*.65+tier*30,ingredientCost*2.15)/10)*10;
   const tags=new Set(group.tags.split(' '));if(recipe.fruit)tags.add('fruit');if(recipe.cocoa||recipe.chocolate)tags.add('chocolate');if(recipe.tea)tags.add('tea');if(recipe.beans)tags.add('coffee');
   if(group.category==='food'&&recipe.fruit&&!recipe.vegetables){tags.delete('savory');tags.add('sweet')}
   const flavorTags=freeze([...tags]);
   const ingredientColor=name.includes('抹茶')?'#77934d':name.includes('チョコ')||name.includes('ショコラ')||name.includes('ココア')?'#724337':name.includes('いちご')||name.includes('ベリー')?'#d787a5':name.includes('マンゴー')||name.includes('かぼちゃ')?'#e3af4e':name.includes('ほうれん草')||name.includes('小松菜')?'#6d9b59':null;
   const visual=freeze({variant:Object.keys(items).length,family,baseColor:ingredientColor??colors[family],accentColor:accents[toppings[0]],toppings,layers:1+Math.min(3,Math.floor(complexity/2)),shape,components:freeze(Object.keys(recipe))});
   const serving=['coffee','tea','cocoa'].includes(family)?(shape==='tall'?'glass':'mug'):['soda','smoothie','juice','shake'].includes(family)?(shape==='round'?'mug':'glass'):family==='parfait'?'dessert_glass':['soup','salad','curry','icecream'].includes(family)?'bowl':'plate';
   items[id]=freeze({id,name,category:group.category,serving,modelId:id,basePrice,minPrice:Math.max(200,Math.ceil(ingredientCost/50)*50),maxPrice:2500,recipe,prepMinutes:group.prep+Math.min(2,Math.floor(complexity/4)),collection:group.id,collectionName:group.name,flavorTags,tags:flavorTags,visualFamily:family,visual});
   // Three branches of five recipes per collection; never require every earlier dish.
   const predecessor=index%5===0?group.root:group.rows[index-1].split('|')[0];
   const cost=1600+tier*1600+(index%5)*650+Math.ceil(ingredientCost/10)*20;
   projects[id]=freeze({id,name,cost,durationMinutes:60+tier*30+(index%5)*15,collection:group.id,requirements:freeze({recipes:freeze([predecessor]),served:20+tier*70+(index%5)*15,indoor:tier})});
  });
 }
 if(Object.keys(items).length!==285)throw Error('Expanded menu must contain exactly 285 authored dishes');
 return {items:freeze(items),projects:freeze(projects)};
}
