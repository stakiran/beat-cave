// 角の補助の確認。ステージ3の格子で、交差点の手前で横を押すと通路の中心へ滑って曲がれること、
// 開口が無い場所では滑らないことを見る。window.beatcaveDebug() 経由で moveCircle を直接呼ぶ。
// 使い方: node dev/cornertest.js index.html
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
const els = {}; const buttons = [];
const el = id => els[id] ||= { textContent: '', innerHTML: '', className: '', style: {}, firstElementChild: { style: {} }, listeners: {},
  addEventListener(ev, fn) { this.listeners[ev] = fn; }, append() {}, classList: { toggle() {} } };
const canvas = { width: 1120, height: 720, getContext: () => ctx };
const winListeners = {}; let rafCb = null;
global.window = global;
global.document = { getElementById: id => (id === 'c' ? canvas : el(id)), createElement: () => { const b = el('btn' + buttons.length); buttons.push(b); return b; } };
global.addEventListener = (ev, fn) => { winListeners[ev] = fn; };
global.requestAnimationFrame = cb => { rafCb = cb; };
global.performance = { now: () => 0 };
global.localStorage = { getItem: () => null, setItem: noop };
global.AudioContext = undefined; global.webkitAudioContext = undefined;
eval(src);
const check = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };

buttons[2].listeners.click();                       // stage 3: streets at x,y = 1,4,7,...
const D = window.beatcaveDebug();
check(D.stage.key === 'city', 'stage 3 loaded');
check(D.open[4 + 4 * 56] === 1 && D.open[5 + 3 * 56] === 0 && D.open[5 + 4 * 56] === 1, 'grid shape: (4,4) street, (5,3) block, (5,4) street');
check(Math.abs(D.BEAT - 60 / 140) < 1e-9 && Math.abs(D.pspeed - 5 * 140 / 104) < 1e-9, 'tempo 140 and player speed scaled with it');

const step = D.pspeed / 60;                         // one frame of movement
const o = { x: 4.7, y: 4.1 };                       // in the vertical street, 0.4 above the intersection centre, pushing right
for (let i = 0; i < 12; i++) D.moveCircle(o, step, 0, 0.3);
check(Math.abs(o.y - 4.5) <= 0.2 + 1e-9, 'slid down until it fits the side street (y=' + o.y.toFixed(3) + ')');
check(o.x > 5.2, 'then made the turn into the side street (x=' + o.x.toFixed(2) + ')');

const o2 = { x: 4.7, y: 2.5 };                      // mid-block: no side street within reach
for (let i = 0; i < 12; i++) D.moveCircle(o2, step, 0, 0.3);
check(o2.x === 4.7 && o2.y === 2.5, 'no opening nearby: stays put');

const o3 = { x: 4.7, y: 4.1 };                      // diagonal input at the same spot: both axes hit the block corner, and no assist kicks in
D.moveCircle(o3, step, step, 0.3);
check(o3.x === 4.7 && o3.y === 4.1, 'diagonal push: no assist (only a single-axis push slides)');

const hunters = D.enemies.filter(e => e.type === 'hunt');
check(hunters.length === 1 && D.dist[hunters[0].x + hunters[0].y * 56] >= 20, 'exactly one hunter, placed 20+ path tiles away');
check(!D.enemies.some(e => e.type === 'loop' || e.type === 'chg'), 'no loop or charge enemies in stage 3');
