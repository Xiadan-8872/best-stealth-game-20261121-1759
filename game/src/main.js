// Boot, game loop and screens for NIGHTSHIFT — The Meridian Vault.
// Screens: title → floor briefing → play → pause / floor-clear / caught /
// game-over / victory. The loop steps the world, drains its event queue
// into synthesised sound, and draws the world plus HUD plus any panel.

import { createWorld, update, nextFloor } from './world.js';
import { drawWorld, drawActors, drawHud, drawPanel } from './render.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { stageShot, shotInput } from './shots.js';
import { COLORS, VIEW_W, VIEW_H, PLAYER } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const sound = new Sound();

let world = createWorld(0, 1);
let screen = 'title'; // title | briefing | playing | paused | floorclear | caught | gameover | victory
let lastTime = performance.now();
let shotMode = null;
let shotClock = 0;

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number(params.get('seed') || '1');

function playEventSounds() {
  for (const ev of world.events) {
    if (ev.type === 'footstep') sound.footstep(ev.loud);
    else if (ev.type === 'coinThrow') sound.coinThrow();
    else if (ev.type === 'coinLand') sound.coinLand();
    else if (ev.type === 'smoke') sound.smoke();
    else if (ev.type === 'loot' || ev.type === 'keycard') sound.pickup();
    else if (ev.type === 'floorClear') { sound.clear(); if (ev.ghost) sound.ghost(); }
    else if (ev.type === 'spotted') sound.sting();
    else if (ev.type === 'alarm') sound.alarm();
    else if (ev.type === 'caught') sound.caught();
    else if (ev.type === 'won') sound.win();
  }
  world.events.length = 0;
}

function startFloor(floorIndex, keepScore, keepLives) {
  const score = keepScore ? world.score : 0;
  const lives = keepLives ? world.lives : PLAYER.startLives;
  world = createWorld(floorIndex, 1);
  world.score = score;
  world.lives = lives;
  screen = 'briefing';
}

function restartRun() {
  world = createWorld(0, 1);
  screen = 'title';
}

function handleActionKeys() {
  if (input.pressed('m')) {
    sound.toggleMute();
    input.keys.delete('m');
  }
  if (input.pressed('p') || input.pressed('escape')) {
    input.keys.delete('p');
    input.keys.delete('escape');
    if (screen === 'playing') screen = 'paused';
    else if (screen === 'paused') screen = 'playing';
  }
  const advance = input.pressed(' ') || input.pressed('enter');
  if (!advance) return;
  input.keys.delete(' ');
  input.keys.delete('enter');
  if (screen === 'title') {
    sound.ensure();
    sound.startRoomTone();
    screen = 'briefing';
  } else if (screen === 'briefing') {
    screen = 'playing';
  } else if (screen === 'floorclear') {
    const next = nextFloor(world);
    world = next;
    screen = 'briefing';
  } else if (screen === 'caught') {
    startFloor(world.floorIndex, true, true);
    screen = 'playing';
  } else if (screen === 'gameover') {
    restartRun();
  } else if (screen === 'victory') {
    restartRun();
  }
}

