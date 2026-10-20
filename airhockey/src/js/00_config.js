'use strict';
/* =====================================================================
   調整用の定数（手触りを変えたいときは、まずここを触る）
   速さの単位は「台の長さ(L)/秒」。台の長さが変わっても体感が変わらない。
   ===================================================================== */
const TUNE = {
  PUCK_MAX_SPEED: 2.0,     // パックの最高速度（台長/秒）。ラリーが続くと上がる
  RESTITUTION: 0.7,        // マレットとの反発の強さ（1より小さい＝止まったマレットでは勢いが吸収される）
  WALL_RESTITUTION: 0.94,  // 壁との反発（当たったときだけ、わずかに勢いが落ちる）
  FLOOR_DRAG: 0.03,        // 台の上での減速（1秒あたりの割合。ほとんど減速せず滑り続ける）
  RALLY_POWER_GAIN: 0.04,  // ラリー1回ごとに上がる、打ち返しの強さの倍率
  RALLY_POWER_MAX: 1.7,    // 打ち返しの強さの倍率の上限
  RALLY_SPEED_GAIN: 0.08,  // ラリー1回ごとに上がる、最高速度の上限（台長/秒）
  RALLY_SPEED_MAX: 3.4,    // ラリーで上がる最高速度の、さらに上限（台長/秒）
  SECOND_PUCK_RALLY: 10,   // このラリー回数でパックが2個になる
  GAUGE_PER_HIT: 0.1,      // パックを弾くたびに溜まるゲージの量（満タン＝1）
  WIN_SCORE: 7,            // 勝利点数
  NET_SEND_HZ: 30,         // 通信の送信頻度（回/秒）
};

/* 台の寸法。割合は台の幅 W が基準 */
const GEO = {
  TABLE_LEN: 1000,         // 台の長さ（物理の単位）
  ASPECT_MIN: 0.42,        // 台の縦横比（幅÷長さ）の下限・上限。超える画面では余白を背景で埋める
  ASPECT_MAX: 0.85,
  CORNER_RATIO: 0.24,      // ゴール側の斜めの壁の大きさ（台幅の割合。2割以上）
  MALLET_R_RATIO: 0.075,   // マレットの半径（直径が台幅の15%）
  PUCK_R_RATIO: 0.05,      // パックの半径
  GOAL_RATIO: 0.40,        // ゴールの幅
  TOP_GUARD: 44,           // スマホのブラウザで開いたとき、画面の上端からこの幅（px）には台もボタンも置かない（ノッチ・時計・サイト名の表示に隠れないように）
  TOP_GUARD_FULL: 62,      // iPhone で画面の一番上まで描いている（ステータスバーの下まで広がっている）ときの幅（px）
};

/* 物理の細かい値 */
const PHYS = {
  MALLET_V_SMOOTH: 0.03,   // マレットの速さをなめらかにする時定数（秒）
  MALLET_V_MAX: 4.5,       // マレットの速さの上限（台長/秒）
  HIT_COOLDOWN: 0.10,      // 同じマレットとの接触を1回の打ち返しとみなす間隔（秒）
  HIT_MIN_SPEED: 0.08,     // これより弱い接触は打ち返しに数えない（台長/秒）
  SUBSTEP: 1 / 120,        // 1フレームをこの長さ以下に分けて進める（秒）
  STALL_TIME: 7,           // パックがほぼ止まったままこの秒数たつと、中央から出し直す
};

/* 必殺技 */
const SKILL = {
  FAST_BOOST: 1.55,        // 剛速球：最高速度の上限が何倍になるか（上限の速さで飛ぶ）
  CURVE_RATE: 2.0,         // カーブ：1秒あたりに曲がる角度（ラジアン）
  SPLIT_ANGLE: 0.2,        // 分身：3つの進む向きのずれ（ラジアン）
  SPLIT_LIFE: 5,           // 分身：消えるまでの時間（秒）
  VANISH_FROM: 0.12,       // 消える球：飛んだ距離（台長の割合）がここから薄くなり
  VANISH_FULL: 0.20,       //   ここで見えなくなり
  VANISH_BACK: 0.50,       //   ここから見えはじめ
  VANISH_END: 0.60,        //   ここで完全に見える
  WALL_TIME: 3.5,          // 防壁：出ている時間（秒）
  WALL_THICK: 0.03,        // 防壁：厚み（台幅の割合）
  HEAVY_TIME: 3.0,         // 重い腕：続く時間（秒）
  HEAVY_LAG: 0.20,         // 重い腕：指に遅れてついてくる時間（秒）
  HEAVY_V_MAX: 1.0,        // 重い腕：マレットの最高速度（台長/秒）
  ZIG_PERIOD: 0.15,        // 稲妻：折れ曲がる間隔（秒）
  ZIG_ANGLE: 0.75,         // 稲妻：1回に折れ曲がる角度（ラジアン）
  MINI_SCALE: 0.55,        // ミニ球：パックの大きさ（元の何倍か）
  GIANT_SCALE: 1.65,       // 巨大化：マレットの大きさ（元の何倍か）
  GIANT_TIME: 4.0,         // 巨大化：続く時間（秒）
  SHOCK_RANGE: 0.5,        // 衝撃波：届く距離（台長の割合）
  SHOCK_POWER: 2.4,        // 衝撃波：吹き飛ばす速さ（台長/秒。近いほど強い）
  WIDE_SCALE: 1.7,         // ゴール拡大：相手のゴールの幅（元の何倍か。斜めの壁までが上限）
  WIDE_TIME: 4.0,          // ゴール拡大：続く時間（秒）
  MIRROR_TIME: 3.5,        // 反転：相手の左右の操作が逆になる時間（秒）
  FREEZE: 0,               // 発動時に止まる時間（秒）。技はいきなり使われるのが面白いので、止めない
};

