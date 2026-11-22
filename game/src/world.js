// The simulation: guards, vision, suspicion, noise, loot, alarms.
// Pure logic — no DOM, no canvas, no audio — so Node can run it headless
// for validation and the browser can run the same code for real.

import {
  PLAYER, GUARD, DOG, DRONE, CAMERA, SEARCHLIGHT, LIGHT, GADGETS, ALARM, SCORE,
} from './config.js';
import { FLOORS, parseMap, isWalkable, isBush, hasLineOfSight, blocksSight } from './levels.js';
import { makeRng } from './random.js';

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Does the straight segment between two points cross a smoke cloud?
function segmentHitsSmoke(smokes, ax, ay, bx, by) {
  for (const s of smokes) {
    if (s.timer <= 0) continue;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((s.x - ax) * dx + (s.y - ay) * dy) / len2;
    t = clamp(t, 0, 1);
    const px = ax + dx * t;
    const py = ay + dy * t;
    if (Math.hypot(px - s.x, py - s.y) < s.radius) return true;
  }
  return false;
}

function makeWalker(kind, waypoints, tuning) {
  const start = waypoints[0];
  // Fill any missing tuning field with a sane default, so a new watcher
  // type can never produce a NaN speed and freeze the simulation.
  const full = {
    patrolSpeed: 1.5,
    chaseSpeed: 2.8,
    searchSpeed: 2.0,
    returnSpeed: 2.0,
    viewRange: 4.5,
    viewHalfAngle: 0.6,
    crouchRange: 3.0,
    shadowRange: 3.5,
    pauseAtWaypoint: 1.2,
    catchDistance: 0.55,
    suspicionGain: 0.9,
    suspicionDecay: 0.3,
    searchTime: 4.5,
    ...tuning,
  };
  return {
    kind,
    waypoints: waypoints.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })),
    wpIndex: 1 % waypoints.length,
    x: start[0] + 0.5,
    y: start[1] + 0.5,
    angle: 0,
    state: 'patrol', // patrol | pause | investigate | search | chase | return
    suspicion: 0,
    pauseTimer: 0,
    scanPhase: 0,
    lastSeen: null,
    searchTimer: 0,
    loseTimer: 0,
    investigateTarget: null,
    lookTimer: 0,
    tuning: full,
  };
}

export function createWorld(floorIndex, seed = 1) {
  const floor = FLOORS[floorIndex];
  const parsed = parseMap(floor.map);
  const rng = makeRng(seed * 7919 + floorIndex * 104729 + 13);
  const world = {
    floorIndex,
    floor,
    grid: parsed.grid,
    rng,
    time: 0,
    state: 'playing', // playing | cleared | caught | gameover | won
    lives: PLAYER.startLives,
    score: 0,
    ghost: true, // stays true only while nobody ever fully spots the player
    spotted: false, // any full detection on this floor
    keycardTaken: false,
    loot: parsed.loot,
    lamps: parsed.lamps,
    keycard: parsed.keycard,
    exit: parsed.exit,
    player: {
      x: parsed.start.x,
      y: parsed.start.y,
      angle: 0,
      crouch: false,
      sprint: false,
      moving: false,
      speed: 0,
      stepTimer: 0,
      lit: false,
      hidden: false,
    },
    guards: floor.guards.map((g) => makeWalker('guard', g.waypoints, GUARD)),
    dogs: floor.dogs.map((d) => makeWalker('dog', d.waypoints, DOG)),
    drones: floor.drones.map((d) => ({
      kind: 'drone',
      waypoints: d.waypoints.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })),
      wpIndex: 1 % d.waypoints.length,
      x: d.waypoints[0][0] + 0.5,
      y: d.waypoints[0][1] + 0.5,
      angle: 0,
      meter: 0,
      cooldown: 0,
    })),
    cameras: floor.cameras.map((c) => ({
      x: c.x + 0.5, y: c.y + 0.5, base: c.base, angle: c.base, meter: 0, cooldown: 0,
    })),
    searchlight: floor.searchlight
      ? { x: floor.searchlight.x + 0.5, y: floor.searchlight.y + 0.5, base: floor.searchlight.base, angle: floor.searchlight.base, meter: 0, cooldown: 0 }
      : null,
    coins: [],
    smokes: [],
    smokeLeft: GADGETS.smokePerFloor,
    alarm: { active: false, timer: 0, x: 0, y: 0 },
    events: [],
    floorTime: 0,
    floorScore: 0,
  };
  return world;
}