function drawScreen() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (screen === 'title') {
    drawWorld(ctx, world);
    drawActors(ctx, world);
    drawPanel(ctx, 'NIGHTSHIFT', [
      'The Meridian Vault — a top-down stealth game',
      '5 floors · 2 guard types · cameras · drones · ghost bonus',
      'Grab the blue keycard, slip out the green exit, never be seen.',
      '',
      'WASD move · Shift sprint · C crouch · Q / click coin · E smoke',
      'Press SPACE to start your shift',
    ]);
    return;
  }
  if (screen === 'briefing') {
    drawWorld(ctx, world);
    drawActors(ctx, world);
    drawPanel(ctx, `Floor ${world.floorIndex + 1} — ${world.floor.name}`, [
      world.floor.brief,
      world.floor.tip,
      '',
      `Score ${world.score} · Lives ${world.lives} · Smoke ${world.smokeLeft}`,
      'Press SPACE to begin',
    ]);
    return;
  }
  drawWorld(ctx, world);
  drawActors(ctx, world);
  drawHud(ctx, world);
  if (screen === 'paused') {
    drawPanel(ctx, 'PAUSED', ['The vault waits. Take a breath.', 'P / Esc resume · R restart floor · M mute']);
  } else if (screen === 'floorclear') {
    drawPanel(ctx, 'FLOOR CLEAR', [
      `${world.floor.name} — unseen? ${world.ghost ? 'GHOST BONUS +500' : 'spotted along the way'}`,
      `Floor score ${world.floorScore} · Total ${world.score}`,
      'Press SPACE for the next floor',
    ], '#39d98a');
  } else if (screen === 'caught') {
    drawPanel(ctx, 'CAUGHT!', [
      'A guard got hands on you. The floor resets.',
      `Lives left: ${world.lives}`,
      'Press SPACE to try the floor again',
    ], '#ff5d5d');
  } else if (screen === 'gameover') {
    drawPanel(ctx, 'THE VAULT WINS', [
      'Three strikes — the night shift ends here.',
      `Final score ${world.score}`,
      'Press SPACE to start a new shift',
    ], '#ff5d5d');
  } else if (screen === 'victory') {
    let best = 0;
    try { best = Number(window.localStorage.getItem('nightshift-best') || '0'); } catch (err) { best = 0; }
    if (world.score > best) {
      best = world.score;
      try { window.localStorage.setItem('nightshift-best', String(best)); } catch (err) { /* private mode */ }
    }
    drawPanel(ctx, 'VAULT EMPTIED — YOU WIN', [
      'All five floors, keycard in hand, out the green door.',
      `Final score ${world.score} (includes ${world.lives} spare-life bonus)`,
      `Best score ${best}`,
      'Press SPACE to play again',
    ], '#39d98a');
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  handleActionKeys();

  if (input.pressed('r') && (screen === 'playing' || screen === 'paused')) {
    input.keys.delete('r');
    startFloor(world.floorIndex, true, true);
    screen = 'playing';
  }

  if (shotMode) {
    shotClock += dt;
    update(world, shotInput(world, shotMode, shotClock), dt);
    playEventSounds();
  } else if (screen === 'playing') {
    const frameInput = input.poll();
    update(world, frameInput, dt);
    input.consume();
    playEventSounds();
    if (world.state === 'cleared') screen = 'floorclear';
    else if (world.state === 'caught') screen = 'caught';
    else if (world.state === 'gameover') screen = 'gameover';
    else if (world.state === 'won') screen = 'victory';
  } else if (screen === 'title' || screen === 'briefing') {
    // Idle life behind the panels: guards keep patrolling.
    update(world, { moveX: 0, moveY: 0 }, dt);
    world.events.length = 0;
  }

  drawScreen();
  if (shotMode && !window.__shotReady) window.__shotReady = true;
  requestAnimationFrame(frame);
}

function bootShotMode() {
  // Each staged scene plays on its own floor: lobby title, gallery sneak,
  // vault chase, rooftop victory.
  const shotFloors = { start: 0, play: 1, chase: 2, end: 4 };
  world = createWorld(shotFloors[shotParam] ?? 0, seedParam);
  const scene = stageShot(world, shotParam, seedParam);
  shotMode = shotParam;
  if (scene === 'title') screen = 'title';
  else if (scene === 'victory') screen = 'victory';
  else screen = 'playing';
  // Stage the victory world as already won so the panel reads true.
  if (scene === 'victory') world.state = 'won';
  if (scene === 'chase') world.alarm.active = true;
}

if (shotParam && ['start', 'play', 'chase', 'end'].includes(shotParam)) {
  bootShotMode();
}

// Read-only hook for the headless play-test: current screen and world.
window.__nightshift = {
  get screen() { return screen; },
  get world() { return world; },
};

requestAnimationFrame(frame);