/* ステージの仕掛け（位置・大きさは台の割合。上下左右とも対称に置く） */
const STG = {
  BUMPER_KICK: 0.35,       // バンパー：当たったとき、さらに押し出す速さ（台長/秒）
  SPRING_E: 1.5,           // バネの壁：反発の強さ（1より大きいと速く跳ね返る）
  ARROW_ACCEL: 3.2,        // 矢印の床：加速の強さ（台長/秒²）
  SLOW_DRAG: 3.4,          // 減速の床：1秒あたりの減速
  SWEEP_PERIOD: 5.0,       // 往復する壁：1往復の時間（秒）
  SWEEP_LEN: 0.30,         // 往復する壁：長さ（台幅の割合）
  SHUTTER_OPEN: 2.4,       // シャッター：開いている時間（秒）
  SHUTTER_CLOSED: 1.8,     // シャッター：半分ふさがっている時間（秒）
  SHUTTER_MOVE: 0.35,      // シャッター：動く時間（秒）
  SHUTTER_WARN: 0.6,       // シャッター：閉まる前に予告が光る時間（秒）
  PULSE_PERIOD: 6.0,       // ゴールの幅：1往復の時間（秒）
  PULSE_MIN: 0.13,         // ゴールの半幅の最小・最大（台幅の割合）
  PULSE_MAX: 0.25,
  LIGHT_R: 3.2,            // 暗いステージ：マレットの明かりの半径（マレット半径の何倍か）
  DARK_ALPHA: 0.92,        // 暗いステージ：暗さ（1で真っ暗）
};

/* 試合の進行（秒） */
const FLOW = {
  COUNTDOWN: 3,            // 試合開始前のカウントダウン
  SERVE_WAIT: 1.2,         // 得点後、次のサーブまでの間
  GOAL_PAUSE: 1.7,         // 得点の演出の長さ
};

/* 演出 */
const FX = {
  PARTICLE_MAX: 600,       // 同時に出せる粒の数
  TRAIL_TIME: 0.16,        // パックの残像の長さ（秒）
  HITSTOP_POWER: 1.6,      // この強さ（台長/秒）以上の打ち返しで、ほんの一瞬止まる
  HITSTOP_MAX: 0.055,      // その止まる時間の上限（秒）
  SHAKE_HIT: 5,            // 強打の画面の揺れ（px）
  SHAKE_GOAL: 16,          // 得点の画面の揺れ（px）
  SHAKE_SKILL: 10,         // 必殺技の画面の揺れ（px）
};

/* CPU の強さ */
const AI = {
  SPEED: 2.6,              // ふだんの動く速さ（台長/秒）
  STRIKE_STRONG: 3.6,      // 強く打つときの振りの速さ（台長/秒）
  STRIKE_WEAK: 1.1,        // 弱く当てるときの振りの速さ（台長/秒）
  STRONG_RATE: 0.6,        // 強く打つ割合
  THINK: 0.06,             // 状況を読み直す間隔（秒）
  AIM_ERROR: 0.06,         // 狙いのぶれ（台幅の割合）
  SKILL_DELAY: [0.4, 2.2], // ゲージが満タンになってから技を使うまでの間（秒）
};

