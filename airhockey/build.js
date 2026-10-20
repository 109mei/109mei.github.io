// src/ の部品を1つの index.html にまとめる
//   src/js/00_config.js … 調整用の定数（index.html の先頭に置く）
//   src/style.css・src/body.html・src/js/*.js（番号順）… src/template.html に埋め込む
const fs = require('fs');
const path = require('path');
const rd = (...p) => fs.readFileSync(path.join(__dirname, ...p), 'utf8');
const dir = path.join(__dirname, 'src', 'js');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
const config = files.filter(f => f.startsWith('00_'));
const rest = files.filter(f => !f.startsWith('00_'));
const join = list => list.map(f => `// ===== ${f} =====\n` + rd('src', 'js', f)).join('\n');
const out = rd('src', 'template.html')
  .replace('/*CONFIG*/', () => join(config))
  .replace('/*STYLES*/', () => rd('src', 'style.css'))
  .replace('<!--BODY-->', () => rd('src', 'body.html'))
  .replace('<!--SCRIPTS-->', () => join(rest));
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log('built index.html', out.length, 'bytes /', files.length, 'js files');
