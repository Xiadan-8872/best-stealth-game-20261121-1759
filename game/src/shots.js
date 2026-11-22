// Staged screenshot scenes. Each scene is built from the real simulation:
// the world is stepped forward with no cheats, then the actors are posed
// for the shot. ?shot=start|play|chase|end&seed=1 is deterministic.

import { update, runSteps } from './world.js';

function idleInput() {
  return { moveX: 0, moveY: 0, sprint: false, crouch: false };
}

export function stageShot(world, scene, seed) {
  if (scene === 'start') {
    // Title over a living lobby: let the guards walk their rounds first.
    runSteps(world, 6, () => idleInput());
    return 'title';
  }
  if (scene === 'play') {
    // Mid-floor sneak in the Gallery: crouched in a bush, a guard closing
    // in with suspicion half full.
    runSteps(world, 4, () => idleInput());
    const bush = { x: 2.5, y: 3.5 };
    world.player.x = bush.x;
    world.player.y = bush.y;
    world.player.crouch = true;
    const guard = world.guards[1] || world.guards[0];
    guard.x = 9.5;
    guard.y = 3.5;
    guard.angle = Math.PI;
    guard.suspicion = 0.45;
    guard.state = 'pause';
    guard.pauseTimer = 2.0;
    return 'playing';
  }
  if (scene === 'chase') {
    // Live alarm in the Vault: a guard in full chase, a second guard
    // running to the alarm, alarm ringing.
    runSteps(world, 3, () => idleInput());
    world.player.x = 10.5;
    world.player.y = 5.5;
    const guard = world.guards[0];
    guard.x = 8.5;
    guard.y = 5.5;
    guard.angle = 0;
    guard.suspicion = 1;
    guard.state = 'chase';
    guard.lastSeen = { x: world.player.x, y: world.player.y };
    const second = world.guards[1];
    if (second) {
      second.state = 'investigate';
      second.investigateTarget = { x: world.player.x, y: world.player.y };
      second.suspicion = 0.6;
    }
    world.alarm.active = true;
    world.alarm.timer = 6.0;
    world.alarm.x = world.player.x;
    world.alarm.y = world.player.y;
    world.spotted = true;
    world.ghost = false;
    return 'chase';
  }
  // end: victory on the Rooftop, keycard banked, score posted.
  runSteps(world, 5, () => idleInput());
  world.keycardTaken = true;
  world.score = 2840;
  world.floorScore = 940;
  world.player.x = world.exit.x - 1.2;
  world.player.y = world.exit.y;
  world.player.angle = 0;
  world.lives = 3;
  return 'victory';
}

// Autopilot input while a staged scene is on screen, so cones sweep and
// guards keep moving instead of freezing for the camera.
export function shotInput(world, scene, t) {
  if (scene === 'play') {
    return { moveX: 0, moveY: 0, sprint: false, crouch: true };
  }
  if (scene === 'chase') {
    // Flee: run away from the nearest chasing guard.
    let threat = null;
    let best = Infinity;
    for (const w of [...world.guards, ...world.dogs]) {
      const d = Math.hypot(w.x - world.player.x, w.y - world.player.y);
      if (d < best) { best = d; threat = w; }
    }
    if (!threat) return idleInput();
    let dx = world.player.x - threat.x;
    let dy = world.player.y - threat.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    return { moveX: dx, moveY: dy, sprint: true, crouch: false };
  }
  if (scene === 'end') return idleInput();
  // start: the night guard's lobby, player waiting at the door.
  return idleInput();
}
