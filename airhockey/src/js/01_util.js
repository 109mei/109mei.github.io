'use strict';
/* =====================================================================
   小さな道具
   ===================================================================== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const easeOutCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeOutBack = t => { t = clamp(t, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeInCubic = t => Math.pow(clamp(t, 0, 1), 3);
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* 色 '#rrggbb' → [r,g,b] と、明るさを変えた色・透明度つきの色 */
const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(hex, v); }
  return v;
}
function rgba(hex, a) { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function shade(hex, k) {           // k>0 で白へ、k<0 で黒へ
  const c = rgb(hex).map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function mix(h1, h2, t) {
  const a = rgb(h1), b = rgb(h2);
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join('');
}

/* 端末に保存（使えない環境でも動くように） */
const store = {
  get(k, d) { try { const v = localStorage.getItem('airhockey_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('airhockey_' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても続ける */ } },
};

let toastTimer = 0;
function toast(msg, sec = 2.2) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), sec * 1000);
}

const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');
/* 一時的に別のキャンバスへ描く（ステージの見本・技のアイコンに使う） */
function withCtx(c, fn) { const keep = ctx; ctx = c; try { fn(); } finally { ctx = keep; } }