function resetFloorPositions(world) {
  const parsed = parseMap(world.floor.map);
  world.player.x = parsed.start.x;
  world.player.y = parsed.start.y;
  world.player.angle = 0;
  for (const list of [world.guards, world.dogs]) {
    for (const w of list) {
      const start = w.waypoints[0];
      w.x = start.x; w.y = start.y;
      w.wpIndex = 1 % w.waypoints.length;
      w.state = 'patrol'; w.suspicion = 0; w.lastSeen = null;
      w.pauseTimer = 0; w.searchTimer = 0; w.loseTimer = 0;
    }
  }
  for (const d of world.drones) {
    d.x = d.waypoints[0].x; d.y = d.waypoints[0].y;
    d.wpIndex = 1 % d.waypoints.length; d.meter = 0;
  }
  for (const c of world.cameras) c.meter = 0;
  if (world.searchlight) world.searchlight.meter = 0;
  world.coins = [];
  world.smokes = [];
  world.alarm.active = false;
  world.alarm.timer = 0;
  world.floorTime = 0;
}

// Is the player standing inside any lamp's lit pool?
export function playerLit(world) {
  for (const lamp of world.lamps) {
    if (Math.hypot(world.player.x - lamp.x, world.player.y - lamp.y) < LIGHT.lampRadius) return true;
  }
  return false;
}

// Can this watcher see the player right now? Range, cone, walls, bushes,
// smoke and darkness all count. Returns false when the player is hidden.
export function canSee(world, watcher, range, halfAngle) {
  const p = world.player;
  const dx = p.x - watcher.x;
  const dy = p.y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), watcher.angle)) > halfAngle) return false;
  if (world.smokes.some((s) => s.timer > 0)) {
    const inSmoke = world.smokes.some((s) => s.timer > 0 && Math.hypot(p.x - s.x, p.y - s.y) < s.radius);
    if (inSmoke) return false;
    if (segmentHitsSmoke(world.smokes, watcher.x, watcher.y, p.x, p.y)) return false;
  }
  if (!hasLineOfSight(world.grid, watcher.x, watcher.y, p.x, p.y)) return false;
  if (p.crouch && isBush(world.grid, p.x, p.y) && dist > 1.3) return false;
  return true;
}

// Effective sight range against this player right now: crouching and
// darkness shrink it, lamplight does not extend a guard's eyes.
function effectiveRange(world, baseRange, crouchRange, shadowRange) {
  const p = world.player;
  let r = baseRange;
  if (p.crouch) r = Math.min(r, crouchRange);
  if (!playerLit(world)) r = Math.min(r, shadowRange);
  return r;
}

// Move a circle through the tile grid, sliding along walls and crates.
function moveWithCollision(world, body, dx, dy) {
  const r = PLAYER.radius;
  const nx = body.x + dx;
  if (isWalkable(world.grid, nx + Math.sign(dx) * r, body.y - r + 0.01)
    && isWalkable(world.grid, nx + Math.sign(dx) * r, body.y + r - 0.01)) {
    body.x = nx;
  }
  const ny = body.y + dy;
  if (isWalkable(world.grid, body.x - r + 0.01, ny + Math.sign(dy) * r)
    && isWalkable(world.grid, body.x + r - 0.01, ny + Math.sign(dy) * r)) {
    body.y = ny;
  }
}

function walkToward(world, body, tx, ty, speed, dt) {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.02) return true;
  const step = Math.min(dist, speed * dt);
  const nx = (dx / dist) * step;
  const ny = (dy / dist) * step;
  body.angle = Math.atan2(dy, dx);
  moveWithCollision(world, body, nx, ny);
  return dist - step < 0.05;
}

function tripAlarm(world, x, y, source) {
  world.alarm.active = true;
  world.alarm.timer = ALARM.duration;
  world.alarm.x = x;
  world.alarm.y = y;
  world.spotted = true;
  world.ghost = false;
  world.events.push({ type: 'alarm', source, x, y });
  for (const w of [...world.guards, ...world.dogs]) {
    if (w.state !== 'chase') {
      w.state = 'investigate';
      w.investigateTarget = { x, y };
    }
  }
}

