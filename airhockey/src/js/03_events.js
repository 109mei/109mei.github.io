'use strict';
/* =====================================================================
   出来事の知らせ（当たった・得点した・技を使った…）
   演出・効果音・通信がそれぞれ受け取る。オンラインのゲストは、ホストから届いた出来事を同じ形で流す
   主な出来事と中身：
     mhit   [owner, power, x, y, nx, ny]   マレットで打ち返した（power は台長/秒）
     mtouch [owner, power, x, y]           マレットに軽く触れた
     hit    [kind, power, x, y, nx, ny]    壁・柱などに当たった（kind: wall/pillar/bumper/spring/sweeper/shutter/barrier）
     warp   [x1, y1, x2, y2]               ワープ穴を通った
     pop    [x, y, owner]                  分身が消えた
     goal   [scorer, x]                    得点
     skill  [owner, id]                    必殺技を発動した
     shot   [owner, id, x, y, vx, vy]      構えていた攻撃の技がショットにかかった
     second [x, y]                         2個目のパックが出た
     rally  [n]                            ラリー回数が増えた
     full   [owner]                        ゲージが満タンになった
     count  [n]                            カウントダウン（3,2,1,0=スタート）
     over   [winner]                       試合終了
   ===================================================================== */
const Events = {
  listeners: [],
  on(f) { this.listeners.push(f); },
  emit(type, ...a) { for (const f of this.listeners) f(type, a); },
};
