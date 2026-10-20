// いろいろな場面を撮って1枚にまとめる：node tools/scenes.js 出力.png [場面名...]
const { chromium, launchOpts } = require('./pw');
const SCENES = {
  rally:  { stage: 'pillars', skills: ['fast', 'curve'], run: 'untilFrames(420)' },
  smash:  { stage: 'pillars', skills: ['fast', 'curve'], run: "untilEvent(e => e[0]==='mhit' && e[2] > 2.0, 3)" },
  goal:   { stage: 'sweeper', skills: ['fast', 'curve'], run: "untilEvent(e => e[0]==='goal', 7)" },
  goal2:  { stage: 'sweeper', skills: ['fast', 'curve'], run: "untilEvent(e => e[0]==='goal', 30)" },
  cutin:  { stage: 'spring', skills: ['fast', 'curve'], run: "untilFrames(300); Match.gauge[0]=1; Match.pressSkill(0); untilFrames(9)" },
  fire:   { stage: 'boost', skills: ['fast', 'curve'], run: "untilFrames(240); Match.gauge[0]=1; Match.pressSkill(0); untilEvent(e => e[0]==='shot', 9)" },
  fire2:  { stage: 'pillars', skills: ['fast', 'curve'], run: "untilFrames(240); Match.gauge[0]=1; Match.pressSkill(0); untilFrames(60); untilEvent(e => e[0]==='shot', 6)" },
  split2: { stage: 'pillars', skills: ['split', 'curve'], run: "untilFrames(240); Match.gauge[0]=1; Match.pressSkill(0); untilFrames(60); untilEvent(e => e[0]==='shot', 14)" },
  curve2: { stage: 'pillars', skills: ['curve', 'fast'], run: "untilFrames(240); Match.gauge[0]=1; Match.pressSkill(0); untilFrames(60); untilEvent(e => e[0]==='shot', 18)" },
  vanish2:{ stage: 'pillars', skills: ['vanish', 'fast'], run: "untilFrames(240); Match.gauge[0]=1; Match.pressSkill(0); untilFrames(60); untilEvent(e => e[0]==='shot', 10)" },
  split:  { stage: 'warp', skills: ['split', 'curve'], run: "untilFrames(240); Match.gauge[0]=1; Match.pressSkill(0); untilEvent(e => e[0]==='shot', 14)" },
  second: { stage: 'pulse', skills: ['fast', 'curve'], run: "untilFrames(200); Match.rally = 9; Physics.rally = 9; untilEvent(e => e[0]==='second', 16)" },
  guard:  { stage: 'shutter', skills: ['wall', 'heavy'], run: "untilFrames(200); Match.gauge[0]=1; Match.pressSkill(0); Match.gauge[1]=1; Match.pressSkill(1); Match.gauge[0]=1; untilFrames(40)" },
  guard2: { stage: 'shutter', skills: ['wall', 'heavy'], run: "untilFrames(100); Skills.state.wall[0]=3; Skills.state.heavy[0]=2.5; Skills.state.armed[1]='fast'; Stage.t=2.95; untilFrames(25)" },
  warpfx: { stage: 'warp', skills: ['fast', 'curve'], run: "untilFrames(60); const p = P(); p.x = Table.W * 0.25; p.y = Table.L * 0.41; p.vx = -1.6 * Table.L; p.vy = 0.1 * Table.L; untilEvent(e => e[0]==='warp', 3)" },
  springfx: { stage: 'spring', skills: ['fast', 'curve'], run: "untilFrames(60); const p = P(); p.x = Table.W * 0.3; p.y = Table.L * 0.66; p.vx = -2 * Table.L; p.vy = 0; untilEvent(e => e[0]==='hit' && e[1]==='spring', 4)" },
  shutterwarn: { stage: 'shutter', skills: ['fast', 'curve'], run: "untilFrames(30); Stage.t = 2.0; untilFrames(8)" },
  bumperfx: { stage: 'pulse', skills: ['fast', 'curve'], run: "untilFrames(60); const p = P(); p.x = Table.W * 0.5; p.y = Table.L * 0.5; p.vx = -1.8 * Table.L; p.vy = 0.02 * Table.L; untilEvent(e => e[0]==='hit' && e[1]==='bumper', 4)" },
  intro:  { stage: 'pillars', skills: ['curve', 'heavy'], run: 'untilFrames(70)', noplay: true, nobot: true },
  serve:  { stage: 'pillars', skills: ['fast', 'wall'], run: "untilEvent(e => e[0]==='goal', 120)" },
  markpop:{ stage: 'pillars', skills: ['split', 'wall'], run: "untilFrames(120); Match.gauge[0]=1; Match.pressSkill(0); untilFrames(12)" },
  markpop2:{ stage: 'pillars', skills: ['split', 'heavy'], run: "untilFrames(120); Match.gauge[1]=1; Match.pressSkill(1); Match.gauge[0]=1; Skills.state.armed[0]='split'; untilFrames(14)" },
  giantS: { stage: 'pillars', skills: ['giant', 'mirror'], run: "untilFrames(100); P(); Match.gauge = [1, 1]; Match.pressSkill(0); Match.pressSkill(1); untilFrames(40)" },
  wideS:  { stage: 'spring', skills: ['widegoal', 'shock'], run: "untilFrames(100); P(); Match.gauge = [1, 0]; Match.pressSkill(0); untilFrames(40)" },
  wideS2: { stage: 'spring', skills: ['widegoal', 'shock'], run: "untilFrames(100); P(); Match.gauge = [1, 0]; Match.pressSkill(0); untilFrames(25)", nobot: true },
  zigS:   { stage: 'warp', skills: ['zigzag', 'mini'], run: "untilFrames(100); P(); Match.gauge = [1, 1]; Match.pressSkill(0); Match.pressSkill(1); untilEvent(e => e[0]==='shot', 16)" },
  shockS: { stage: 'boost', skills: ['shock', 'heavy'], run: "untilFrames(100); const p = P(); p.x = Physics.mallets[0].x + 30; p.y = Physics.mallets[0].y - 70; p.vx = 0; p.vy = 0; Match.gauge[0] = 1; Match.pressSkill(0); untilFrames(8)" },
  dark:   { stage: 'dark', skills: ['fast', 'curve'], run: 'untilFrames(400)' },
  dark2:  { stage: 'dark', skills: ['fast', 'curve'], run: 'untilFrames(130)' },
  full:   { stage: 'boost', skills: ['vanish', 'heavy'], run: "untilFrames(120); Match.gauge = [1, 1]; untilFrames(20)" },
  count:  { stage: 'pillars', skills: ['fast', 'curve'], run: 'untilFrames(40)', noplay: true },
};
for (const [i, dt] of [[1, 2.0], [2, 2.06], [3, 2.25], [4, 2.7], [5, 3.6]]) SCENES['shut' + i] = { stage: 'shutter', skills: ['fast', 'wall'], run: `untilFrames(30); Stage.t = ${dt}; untilFrames(2)`, nobot: true };   // シャッターの予告から閉まるまで
for (const id of ['pillars', 'sweeper', 'spring', 'boost', 'warp', 'shutter', 'pulse', 'dark']) SCENES['st_' + id] = { stage: id, skills: ['fast', 'wall'], run: 'untilFrames(300)' };   // ステージごとの見た目
(async () => {
  const [out, ...names] = process.argv.slice(2);
  const list = names.length ? names : Object.keys(SCENES);
  const dir = require('path').dirname(out);
  const b = await chromium.launch(launchOpts());
  const shots = [];
  for (const name of list) {
    const sc = SCENES[name];
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
    await p.goto('file://' + process.cwd() + '/index.html');
    await p.waitForTimeout(200);
    const info = await p.evaluate(({ sc }) => {
      window.__hold = true; let T = 10;
      Match.start({ mode: 'cpu', skills: sc.skills, stage: sc.stage, server: 0 });
      const evs = []; Events.on((t, a) => evs.push([t, ...a]));
      const bot = { mode: 0, t: 0 };
      const botStep = dt => {
        const { W, L, mr, pr } = Table, m = Physics.mallets[0]; m.active = true;
        const pk = Physics.pucks.filter(q => !q.ghost).sort((a, b) => b.y - a.y)[0];
        if (pk && pk.y > L / 2 - pr) {
          if (bot.mode === 0) { m.tx = pk.x + (pk.x - W / 2) * 0.1; m.ty = pk.y + mr * 1.6; if (Math.hypot(m.x - m.tx, m.y - m.ty) < mr * 0.6) { bot.mode = 1; bot.t = 0.15; } }
          else { m.tx = pk.x; m.ty = pk.y - mr * 2; bot.t -= dt; if (bot.t <= 0) bot.mode = 0; }
        } else { m.tx = pk ? lerp(W / 2, pk.x, 0.4) : W / 2; m.ty = L * 0.86; bot.mode = 0; }
        const c = Table.clampMallet(0, m.tx, m.ty); m.tx = c.x; m.ty = c.y;
      };
      const step = () => { if (!sc.nobot) botStep(1 / 60); T += 1 / 60; tick(1 / 60, T); };
      window.P = () => { Match.state = 'play'; Skills.freeze = 0; Match.hitStop = 0; if (!Physics.pucks[0]) Physics.pucks = [Physics.newPuck(Table.W / 2, Table.L / 2)]; Physics.mallets[1].tx = Table.W * 0.85; return Physics.pucks[0]; };
      window.untilFrames = n => { for (let i = 0; i < n; i++) step(); };
      window.untilEvent = (f, after) => {
        const start = evs.length;
        for (let i = 0; i < 60 * 60; i++) { step(); if (evs.slice(start).some(f)) break; }
        for (let i = 0; i < after; i++) step();
      };
      if (!sc.noplay) { for (let i = 0; i < 200 && Match.state !== 'play'; i++) step(); }
      eval(sc.run);
      return { state: Match.state, score: Match.score, rally: Match.rally };
    }, { sc });
    const file = `${dir}/scene_${name}.png`;
    await p.screenshot({ path: file });
    console.log(name, JSON.stringify(info), errs.length ? 'エラー: ' + errs.join(' / ') : '');
    shots.push(file);
    await ctx.close();
  }
  await b.close();
  require('child_process').execFileSync('python3', [__dirname + '/sheet.py', out, ...shots]);
})();