/* 通信 */
const NET = {
  PEER_PREFIX: 'airhockey-neo-',              // PeerJS の ID の先頭（部屋コードの前につける）
  CODE_LEN: 4,                                // 部屋コードの文字数
  CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',  // 見間違えやすい文字（I・O・0・1）は使わない
  CONNECT_TIMEOUT: 15,                        // つながるまで待つ時間（秒）
  LOST_TIMEOUT: 6,                            // この秒数なにも届かなければ切れたとみなす
  INTERP_DELAY: 0.06,                         // 相手のマレットとパックを補間するための遅れ（秒）
  ICE_SERVERS: [                              // つながりにくい環境では TURN サーバーをここに足す
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  PEER_SERVER: null,                          // 自分で PeerServer を立てるときだけ { host, port, path, secure } を書く（ふだんは PeerJS の公開サーバー）
  PEERJS_URLS: [                              // PeerJS の読み込み先（上から順に試す）
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  ],
  PROTO: 2,                                   // 通信の約束ごとの版（技を足したので 2）
};

/* 色。役割ごとに分ける */
const COLORS = {
  me: '#3ec9ff',           // 自分（下側）
  opp: '#ff5d7a',          // 相手（上側）
  ready: '#ffd23f',        // ゲージ満タン
  puck: '#f4f6ff',
  table: '#0b1634',
  line: '#2b4a94',
  wall: '#9fb6ff',
  ui: '#5b7cff',
};

/* 必殺技。attack＝発動後の次のショットにかかる／defense・disrupt＝押した瞬間に効く */
const SKILL_TYPE = {
  attack:  { label: '攻撃', color: '#ff9f43' },
  defense: { label: '守り', color: '#3ddc97' },
  disrupt: { label: '妨害', color: '#b46bff' },
};
/* 説明文は句読点を使わず、短い区切りごとに改行（\n）する */
const SKILLS = [
  { id: 'fast',     name: '剛速球',     type: 'attack',  desc: '次のショットが\n炎をまとって\n超高速で飛ぶ' },
  { id: 'curve',    name: 'カーブ',     type: 'attack',  desc: '次のショットが\n大きく曲がる' },
  { id: 'split',    name: '分身',       type: 'attack',  desc: '3つに分かれる\nどれか1つでも\n入れば1点' },
  { id: 'vanish',   name: '消える球',   type: 'attack',  desc: '次のショットが\n途中で見えなくなる' },
  { id: 'zigzag',   name: '稲妻',       type: 'attack',  desc: '次のショットが\n左右にジグザグに\n折れ曲がる' },
  { id: 'mini',     name: 'ミニ球',     type: 'attack',  desc: '次のショットの\nパックが小さくなる' },
  { id: 'wall',     name: '防壁',       type: 'defense', desc: '自分のゴール前に\n数秒だけ壁が出る' },
  { id: 'giant',    name: '巨大化',     type: 'defense', desc: '自分のマレットが\n数秒だけ大きくなる' },
  { id: 'shock',    name: '衝撃波',     type: 'defense', desc: '近くのパックを\n相手の陣地へ\n吹き飛ばす' },
  { id: 'heavy',    name: '重い腕',     type: 'disrupt', desc: '相手のマレットが\n数秒重くなる' },
  { id: 'widegoal', name: 'ゴール拡大', type: 'disrupt', desc: '相手のゴールが\n数秒だけ広くなる' },
  { id: 'mirror',   name: '反転',       type: 'disrupt', desc: '相手の左右の操作が\n数秒だけ逆になる' },
];

/* ステージ（仕掛けの中身は 13_stage.js）。仕掛けは1ステージ1〜2個、上下対称 */
const STAGE_META = [
  { id: 'pillars', name: 'ピラーズ',     desc: '中央の柱とバンパーが\nパックを弾く' },
  { id: 'sweeper', name: 'スイーパー',   desc: '中央線の上を\n壁が左右に往復する' },
  { id: 'spring',  name: 'スプリング',   desc: '壁の一部がバネ\n当たると速く跳ね返る' },
  { id: 'boost',   name: 'ブースト',     desc: '矢印の床で加速\n中央の床でゆっくりに' },
  { id: 'warp',    name: 'ワープ',       desc: '左の壁の穴に入ると\n右の壁から出てくる' },
  { id: 'shutter', name: 'シャッター',   desc: 'ゴールが一定の間隔で\n半分ふさがる' },
  { id: 'pulse',   name: 'ゴールゆらぎ', desc: 'ゴールの幅が\n広がったり\n狭まったりする' },
  { id: 'dark',    name: '暗闇',         desc: 'マレットの周りしか\n見えない\n音でパックを追う' },
];
const STAGE_COLOR = {
  pillar: '#8fa3d1', bumper: '#ff5ccf', spring: '#b6ff3d', mover: '#eef2ff',
  warp: '#9d7bff', arrow: '#ffb347', slow: '#2ec4c4', shutter: '#ffe066',
};
