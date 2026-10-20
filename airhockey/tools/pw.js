// テストで使う Playwright（npm で入れたものを使い、なければこの開発環境のものを使う）
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
exports.chromium = pw.chromium;
exports.launchOpts = (extra = []) => {
  const o = { args: ['--no-sandbox', ...extra] };
  if (process.env.CHROMIUM) o.executablePath = process.env.CHROMIUM;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) o.executablePath = '/opt/pw-browsers/chromium';
  return o;
};
