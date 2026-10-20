// 試合の決まりと必殺技のテスト：node tools/test_rules.js
require('./common').run(() => {
  const out = [], ok = (name, pass, info) => out.push((pass ? '〇 ' : '× ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  const cpuUpdate = CPU.update;
  const ev = []; Events.on((t, a) => ev.push([t, ...a]));
  const start = (skills = ['fast', 'fast'], stage = 'pillars') => {
    Match.start({ mode: 'cpu', skills, stage, server: 0 });
    Match.state = 'play'; CPU.update = () => {};                 // CPU は止めて、手で動かす
    Physics.mallets.forEach(m => m.active = true);               // 指を置いている状態にする
    Stage.shapes = [];
    ev.length = 0;
  };
  const { W, L } = (start(), Table), pr = Table.pr, mr = Table.mr;
  const place = (owner, x, y) => { const m = Physics.mallets[owner]; m.active = true; m.x = m.px = m.tx = x; m.y = m.py = m.ty = y; m.vx = m.vy = m.ivx = m.ivy = 0; };
  /* owner のマレットで、パックを相手側へ打つ（マレットを速く振って当てる） */
  const shoot = (owner, speed = 1.5, aimX) => {
    const pk = Physics.pucks.find(p => !p.ghost);
    const dir = owner === 0 ? -1 : 1;
    pk.x = W / 2; pk.y = owner === 0 ? L * 0.62 : L * 0.38; pk.vx = 0; pk.vy = 0; pk.cool = [0, 0];
    place(owner, W / 2 + (aimX || 0), pk.y - dir * (pr + mr + 30));
    place(1 - owner, mr * 1.2, owner === 0 ? L * 0.1 : L * 0.9);
    const m = Physics.mallets[owner];
    for (let f = 0; f < 12; f++) { m.ty += dir * speed * L / 60; Match.update(1 / 60); }
  };

  // ラリー：交互に打ち返したときだけ数える
  start();
  shoot(0); const r1 = Match.rally;
  shoot(0); const r2 = Match.rally;
  shoot(1); const r3 = Match.rally;
  ok('ラリー：同じ人が続けて打っても増えない。交互なら増える', r1 === 1 && r2 === 1 && r3 === 2, [r1, r2, r3]);
  const g1 = Match.gauge.slice();
  ok('ゲージ：打つたびに一定量たまる', Math.abs(g1[0] - 0.2) < 1e-9 && Math.abs(g1[1] - 0.1) < 1e-9, g1);

  // 2個目のパック
  start();
  for (let i = 0; i < TUNE.SECOND_PUCK_RALLY; i++) shoot(i % 2);
  ok('ラリー ' + TUNE.SECOND_PUCK_RALLY + ' 回でパックが2個になる', Match.second && Physics.pucks.filter(p => !p.ghost).length === 2, { rally: Match.rally, pucks: Physics.pucks.length });
  // どちらかが入ると1点、パックは1個に戻る
  const p2 = Physics.pucks[1]; p2.x = W / 2; p2.y = 5; p2.vx = 0; p2.vy = -1 * L;
  for (let f = 0; f < 30 && Match.state === 'play'; f++) Match.update(1 / 60);
  const sc = Match.score.slice();
  for (let f = 0; f < 200 && Match.state !== 'countdown'; f++) Match.update(1 / 60);
  ok('どちらのパックが入っても1点。次は1個に戻り、ラリーは0に', sc[0] === 1 && Physics.pucks.length === 1 && Match.rally === 0 && !Match.second, { sc, pucks: Physics.pucks.length, rally: Match.rally });
  ok('失点した側からサーブ', Match.server === 1 && Physics.pucks[0].y < L / 2, { server: Match.server, y: Physics.pucks[0].y });

  // 7点先取で結果画面
  start();
  for (let i = 0; i < 7; i++) {
    for (let f = 0; f < 400 && Match.state !== 'play'; f++) Match.update(1 / 60);
    const pk = Physics.pucks[0]; pk.x = W / 2; pk.y = L - 5; pk.vy = 1 * L; pk.vx = 0;
    for (let f = 0; f < 30 && Match.state === 'play'; f++) Match.update(1 / 60);
  }
  for (let f = 0; f < 200 && Match.active; f++) Match.update(1 / 60);
  ok('7点先取で試合が終わり、結果画面へ', !Match.active && UI.screen === 'result' && Match.score[1] === 7 && $('#result-title').textContent === '負け…', { score: Match.score, screen: UI.screen });

  // 必殺技：満タンでないと出ない／満タンなら出る
  start(['fast', 'wall']);
  ok('ゲージが満タンでないと発動しない', Match.pressSkill(0) === false);
  Match.gauge[0] = 1;
  ok('満タンなら発動し、ゲージは空になる', Match.pressSkill(0) === true && Match.gauge[0] === 0 && Skills.state.armed[0] === 'fast');
  for (let f = 0; f < 20; f++) Match.update(1 / 60);
  shoot(0, 0.8);
  const pk = Physics.pucks[0], spF = Math.hypot(pk.vx, pk.vy) / L;
  ok('剛速球：次のショットが上限の1.55倍の速さで飛ぶ', Math.abs(spF - 2.08 * SKILL.FAST_BOOST) < 0.05 && !Skills.state.armed[0], +spF.toFixed(2));
  shoot(1, 0.8);
  ok('打ち返されると剛速球の効果は消える', pk.boost === 1);

  // カーブ
  start(['curve', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0); for (let f = 0; f < 20; f++) Match.update(1 / 60);
  shoot(0, 1.0);
  const c0 = Math.atan2(Physics.pucks[0].vy, Physics.pucks[0].vx);
  for (let f = 0; f < 10; f++) Match.update(1 / 60);
  const c1 = Math.atan2(Physics.pucks[0].vy, Physics.pucks[0].vx);
  ok('カーブ：飛びながら向きが変わる', Math.abs(c1 - c0) > 0.2, +(c1 - c0).toFixed(2));

  // 分身
  start(['split', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0); for (let f = 0; f < 20; f++) Match.update(1 / 60);
  shoot(0, 1.0);
  const n3 = Physics.pucks.length, ghosts = Physics.pucks.filter(p => p.ghost).length;
  ok('分身：3つに分かれ、本物は1つ', n3 === 3 && ghosts === 2, { n3, ghosts });
  for (let f = 0; f < 12; f++) Match.update(1 / 60);
  ok('分身：打った人のマレットには当たらず、すり抜ける', Physics.pucks.length === 3);
  const gh = Physics.pucks.find(p => p.ghost); place(1, gh.x, gh.y - mr - pr - 2); gh.vy = -1 * L;
  for (let f = 0; f < 6; f++) Match.update(1 / 60);
  ok('分身：相手のマレットに触れると消える', Physics.pucks.filter(p => p.ghost).length === 1 && ev.some(e => e[0] === 'pop'));
  const g0 = Physics.pucks.find(p => p.ghost); g0.x = W / 2; g0.y = pr * 2; g0.vx = 0; g0.vy = -1.2 * L;
  for (let f = 0; f < 10 && Match.state === 'play'; f++) Match.update(1 / 60);
  ok('分身：どれか1つでも相手のゴールに入れば1点（そのポイントは終わり）', Match.score[0] === 1 && Match.state === 'goal' && Physics.pucks.length === 0, { sc: Match.score, st: Match.state });
  start(['split', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0); for (let f = 0; f < 20; f++) Match.update(1 / 60);
  shoot(0, 1.0);
  const gOwn = Physics.pucks.find(p => p.ghost); gOwn.x = W / 2; gOwn.y = L - pr * 2; gOwn.vx = 0; gOwn.vy = 1.2 * L;
  for (let f = 0; f < 10; f++) Match.update(1 / 60);
  ok('分身：打った人の自分のゴールに入った分身は、点にならず消える', Match.score[1] === 0 && Match.state === 'play' && !Physics.pucks.includes(gOwn), { sc: Match.score, st: Match.state });

  // 消える球
  start(['vanish', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0); for (let f = 0; f < 20; f++) Match.update(1 / 60);
  shoot(0, 0.7);
  const vis = [];
  for (let f = 0; f < 60; f++) { Match.update(1 / 60); if (!Physics.pucks[0] || Match.state !== 'play') break; vis.push(+Physics.pucks[0].vis.toFixed(2)); }
  ok('消える球：途中で見えなくなり、また見える', Math.min(...vis) === 0 && vis[0] > 0.5 && vis[vis.length - 1] > 0.9, vis.filter((v, i) => i % 4 === 0));

  // 防壁
  start(['wall', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0);
  ok('防壁：押した瞬間に自分のゴール前に壁が出る', Skills.shapes().length === 1 && Skills.shapes()[0].ay === L);
  for (let f = 0; f < 15; f++) Match.update(1 / 60);
  const bp = Physics.pucks[0]; bp.x = W / 2; bp.y = L * 0.8; bp.vx = 0; bp.vy = 1.5 * L; place(0, mr * 1.2, L * 0.6);
  let minVy = 0; for (let f = 0; f < 40; f++) { Match.update(1 / 60); minVy = Math.min(minVy, bp.vy); }
  ok('防壁：シュートを跳ね返す', Match.score[1] === 0 && minVy < -1.2 * L, { score: Match.score, minVy: +(minVy / L).toFixed(2) });
  for (let f = 0; f < 60 * 4; f++) Match.update(1 / 60);
  ok('防壁：数秒で消える', Skills.shapes().length === 0);

  // 重い腕
  start(['heavy', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0);
  for (let f = 0; f < 12; f++) Match.update(1 / 60);
  const hm = Physics.mallets[1]; place(1, W / 2, L * 0.2); hm.tx = W * 0.9;
  let maxv = 0; for (let f = 0; f < 30; f++) { Match.update(1 / 60); maxv = Math.max(maxv, Math.hypot(hm.ivx, hm.ivy) / L); }
  ok('重い腕：相手のマレットが遅れて、速く動けない', hm.heavy && maxv <= SKILL.HEAVY_V_MAX + 1e-6, +maxv.toFixed(2));
  ok('重い腕：自分のマレットはふつう', !Physics.mallets[0].heavy);
  for (let f = 0; f < 60 * 3.2; f++) Match.update(1 / 60);
  ok('重い腕：数秒で元に戻る', !hm.heavy);

  // 発動の瞬間の演出はない（止まらない・揺れない・光らない）
  start(['heavy', 'fast']); Fx.reset(); Match.gauge[0] = 1; Match.pressSkill(0); Fx.update(1 / 60);
  ok('発動の瞬間は止まらず、画面も揺れず光らない', Skills.freeze === 0 && Match.hitStop === 0 && Fx.shakeAmp === 0 && !Fx.flash);

  // 稲妻：一定の間隔で左右に折れ曲がる
  start(['zigzag', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0);
  shoot(0, 0.8);
  const zp = Physics.pucks[0], heads = [];
  for (let f = 0; f < 30; f++) { Match.update(1 / 60); if (!Physics.pucks[0] || Match.state !== 'play') break; heads.push(Math.atan2(zp.vy, zp.vx)); }
  let turns = 0; for (let i = 1; i < heads.length; i++) { let d = heads[i] - heads[i - 1]; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > 0.3) turns++; }
  ok('稲妻：飛びながら何度も折れ曲がる', turns >= 3, { turns, frames: heads.length });

  // 稲妻：横の壁で跳ね返っても、打った向き（相手のゴールのほう）へ進み続ける。自分のゴールへ戻ってこない
  const zigRes = [];
  for (const ang of [0.35, 0.6, 0.9]) for (const zd of [1, -1]) {
    start(['zigzag', 'fast']); Physics.mallets.forEach(m => m.active = false);
    const q = Physics.pucks[0]; q.x = W / 2; q.y = L * 0.9;
    q.vx = Math.sin(ang) * L; q.vy = -Math.cos(ang) * L;
    Skills.applyShot('zigzag', q, Physics.mallets[0]); q.zig.dir = zd;
    let res = 'none';                                              // 相手の側の端（上の1割）まで届くか、その前に自分の側の端へ戻ってしまうか
    for (let f = 0; f < 300; f++) {
      const sc = Physics.step(1 / 60), z = Physics.pucks[0];
      if (sc === 0 || (z && z.y < L * 0.1)) { res = 'top'; break; }
      if (sc === 1 || !z || z.y > L * 0.95) { res = 'back'; break; }
    }
    zigRes.push(res);
  }
  ok('稲妻：横の壁で跳ね返っても、打った向きへ進み続ける（相手の側の端まで届く）', zigRes.every(r => r === 'top'), zigRes);

  // 構え中：相手が攻撃の技を構えている間、相手のゲージは満タンのまま見える。自分のゲージは本当の量
  start(['fast', 'curve']); Match.gauge[1] = 1; Match.pressSkill(1);
  const hid = Match.shownGauge(1);
  Match.gauge[0] = 1; Match.pressSkill(0);
  ok('構え中：相手が構えた攻撃の技は、ゲージが満タンのままで気づかれない（自分の分は空になる）', Skills.state.armed[1] === 'curve' && hid === 1 && Match.gauge[1] === 0 && Match.shownGauge(0) === 0);
  shoot(1, 0.8);
  ok('構え中：打った瞬間に、相手のゲージがはじめて減る', Match.shownGauge(1) < 1 && !Skills.state.armed[1], Match.shownGauge(1));

  // 衝撃波：マレットが消えている（指を離している）ときは出ない。ゲージも減らない
  start(['shock', 'fast']); Physics.mallets[0].active = false;
  const sk1 = Physics.pucks[0]; sk1.x = W / 2; sk1.y = L * 0.7; sk1.vx = 0; sk1.vy = 0;
  Match.gauge[0] = 1; const shOk = Match.pressSkill(0);
  ok('衝撃波：マレットが消えているときは押しても出ず、ゲージも残る', !shOk && Match.gauge[0] === 1 && sk1.vy === 0);

  // 止まったパックを中央から出し直すとき、ショットの効果（ミニ球・稲妻など）は消える
  start(['mini', 'fast']); Physics.mallets.forEach(m => m.active = false);
  const st1 = Physics.pucks[0]; st1.x = W * 0.3; st1.y = L * 0.6; st1.vx = st1.vy = 0;
  Skills.applyShot('mini', st1, Physics.mallets[0]); st1.zig = { t: 1, dir: 1, first: false }; st1.vx = st1.vy = 0;
  for (let f = 0; f < 60 * (PHYS.STALL_TIME + 0.5) && Match.state === 'play'; f++) { st1.vx = st1.vy = 0; Match.update(1 / 60); if (Math.abs(st1.y - L / 2) < 1) break; }
  ok('止まったパックの出し直しで、ミニ球・稲妻の効果が消える', st1.r === Table.pr && !st1.zig && !st1.skill, { r: +(st1.r / Table.pr).toFixed(2), y: +st1.y.toFixed(1) });

  // 中央から出すパック（2個目・出し直し）は、柱や往復する壁に重ならない場所に出る
  const spawnBad = [];
  for (const sid of STAGE_META.map(m => m.id)) for (let k = 0; k < 6; k++) {
    Match.start({ mode: 'cpu', skills: ['fast', 'fast'], stage: sid, server: 0 }); Match.state = 'play'; CPU.update = () => {};
    Stage.t = k * 0.83; Stage.update(0);
    Physics.pucks[0].x = W * 0.2; Physics.pucks[0].y = L * 0.8;
    Match.spawnSecond();
    const sp = Physics.pucks[1];
    for (const o of Stage.shapes) if (!o.off && segDist(sp.x, sp.y, o.ax, o.ay, o.bx, o.by).d < sp.r + o.r) spawnBad.push([sid, k, Math.round(sp.x), Math.round(sp.y)]);
  }
  CPU.update = () => {};
  ok('2個目のパックは、柱・バンパー・往復する壁に重ならない場所に出る（全ステージ）', spawnBad.length === 0, spawnBad.slice(0, 4));
  Match.start({ mode: 'cpu', skills: ['fast', 'fast'], stage: 'pillars', server: 0 }); Match.state = 'play'; CPU.update = () => {};
  Physics.mallets.forEach(m => m.active = false);
  const sp2 = Physics.pucks[0]; sp2.x = W * 0.3; sp2.y = L * 0.7;
  for (let f = 0; f < 60 * (PHYS.STALL_TIME + 0.5); f++) { sp2.vx = sp2.vy = 0; Match.update(1 / 60); if (Math.abs(sp2.y - L * 0.7) > 1) break; }
  const pil = Stage.shapes.find(o => o.kind === 'pillar');
  ok('止まったパックの出し直しも、中央の柱に重ならない', pil && Math.hypot(sp2.x - pil.ax, sp2.y - pil.ay) >= sp2.r + pil.r, { x: Math.round(sp2.x), y: Math.round(sp2.y) });

  // ミニ球：パックが小さくなり、打ち返されると元に戻る
  start(['mini', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0);
  shoot(0, 0.8);
  const mr1 = Physics.pucks[0].r / Table.pr;
  shoot(1, 0.8);
  const mr2 = Physics.pucks[0].r / Table.pr;
  ok('ミニ球：次のショットでパックが小さくなり、打ち返されると元に戻る', Math.abs(mr1 - SKILL.MINI_SCALE) < 1e-6 && mr2 === 1, [mr1, mr2]);

  // 巨大化：自分のマレットが大きくなり、当たり判定も大きい。数秒で戻る
  start(['giant', 'fast']); Match.gauge[0] = 1; Match.pressSkill(0);
  for (let f = 0; f < 30; f++) Match.update(1 / 60);
  const gm = Physics.mallets[0], big = gm.r / Table.mr;
  place(0, W / 2, L * 0.8); gm.r = Table.mr * SKILL.GIANT_SCALE;
  const gp = Physics.pucks[0]; gp.x = W / 2; gp.y = L * 0.55; gp.vx = 0; gp.vy = 0.8 * L;
  let contactY = null; for (let f = 0; f < 40; f++) { Match.update(1 / 60); if (gp.vy < 0 && contactY === null) contactY = gp.y; }
  ok('巨大化：マレットが大きくなり、パックは大きいマレットに当たって跳ね返る', Math.abs(big - SKILL.GIANT_SCALE) < 0.02 && contactY !== null && L * 0.8 - contactY > (Table.mr * SKILL.GIANT_SCALE + Table.pr) * 0.95, { big: +big.toFixed(2), gap: contactY && +(L * 0.8 - contactY).toFixed(1) });
  const gc = Table.clampMallet(0, 0, L, gm.r);
  ok("巨大化：大きくなっても壁からはみ出さない", gc.x >= gm.r - 1e-6 && L - gc.y >= gm.r - 1e-6);
  for (let f = 0; f < 60 * 4.5; f++) Match.update(1 / 60);
  ok('巨大化：数秒で元の大きさに戻る', Math.abs(gm.r - Table.mr) < 0.1, +(gm.r / Table.mr).toFixed(2));

  // 衝撃波：近くのパックを相手の陣地へ吹き飛ばす（自分のゴールの側にあるパックも、相手の側へ）
  start(['shock', 'fast']); place(0, W / 2, L * 0.75);
  const s1 = Physics.pucks[0]; s1.x = W * 0.6; s1.y = L * 0.65; s1.vx = 0; s1.vy = 0;
  const s2 = Physics.newPuck(W * 0.4, L * 0.88, 0, 0); Physics.pucks.push(s2);
  Match.gauge[0] = 1; Match.pressSkill(0);
  ok('衝撃波：近くのパックが相手の陣地のほうへ飛ぶ（後ろにあったパックも）', s1.vy < -0.8 * L && s2.vy < -0.5 * L, [+(s1.vy / L).toFixed(2), +(s2.vy / L).toFixed(2)]);
  const s3 = Physics.newPuck(W / 2, L * 0.1, 0, 0); Physics.pucks = [s3]; Match.gauge[0] = 1; Match.pressSkill(0);
  ok('衝撃波：遠くのパックには届かない', s3.vy === 0);

  // ゴール拡大：相手のゴールが広がり、数秒で戻る
  start(['widegoal', 'fast']); const gw0 = Table.goalHalf[1];
  Match.gauge[0] = 1; Match.pressSkill(0);
  for (let f = 0; f < 40; f++) Match.update(1 / 60);
  const gw1 = Table.goalHalf[1], gMine = Table.goalHalf[0];
  ok('ゴール拡大：相手のゴールだけが広がる（斜めの壁までが上限）', gw1 > gw0 * 1.25 && gw1 <= Table.goalHalfMax() + 1e-6 && Math.abs(gMine - gw0) < 1e-6, { g0: +gw0.toFixed(1), g1: +gw1.toFixed(1), max: +Table.goalHalfMax().toFixed(1) });
  const wp = Physics.pucks[0]; wp.x = W / 2 + gw0; /* ふだんならポストに正面から当たる位置 */ wp.y = L * 0.2; wp.vx = 0; wp.vy = -1.2 * L; place(1, W * 0.1, L * 0.3);
  for (let f = 0; f < 40 && Match.state === 'play'; f++) Match.update(1 / 60);
  ok('ゴール拡大：ふだんならポストに当たるシュートが入る', Match.score[0] === 1, { sc: Match.score, st: Match.state, y: +wp.y.toFixed(1), x: +wp.x.toFixed(1), gh: +Table.goalHalf[1].toFixed(1), n: Physics.pucks.length });
  for (let f = 0; f < 60 * 5; f++) Match.update(1 / 60);
  ok('ゴール拡大：数秒で元の幅に戻る', Math.abs(Table.goalHalf[1] - gw0) < 0.5, +Table.goalHalf[1].toFixed(1));

  // 反転：相手（CPU）は左右逆に動いてしまう
  start(['mirror', 'fast']); CPU.update = cpuUpdate;
  Match.gauge[0] = 1; Match.pressSkill(0);
  const cm = Physics.mallets[1]; cm.x = cm.px = W / 2; CPU.tx = W * 0.8; CPU.ty = cm.y; CPU.think = 1; CPU.mode = 'home';
  CPU.update(1 / 60);
  ok('反転：相手のマレットは左右が逆になる（右へ行こうとして左へ）', cm.mirror && cm.tx < W / 2, { tx: +cm.tx.toFixed(1) });
  CPU.update = () => {};

  // CPU は満タンで技を使う
  Match.start({ mode: 'cpu', skills: ['fast', 'wall'], stage: 'pillars', server: 1 });
  CPU.update = cpuUpdate; place(0, W / 2, L * 0.93);            // 自分のマレットはゴールの前に置いておく（すぐ得点されて、待ち時間がやり直しにならないように）
  let used = false; Match.gauge[1] = 1;
  for (let f = 0; f < 60 * 20 && !used; f++) { Match.update(1 / 60); if (Match.gauge[1] < 1) used = true; }   // 合う場面がなくても、プレー中に数秒待てば使う
  ok('CPU：ゲージが満タンになると必殺技を使う', used);
  return out;
});
