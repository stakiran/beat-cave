// 乱数を固定した決定的トレース。キャンバス描画命令とゲーム進行をそれぞれハッシュ化する。
// 2つの版で draw / game が一致すれば挙動が同じ。第5引数にファイルを渡すとフレームごとの記録を書き出す（diff で最初のずれを探せる）。
// 使い方: node dev/trace.js index.html [秒数] [シード] [ダンプ先]

// Deterministic trace: seeded RNG + seeded random walk, hash every canvas call. Same hash => same behaviour.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const seconds = +(process.argv[3] || 60), seed = +(process.argv[4] || 1), dump = process.argv[5] ? [] : null;

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
Math.random = mulberry32(seed);
const walkRng = mulberry32(seed ^ 0x9e3779b9);

let h = 2166136261, gh = 2166136261, calls = 0;
const rec = s => { calls++; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
const grec = s => { for (let i = 0; i < s.length; i++) { gh ^= s.charCodeAt(i); gh = Math.imul(gh, 16777619) >>> 0; } };
const fmtArgs = a => a.map(v => typeof v === 'number' ? v.toFixed(6) : String(v)).join(',');
const ctx = new Proxy({}, {
  get: (t, k) => (...a) => { rec(`${String(k)}(${fmtArgs(a)})`); return k === 'createRadialGradient' ? { addColorStop: (...b) => rec(`stop(${fmtArgs(b)})`) } : undefined; },
  set: (t, k, v) => { rec(`${String(k)}=${v}`); return true; },
});
const els = {};
const el = id => els[id] ||= { textContent: '', innerHTML: '', style: {}, firstElementChild: { style: {} }, listeners: {},
  addEventListener(ev, fn) { this.listeners[ev] = fn; } };
const canvas = { width: 1120, height: 720, getContext: () => ctx };
const winListeners = {}; let rafCb = null; const store = {};
global.window = global;
global.document = { getElementById: id => (id === 'c' ? canvas : el(id)) };
global.addEventListener = (ev, fn) => { winListeners[ev] = fn; };
global.requestAnimationFrame = cb => { rafCb = cb; };
global.performance = { now: () => 0 };
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
global.AudioContext = undefined; global.webkitAudioContext = undefined;
const noop = () => {};
eval(src);

el('start').listeners.click();
const keys = ['w', 'a', 's', 'd'];
let now = 0, held = null, games = 1, maxEnemies = 0;
for (let f = 0; f < seconds * 60; f++) {
  if (f % 20 === 0) {
    if (held) winListeners.keyup({ key: held });
    held = keys[(walkRng() * 4) | 0];
    winListeners.keydown({ key: held, preventDefault: noop, repeat: false });
  }
  now += 1000 / 60; rafCb(now);
  const n = +el('pct').textContent || +el('enemies').textContent || 0;
  if (n > maxEnemies) maxEnemies = n;
  grec(`hud:${el('got').textContent}/${n}/${el('time').textContent}`);
  if (dump) dump.push(`${f} ${el('got').textContent}/${n} ${h.toString(16)}`);
  if (el('overlay').style.display === 'flex') {
    grec('over:' + el('pbody').innerHTML);
    games++; el('overlay').style.display = 'none';
    winListeners.keydown({ key: 'Enter', preventDefault: noop, repeat: false });
  }
}
if (dump) fs.writeFileSync(process.argv[5], dump.join(String.fromCharCode(10)));
console.log(JSON.stringify({ seed, seconds, draw: h.toString(16), game: gh.toString(16), calls, games, maxEnemies }));
