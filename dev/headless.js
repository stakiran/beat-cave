// 画面なしの動作確認。DOM を最小限スタブし、ランダム歩行で N 秒遊ぶ。例外が出ないこと、ゲームが進むことを見る。
// 使い方: node dev/headless.js index.html [秒数] [ステージ番号(0始まり)]

// Headless smoke test: load index.html's <script>, stub the DOM, play N seconds with random walking.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const seconds = +(process.argv[3] || 120);

const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
const els = {};
const el = id => els[id] ||= { textContent: '', innerHTML: '', className: '', style: {}, firstElementChild: { style: {} }, listeners: {},
  addEventListener(ev, fn) { this.listeners[ev] = fn; }, append() {}, classList: { toggle() {} } };
const buttons = []; // stage buttons the game creates, in STAGES order
const canvas = { width: 1120, height: 720, getContext: () => ctx };
const winListeners = {};
let rafCb = null;
const store = {};
global.window = global;
global.document = { getElementById: id => (id === 'c' ? canvas : el(id)), createElement: () => { const b = el('btn' + buttons.length); buttons.push(b); return b; } };
global.addEventListener = (ev, fn) => { winListeners[ev] = fn; };
global.requestAnimationFrame = cb => { rafCb = cb; };
global.performance = { now: () => 0 };
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
global.AudioContext = undefined; global.webkitAudioContext = undefined; // initAudio() swallows the error -> ac stays null

eval(src);

// start and play
const stageIdx = +(process.argv[4] || 0); buttons[stageIdx].listeners.click(); // which stage to play (index into STAGES)
const keys = ['w', 'a', 's', 'd'];
let now = 0, held = null, games = 1, maxEnemies = 0, hits = 0;
const dt = 1000 / 60;
for (let f = 0; f < seconds * 60; f++) {
  if (f % 20 === 0) {
    if (held) winListeners.keyup({ key: held });
    held = keys[(Math.random() * 4) | 0];
    winListeners.keydown({ key: held, preventDefault: noop, repeat: false });
  }
  now += dt; rafCb(now);
  const n = +el('pct').textContent || +el('enemies').textContent || 0;
  if (n > maxEnemies) maxEnemies = n;
  if (el('overlay').style.display === 'flex') { // game over -> restart
    games++; el('overlay').style.display = 'none';
    winListeners.keydown({ key: 'Enter', preventDefault: noop, repeat: false });
  }
}
console.log(JSON.stringify({ seconds, games, maxEnemies, lastItems: el('got').textContent, best: store['beatcave-best-items'] ?? null }));
