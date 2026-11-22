// Headless Chromium play-test + staged screenshots for NIGHTSHIFT.
// Drives Chrome over CDP with the `ws` package (no playwright needed).
//   node tools/shoot.mjs [--port 8080] [--shots-only|--playtest-only]
// Expects the game server already running (node serve.ts).
// Writes screenshots/1-start.jpg … 4-end.jpg and prints a verdict.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const WebSocket = require('/home/hatch/workspace/tools/makefun/node_modules/ws');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const args = process.argv.slice(2);
const port = Number((args[args.indexOf('--port') + 1]) || '8080');
const shotsOnly = args.includes('--shots-only');
const playtestOnly = args.includes('--playtest-only');
const CHROME = process.env.CHROME_BIN || '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const shots = [
  { file: '1-start.jpg', query: '?shot=start&seed=1' },
  { file: '2-play.jpg', query: '?shot=play&seed=1' },
  { file: '3-chase.jpg', query: '?shot=chase&seed=1' },
  { file: '4-end.jpg', query: '?shot=end&seed=1' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  const res = await fetch('http://127.0.0.1:9222' + path);
  return res.json();
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page eval failed: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result ? r.result.value : undefined;
  }
}

async function main() {
  const chrome = spawn(CHROME, [
    '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=9222', '--window-size=1280,800',
    '--user-data-dir=/tmp/nightshift-chrome-profile',
    '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });
  const errors = [];
  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try { targets = await getJson('/json/list'); break; } catch (e) { /* not up yet */ }
    }
    if (!targets) throw new Error('Chrome DevTools did not come up');
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
    await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
    const cdp = new Cdp(ws);
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    const noteError = (text) => { errors.push(text); };

    async function navigate(url) {
      await cdp.send('Page.navigate', { url });
      for (let i = 0; i < 50; i++) {
        await sleep(200);
        const ready = await cdp.eval('document.readyState').catch(() => '');
        if (ready === 'complete') return;
      }
      throw new Error('page did not finish loading: ' + url);
    }
    async function waitForShotReady() {
      for (let i = 0; i < 50; i++) {
        await sleep(200);
        if (await cdp.eval('window.__shotReady === true').catch(() => false)) return true;
      }
      return false;
    }
    function drainErrors() {
      for (const ev of cdp.events.splice(0)) {
        if (ev.method === 'Runtime.exceptionThrown') {
          noteError('exception: ' + JSON.stringify(ev.params.exceptionDetails).slice(0, 300));
        } else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') {
          noteError('console.error: ' + JSON.stringify(ev.params.args).slice(0, 300));
        } else if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') {
          const text = ev.params.entry.text || '';
          if (!text.includes('favicon')) noteError('log error: ' + text.slice(0, 300));
        }
      }
    }
    async function key(keyName, code, holdMs = 80) {
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code });
      if (holdMs) await sleep(holdMs);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code });
    }
    async function holdKey(keyName, code, ms) {
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code });
      await sleep(ms);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code });
    }

    if (!playtestOnly) {
      for (const shot of shots) {
        await navigate('http://localhost:' + port + '/' + shot.query);
        const ready = await waitForShotReady();
        await sleep(1500);
        drainErrors();
        if (!ready) { errors.push(shot.file + ': __shotReady never set'); continue; }
        const dataUrl = await cdp.eval(`document.getElementById('game').toDataURL('image/jpeg', 0.85)`);
        if (!dataUrl || !dataUrl.startsWith('data:image/jpeg')) {
          errors.push(shot.file + ': canvas did not produce a JPEG data URL');
          continue;
        }
        const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
        writeFileSync(join(root, 'screenshots', shot.file), buf);
        console.log('SHOT  ' + shot.file + ' ' + buf.length + ' bytes' + (buf.length > 262144 ? '  OVER 256 KiB!' : ''));
        if (buf.length > 262144) errors.push(shot.file + ' exceeds 256 KiB');
      }
    }

    if (!shotsOnly) {
      await navigate('http://localhost:' + port + '/');
      await sleep(1200);
      drainErrors();
      const screen0 = await cdp.eval('window.__nightshift && window.__nightshift.screen');
      console.log('PLAYTEST title screen: ' + screen0);
      await key(' ', 'Space');
      await sleep(300);
      await key(' ', 'Space');
      await sleep(300);
      const screen1 = await cdp.eval('window.__nightshift && window.__nightshift.screen');
      console.log('PLAYTEST after Space x2: ' + screen1);
      await holdKey('w', 'KeyW', 900);
      await holdKey('a', 'KeyA', 500);
      await holdKey('c', 'KeyC', 200);
      await holdKey('w', 'KeyW', 700);
      await key('q', 'KeyQ');
      await sleep(600);
      await key('e', 'KeyE');
      await sleep(400);
      await key('p', 'KeyP');
      await sleep(300);
      const paused = await cdp.eval('window.__nightshift && window.__nightshift.screen');
      console.log('PLAYTEST after P: ' + paused);
      await key('p', 'KeyP');
      await sleep(300);
      const resumed = await cdp.eval('window.__nightshift && window.__nightshift.screen');
      console.log('PLAYTEST after P again: ' + resumed);
      await sleep(500);
      drainErrors();
      const pos = await cdp.eval('window.__nightshift ? [window.__nightshift.world.player.x, window.__nightshift.world.player.y] : null');
      console.log('PLAYTEST player tile: ' + JSON.stringify(pos));
      if (screen1 !== 'playing') errors.push('play-test never reached playing screen (got ' + screen1 + ')');
      if (paused !== 'paused') errors.push('pause did not engage (got ' + paused + ')');
      if (resumed !== 'playing') errors.push('resume did not return to playing (got ' + resumed + ')');
    }

    drainErrors();
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  if (errors.length) {
    console.log('\nERRORS (' + errors.length + '):');
    errors.forEach((e) => console.log('  - ' + e));
    process.exit(1);
  }
  console.log('\nHEADLESS PLAY-TEST: ZERO CONSOLE ERRORS');
}

main().catch((err) => { console.error('shoot failed: ' + err.message); process.exit(1); });
