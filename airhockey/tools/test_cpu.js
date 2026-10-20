// CPU の動きの確認（強弱の打ち分け・守り・技）：node tools/test_cpu.js
require('./common').run(() => {
  const out = [], ok = (n, pass, info) => out.push((pass ? '〇 ' : '× ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
  const powers = [], skills = [], stuck = []; let cpuGoals = 0, myGoals = 0, frames = 0, maxStill = 0;
  Events.on((t, a) => { if (t === 'mhit' && a[0] === 1) powers.push(a[1]); if (t === 'skill' && a[0] === 1) skills.push(a[1]); if (t === 'goal') a[0] === 1 ? cpuGoals++ : myGoals++; });
  for (const stage of ['pillars', 'sweeper', 'boost', 'shutter']) {
    Match.start({ mode: 'cpu', skills: ['fast', pick(SKILLS).id], stage, server: 0 });
    const { W, L, mr, pr } = Table, bot = { mode: 0, t: 0 };
    let still = 0;
    while (Match.active && frames < 60 * 60 * 20) {
      const m = Physics.mallets[0]; m.active = true; const _m = m, dt = 1 / 60;
      const pk = Physics.pucks.filter(q => !q.ghost).sort((a, b) => b.y - a.y)[0];
      if (pk && pk.y > L / 2 - pr) {
        if (bot.mode === 0) { m.tx = pk.x; m.ty = pk.y + mr * 1.6; if (Math.hypot(m.x - m.tx, m.y - m.ty) < mr * 0.6) { bot.mode = 1; bot.t = 0.15; } }
        else { m.tx = pk.x + rand(-1, 1) * 20; m.ty = pk.y - mr * 2; bot.t -= dt; if (bot.t <= 0) bot.mode = 0; }
      } else { m.tx = W / 2; m.ty = L * 0.88; bot.mode = 0; }
      const c = Table.clampMallet(0, m.tx, m.ty); m.tx = c.x; m.ty = c.y;
      Match.update(dt); frames++;
      // CPU の陣地でパックが止まったまま、CPU が触れない状態が続いていないか
      const q = Physics.pucks[0];
      if (Match.state === 'play' && q && q.y < L / 2 && Math.hypot(q.vx, q.vy) < 0.05 * L) still += dt; else still = 0;
      maxStill = Math.max(maxStill, still);
    }
  }
  const strong = powers.filter(p => p > 2).length, weak = powers.filter(p => p < 1).length;
  ok('CPU は強く打つときと弱く当てるときがある', strong > 5 && weak > 5, { hits: powers.length, strong, weak, avg: +(powers.reduce((a, b) => a + b, 0) / powers.length).toFixed(2) });
  ok('CPU は必殺技を使う', skills.length > 3, skills.slice(0, 8));
  ok('CPU は点を取るし、取られもする（勝負になる）', cpuGoals > 3 && myGoals > 3, { cpuGoals, myGoals });
  ok('CPU の陣地で止まったパックを放っておかない（2秒以上止まったままにならない）', maxStill < 2, +maxStill.toFixed(2));
  return out;
});
