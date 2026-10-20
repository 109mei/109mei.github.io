// CPU戦を早送りで最後まで動かす：node tools/sim.js [ステージ] [試合数]
const { chromium, launchOpts } = require('./pw');
(async () => {
  const stage = process.argv[2] || 'pillars', games = +(process.argv[3] || 1);
  const b = await chromium.launch(launchOpts());
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/index.html');
  const R = await p.evaluate(({ stage, games }) => {
    const out = [];
    for (let g = 0; g < games; g++) {
      Match.start({ mode: 'cpu', skills: [SKILLS[g % SKILLS.length].id, SKILLS[(g + 5) % SKILLS.length].id], stage, server: 0 });
      const ev = {}; const on = (t) => ev[t] = (ev[t] || 0) + 1;
      Events.listeners.push(on);
      let frames = 0, maxRally = 0, maxPucks = 0, bad = 0, maxSp = 0;
      const dt = 1 / 60, { W, L } = Table;
      let bot = { mode: 0, t: 0 };
      while (Match.active && frames < 60 * 60 * 8) {
        // 下の人の簡単なボット：パックの後ろに回って、上へ打つ
        const m = Physics.mallets[0]; m.active = true; const _m = m;
        const pk = Physics.pucks.filter(q => !q.ghost).sort((a, b) => b.y - a.y)[0];
        if (pk && pk.y > L / 2 - Table.pr) {
          if (bot.mode === 0) { m.tx = pk.x + (pk.x - W / 2) * 0.1; m.ty = pk.y + Table.mr * 1.6; if (Math.hypot(m.x - m.tx, m.y - m.ty) < Table.mr * 0.6) { bot.mode = 1; bot.t = 0.15; } }
          else { m.tx = pk.x; m.ty = pk.y - Table.mr * 2; bot.t -= dt; if (bot.t <= 0) bot.mode = 0; }
        } else { m.tx = pk ? lerp(W / 2, pk.x, 0.4) : W / 2; m.ty = L * 0.88; bot.mode = 0; }
        const c = Table.clampMallet(0, m.tx, m.ty); m.tx = c.x; m.ty = c.y;
        if (Match.gauge[0] >= 1 && Math.random() < 0.01) Match.pressSkill(0);
        Match.update(dt); Fx.update(dt); frames++;
        if (Game.state === 'match') { maxRally = Math.max(maxRally, Match.rally); maxPucks = Math.max(maxPucks, Physics.pucks.length); }
        for (const q of Physics.pucks) {
          if (!isFinite(q.x + q.y + q.vx + q.vy) || q.x < -1 || q.x > W + 1) bad++;
          maxSp = Math.max(maxSp, Math.hypot(q.vx, q.vy) / L);
        }
        if (frames % 600 === 0) drawMatch(frames / 60);      // 時々描いて、描画のエラーも確かめる
      }
      Events.listeners.pop();
      out.push({ score: Match.score.join('-'), sec: Math.round(frames / 60), maxRally, maxPucks, bad, maxSp: +maxSp.toFixed(2),
                 ev: Object.fromEntries(Object.entries(ev).filter(([k]) => ['mhit', 'goal', 'skill', 'shot', 'second', 'pop', 'warp', 'full'].includes(k))),
                 screen: UI.screen });
    }
    return out;
  }, { stage, games });
  for (const r of R) console.log(stage, JSON.stringify(r));
  console.log(errs.length ? 'エラー: ' + errs.slice(0, 5).join('\n') : 'ページのエラーなし');
  await b.close();
})();