function onCaught(world) {
  world.lives -= 1;
  world.events.push({ type: 'caught', lives: world.lives });
  world.spotted = true;
  world.ghost = false;
  if (world.lives <= 0) {
    world.state = 'gameover';
    world.events.push({ type: 'gameover' });
  } else {
    world.state = 'caught';
    resetFloorPositions(world);
  }
}

function hearNoise(world, x, y, radius, kind) {
  for (const w of [...world.guards, ...world.dogs]) {
    if (w.state === 'chase') continue;
    const d = Math.hypot(w.x - x, w.y - y);
    const hear = w.kind === 'dog' ? DOG.hearSprint : GUARD.hearSprint;
    if (d < Math.min(radius, hear) || (kind === 'coin' && d < GUARD.hearCoin)) {
      w.state = 'investigate';
      w.investigateTarget = { x, y };
      w.suspicion = Math.max(w.suspicion, 0.35);
    }
  }
}

function updateWalker(world, w, dt) {
  const t = w.tuning;
  const p = world.player;
  const range = effectiveRange(world, t.viewRange, t.crouchRange, t.shadowRange);
  const sees = canSee(world, w, range, t.viewHalfAngle);
  if (sees) {
    const dist = Math.hypot(p.x - w.x, p.y - w.y);
    const closeness = 1 - (dist / range) * 0.6;
    let gain = t.suspicionGain * Math.max(0.25, closeness);
    if (playerLit(world)) gain *= LIGHT.lightGain;
    else gain *= LIGHT.darkGain;
    if (p.crouch) gain *= LIGHT.crouchGain;
    if (p.sprint) gain *= LIGHT.sprintGain;
    w.suspicion = clamp(w.suspicion + gain * dt, 0, 1);
    w.lastSeen = { x: p.x, y: p.y };
    w.loseTimer = 0;
    if (w.suspicion >= 1) {
      if (w.state !== 'chase') world.events.push({ type: 'spotted', kind: w.kind, x: w.x, y: w.y });
      w.state = 'chase';
      world.spotted = true;
      world.ghost = false;
    }
  } else {
    w.suspicion = clamp(w.suspicion - t.suspicionDecay * dt, 0, 1);
    if (w.state === 'chase') {
      w.loseTimer += dt;
      if (w.loseTimer > 3.0) {
        w.state = 'search';
        w.searchTimer = t.searchTime;
      }
    }
  }

  if (w.state === 'chase') {
    walkToward(world, w, p.x, p.y, t.chaseSpeed, dt);
    if (Math.hypot(p.x - w.x, p.y - w.y) < t.catchDistance) onCaught(world);
    return;
  }
  if (w.state === 'search') {
    if (w.lastSeen) {
      const arrived = walkToward(world, w, w.lastSeen.x, w.lastSeen.y, t.searchSpeed, dt);
      if (arrived) {
        w.searchTimer -= dt;
        w.scanPhase += dt * 2.4;
        w.angle += Math.sin(w.scanPhase) * 0.06;
        if (w.searchTimer <= 0) w.state = 'return';
      }
    } else w.state = 'return';
    return;
  }
  if (w.state === 'investigate') {
    const tgt = w.investigateTarget || w.lastSeen;
    if (tgt) {
      const arrived = walkToward(world, w, tgt.x, tgt.y, t.searchSpeed, dt);
      if (arrived) {
        w.lookTimer += dt;
        w.scanPhase += dt * 2.2;
        w.angle += Math.sin(w.scanPhase) * 0.05;
        if (w.lookTimer > 2.0) {
          w.lookTimer = 0;
          w.investigateTarget = null;
          w.state = 'return';
        }
      }
    } else w.state = 'return';
    return;
  }
  if (w.state === 'return') {
    let best = 0;
    let bestD = Infinity;
    w.waypoints.forEach((wp, i) => {
      const d = Math.hypot(wp.x - w.x, wp.y - w.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    const arrived = walkToward(world, w, w.waypoints[best].x, w.waypoints[best].y, t.returnSpeed, dt);
    if (arrived) {
      w.wpIndex = (best + 1) % w.waypoints.length;
      w.state = 'patrol';
    }
    return;
  }
  if (w.state === 'pause') {
    w.pauseTimer -= dt;
    w.scanPhase += dt * 1.6;
    w.angle = w.angle + Math.sin(w.scanPhase) * 0.045;
    if (w.pauseTimer <= 0) w.state = 'patrol';
    return;
  }
  // patrol
  const target = w.waypoints[w.wpIndex];
  const arrived = walkToward(world, w, target.x, target.y, t.patrolSpeed, dt);
  if (arrived) {
    w.wpIndex = (w.wpIndex + 1) % w.waypoints.length;
    w.state = 'pause';
    w.pauseTimer = t.pauseAtWaypoint;
    w.scanPhase = 0;
  }
}

// A sweeping eye (camera or searchlight): cone oscillates, its own meter
// fills on sight and trips the alarm when full.
function updateSweeper(world, eye, cfg, dt) {
  if (eye.cooldown > 0) {
    eye.cooldown -= dt;
    eye.meter = Math.max(0, eye.meter - dt * 0.25);
    return;
  }
  eye.angle = eye.base + Math.sin(world.time * cfg.sweepSpeed) * cfg.sweepArc;
  const fake = { x: eye.x, y: eye.y, angle: eye.angle };
  if (canSee(world, fake, cfg.viewRange, cfg.viewHalfAngle)) {
    eye.meter = clamp(eye.meter + dt / cfg.alarmFill, 0, 1);
    if (eye.meter >= 1) {
      tripAlarm(world, world.player.x, world.player.y, 'camera');
      eye.meter = 0;
      eye.cooldown = 3.0;
    }
  } else {
    eye.meter = clamp(eye.meter - dt * 0.25, 0, 1);
  }
}

// One fixed step of the game. `input` carries the frame's keys and clicks;
// one-shot actions (coin, smoke) are consumed here.
export function update(world, input, dt) {
  if (world.state !== 'playing') return;
  dt = Math.min(dt, 0.05);
  world.time += dt;
  world.floorTime += dt;
  const p = world.player;

  // --- player movement ---
  let mx = input.moveX || 0;
  let my = input.moveY || 0;
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  p.crouch = !!input.crouch;
  p.sprint = !!input.sprint && !p.crouch;
  const speed = p.crouch ? PLAYER.crouchSpeed : p.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  p.moving = mag > 0.1;
  p.speed = p.moving ? speed : 0;
  if (p.moving) {
    p.angle = Math.atan2(my, mx);
    moveWithCollision(world, p, mx * speed * dt, my * speed * dt);
    // Footsteps: sprinting is loud, walking is a whisper, crouching silent.
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      if (p.sprint) {
        // Loud enough for a guard nearby — and for a dog much further off.
        hearNoise(world, p.x, p.y, DOG.hearSprint, 'sprint');
        world.events.push({ type: 'footstep', loud: true, x: p.x, y: p.y });
        p.stepTimer = 0.34;
      } else if (!p.crouch) {
        for (const d of world.dogs) {
          if (Math.hypot(d.x - p.x, d.y - p.y) < DOG.hearWalk && d.state !== 'chase') {
            d.state = 'investigate';
            d.investigateTarget = { x: p.x, y: p.y };
          }
        }
        world.events.push({ type: 'footstep', loud: false, x: p.x, y: p.y });
        p.stepTimer = 0.5;
      }
    }
  }
  p.lit = playerLit(world);
  p.hidden = p.crouch && isBush(world.grid, p.x, p.y);

  // --- gadgets ---
  if (input.coinTarget) {
    const t = input.coinTarget;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    const max = GADGETS.coinThrowRange;
    const tx = d > max ? p.x + ((t.x - p.x) / d) * max : t.x;
    const ty = d > max ? p.y + ((t.y - p.y) / d) * max : t.y;
    world.coins.push({ x: p.x, y: p.y, tx, ty, t: 0 });
    world.events.push({ type: 'coinThrow', x: p.x, y: p.y });
  }
  if (input.smoke && world.smokeLeft > 0) {
    world.smokes.push({ x: p.x, y: p.y, radius: GADGETS.smokeRadius, timer: GADGETS.smokeDuration });
    world.smokeLeft -= 1;
    world.events.push({ type: 'smoke', x: p.x, y: p.y });
  }
  for (const coin of world.coins) {
    coin.t += dt / GADGETS.coinFlight;
    if (coin.t >= 1) {
      coin.landed = true;
      hearNoise(world, coin.tx, coin.ty, GUARD.hearCoin, 'coin');
      world.events.push({ type: 'coinLand', x: coin.tx, y: coin.ty });
    }
  }
  world.coins = world.coins.filter((c) => !c.landed);
  for (const s of world.smokes) s.timer -= dt;
  world.smokes = world.smokes.filter((s) => s.timer > 0);

  // --- watchers ---
  for (const w of [...world.guards, ...world.dogs]) updateWalker(world, w, dt);
  if (world.state !== 'playing') return;
  for (const d of world.drones) {
    const target = d.waypoints[d.wpIndex];
    const arrived = walkToward(world, d, target.x, target.y, DRONE.patrolSpeed, dt);
    if (arrived) d.wpIndex = (d.wpIndex + 1) % d.waypoints.length;
    if (d.cooldown > 0) { d.cooldown -= dt; continue; }
    if (canSee(world, d, DRONE.viewRange, DRONE.viewHalfAngle)) {
      d.meter = clamp(d.meter + dt / DRONE.alarmFill, 0, 1);
      if (d.meter >= 1) {
        tripAlarm(world, world.player.x, world.player.y, 'drone');
        d.meter = 0;
        d.cooldown = 3.0;
      }
    } else d.meter = clamp(d.meter - dt * 0.6, 0, 1);
  }
  for (const c of world.cameras) updateSweeper(world, c, CAMERA, dt);
  if (world.searchlight) updateSweeper(world, world.searchlight, SEARCHLIGHT, dt);

  // --- alarm clock ---
  if (world.alarm.active) {
    world.alarm.timer -= dt;
    if (world.alarm.timer <= 0) {
      world.alarm.active = false;
      for (const w of [...world.guards, ...world.dogs]) {
        if (w.state === 'investigate') w.state = 'return';
      }
      world.events.push({ type: 'alarmEnd' });
    }
  }

  // --- pickups and the exit ---
  if (!world.keycardTaken && Math.hypot(p.x - world.keycard.x, p.y - world.keycard.y) < 0.7) {
    world.keycardTaken = true;
    world.score += SCORE.keycard;
    world.floorScore += SCORE.keycard;
    world.events.push({ type: 'keycard' });
  }
  for (const loot of world.loot) {
    if (!loot.taken && Math.hypot(p.x - loot.x, p.y - loot.y) < 0.6) {
      loot.taken = true;
      world.score += SCORE.loot;
      world.floorScore += SCORE.loot;
      world.events.push({ type: 'loot', x: loot.x, y: loot.y });
    }
  }
  if (world.keycardTaken && Math.hypot(p.x - world.exit.x, p.y - world.exit.y) < 0.7) {
    const timeBonus = Math.max(0, Math.round((SCORE.floorPar - world.floorTime) * SCORE.timeBonusPerSecond));
    const ghostBonus = world.ghost ? SCORE.ghostBonus : 0;
    world.score += SCORE.floorClear + timeBonus + ghostBonus;
    world.floorScore += SCORE.floorClear + timeBonus + ghostBonus;
    world.events.push({ type: 'floorClear', ghost: world.ghost, timeBonus, ghostBonus });
    if (world.floorIndex >= FLOORS.length - 1) {
      world.score += world.lives * SCORE.lifeBonus;
      world.state = 'won';
      world.events.push({ type: 'won', score: world.score });
    } else {
      world.state = 'cleared';
    }
  }
}

// Advance to the next floor, carrying score and lives.
export function nextFloor(world) {
  const score = world.score;
  const lives = world.lives;
  const fresh = createWorld(world.floorIndex + 1, 1);
  fresh.score = score;
  fresh.lives = lives;
  return fresh;
}

// Headless helper for the Node validator: run N fixed steps.
export function runSteps(world, seconds, inputFn) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    update(world, inputFn ? inputFn(i * dt, world) : {}, dt);
    if (world.state !== 'playing') break;
  }
  return world;
}
