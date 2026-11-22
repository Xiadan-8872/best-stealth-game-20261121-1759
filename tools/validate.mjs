// Headless validator for NIGHTSHIFT. Run with:
//   node tools/validate.mjs
// Exits non-zero on the first failed check; prints one PASS line per check.

import { FLOORS, parseMap, isWalkable, reachableTiles } from '../game/src/levels.js';
import { createWorld, update, runSteps } from '../game/src/world.js';
import { MAP_W, MAP_H } from '../game/src/config.js';

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

function countChar(rows, ch) {
  return rows.join('').split('').filter((c) => c === ch).length;
}

function legClear(grid, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dist = Math.hypot(dx, dy);
  const steps = Math.ceil(dist * 4);
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    if (!isWalkable(grid, a[0] + 0.5 + dx * t, a[1] + 0.5 + dy * t)) return false;
  }
  return true;
}

for (let i = 0; i < FLOORS.length; i++) {
  const floor = FLOORS[i];
  const label = 'floor ' + (i + 1) + ' ' + floor.name;
  check(label + ': 11 rows', floor.map.length === MAP_H, 'got ' + floor.map.length);
  check(label + ': 20 cols each', floor.map.every((r) => r.length === MAP_W));
  check(label + ': exactly one start', countChar(floor.map, 'S') === 1);
  check(label + ': exactly one exit', countChar(floor.map, 'X') === 1);
  check(label + ': exactly one keycard', countChar(floor.map, 'K') === 1);
  const parsed = parseMap(floor.map);
  const seen = reachableTiles(parsed.grid, parsed.start.x, parsed.start.y);
  const at = (p) => seen.has(Math.floor(p.x) + ',' + Math.floor(p.y));
  check(label + ': keycard reachable', at(parsed.keycard));
  check(label + ': exit reachable', at(parsed.exit));
  check(label + ': all loot reachable', parsed.loot.every(at));
  for (const listName of ['guards', 'dogs', 'drones']) {
    for (const ent of floor[listName]) {
      for (let w = 0; w < ent.waypoints.length; w++) {
        const a = ent.waypoints[w];
        const b = ent.waypoints[(w + 1) % ent.waypoints.length];
        check(label + ': ' + listName + ' patrol leg ' + w + ' clear', legClear(parsed.grid, a, b), JSON.stringify(a) + ' -> ' + JSON.stringify(b));
      }
    }
  }
  for (const cam of floor.cameras) {
    check(label + ': camera tile walkable', isWalkable(parsed.grid, cam.x + 0.5, cam.y + 0.5));
  }
  if (floor.searchlight) {
    check(label + ': searchlight tile walkable', isWalkable(parsed.grid, floor.searchlight.x + 0.5, floor.searchlight.y + 0.5));
  }
}

// --- simulation checks ---
for (let i = 0; i < FLOORS.length; i++) {
  const world = createWorld(i, 1);
  try {
    runSteps(world, 10, () => ({ moveX: 0, moveY: 0 }));
    check('sim floor ' + (i + 1) + ': 10s patrol, no error, still playing', world.state === 'playing', 'state=' + world.state);
  } catch (err) {
    check('sim floor ' + (i + 1) + ': 10s patrol, no error', false, String(err));
  }
}

// Smoke: fires on E and is gone after its 3s duration.
{
  const world = createWorld(0, 1);
  update(world, { moveX: 0, moveY: 0, smoke: true }, 1 / 60);
  check('smoke: fires and costs one puff', world.smokes.length === 1 && world.smokeLeft === 1);
  runSteps(world, 3.5, () => ({ moveX: 0, moveY: 0 }));
  check('smoke: expired after 3s', world.smokes.length === 0);
}

// Drone overlap costs no life: stand on the drone for 2s.
{
  const world = createWorld(3, 1);
  const drone = world.drones[0];
  world.player.x = drone.x;
  world.player.y = drone.y;
  runSteps(world, 2, () => ({ moveX: 0, moveY: 0 }));
  check('drone: overlap costs no life', world.lives === 3 && world.state === 'playing', 'lives=' + world.lives + ' state=' + world.state);
}

// Searchlight trips the alarm when the player stands in its sweep.
{
  const world = createWorld(4, 1);
  const light = world.searchlight;
  // Aim the light straight at the player and hold the player in the open,
  // clear of the rooftop crate at (13, 1).
  world.player.x = 14.5;
  world.player.y = 1.5;
  light.base = Math.atan2(world.player.y - light.y, world.player.x - light.x);
  runSteps(world, 3, () => ({ moveX: 0, moveY: 0 }));
  check('searchlight: trips the alarm', world.alarm.active || world.spotted, 'alarm=' + world.alarm.active + ' spotted=' + world.spotted);
}

// Coin toss pulls a guard to investigate.
{
  const world = createWorld(0, 1);
  const guard = world.guards[0];
  update(world, { moveX: 0, moveY: 0, coinTarget: { x: guard.x, y: guard.y } }, 1 / 60);
  runSteps(world, 1.5, () => ({ moveX: 0, moveY: 0 }));
  check('coin: guard investigates the clink', guard.state === 'investigate' || guard.state === 'search' || guard.state === 'return', 'state=' + guard.state);
}

// Keycard + exit clears floor 1.
{
  const world = createWorld(0, 1);
  world.player.x = world.keycard.x;
  world.player.y = world.keycard.y;
  update(world, { moveX: 0, moveY: 0 }, 1 / 60);
  check('pickup: keycard taken', world.keycardTaken);
  world.player.x = world.exit.x;
  world.player.y = world.exit.y;
  update(world, { moveX: 0, moveY: 0 }, 1 / 60);
  check('exit: floor clears with keycard', world.state === 'cleared', 'state=' + world.state);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
