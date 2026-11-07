// ポーズの動作確認。Esc/P で止まる・再開する、Q でステージ選択に戻る、フォーカス喪失で止まる、を見る。
// 使い方: node dev/pausetest.js index.html

// Pause behaviour check: time freezes while paused, resumes after, Q returns to the stage select.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
const els = {};
const el = id => els[id] ||= { textContent: '', innerHTML: '', className: '', style: {}, firstElementChild: { style: {} }, listeners: {},
  addEventListener(ev, fn) { this.listeners[ev] = fn; }, append() {}, classList: { toggle() {} } };
const buttons = [];
const canvas = { width: 1120, height: 720, getContext: () => ctx };
const winListeners = {}; let rafCb = null; const store = {};
global.window = global;
global.document = { getElementById: id => (id === 'c' ? canvas : el(id)), createElement: () => { const b = el('btn' + buttons.length); buttons.push(b); return b; } };
global.addEventListener = (ev, fn) => { winListeners[ev] = fn; };
global.requestAnimationFrame = cb => { rafCb = cb; };
global.performance = { now: () => 0 };
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
global.AudioContext = undefined; global.webkitAudioContext = undefined;
eval(src);

const startBody = el('pbody').innerHTML;
let now = 0;
const run = n => { for (let i = 0; i < n; i++) { now += 1000 / 60; rafCb(now); } };
const key = k => winListeners.keydown({ key: k, preventDefault: noop, repeat: false });
const check = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };

buttons[0].listeners.click();
run(60);
const t1 = el('time').textContent;
key('Escape'); run(120);
check(el('pause').style.display === 'flex', 'pause overlay shown on Escape');
check(el('time').textContent === t1, 'clock frozen while paused (' + t1 + ')');
key('w'); run(5);
check(el('time').textContent === t1, 'movement keys ignored while paused');
key('p'); run(120);
check(el('pause').style.display === 'none', 'pause overlay hidden on P');
check(el('time').textContent !== t1, 'clock running again after resume');
key('Escape'); run(5); key('q'); run(5);
check(el('overlay').style.display === 'flex' && el('pbody').innerHTML === startBody, 'Q from pause returns to the stage select with the original text');
check(el('pause').style.display === 'none', 'pause overlay hidden after Q');
key('Enter'); run(30);
check(el('overlay').style.display === 'none' && el('pause').style.display === 'none', 'Enter starts a new game from the stage select');
winListeners.blur(); run(5);
check(el('pause').style.display === 'flex', 'window blur pauses');
key('Escape'); run(5);
check(el('pause').style.display === 'none', 'resume after blur-pause');
