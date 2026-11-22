// NIGHTSHIFT — The Meridian Vault
// Central tuning table. Every number the game balances on lives here so a
// single edit can retune movement, sight, sound and scoring together.

export const TILE = 64; // pixels per map tile
export const MAP_W = 20; // tiles across
export const MAP_H = 11; // tiles down
export const VIEW_W = 1280; // canvas width in pixels
export const VIEW_H = 800; // canvas height (64 HUD + 11 * 64 playfield)
export const HUD_H = 64;

export const PLAYER = {
  walkSpeed: 3.4, // tiles per second, quiet
  crouchSpeed: 1.9, // tiles per second, silent and hard to see
  sprintSpeed: 5.6, // tiles per second, fast and loud
  radius: 0.26, // collision circle in tiles
  startLives: 3,
};

export const GUARD = {
  patrolSpeed: 1.55,
  chaseSpeed: 2.9,
  searchSpeed: 2.1,
  returnSpeed: 2.0,
  viewRange: 5.0, // tiles, standing player in the open
  viewHalfAngle: 0.62, // radians either side of facing
  crouchRange: 3.1, // crouched player is spotted much later
  shadowRange: 3.6, // player standing in darkness
  pauseAtWaypoint: 1.4, // seconds stood still, scanning
  scanSweep: 1.9, // radians swept while paused
  catchDistance: 0.55, // tiles: touching the player ends the floor
  suspicionGain: 0.9, // per second at point blank, in light, standing
  suspicionDecay: 0.30, // per second once line of sight is broken
  searchTime: 5.0, // seconds hunting the last seen spot
  hearSprint: 4.6, // tiles: sprinting footsteps are heard this far
  hearWalk: 0.9, // tiles: walking is barely audible
  hearCoin: 5.5, // tiles: a tossed coin pulls guards from this far
};

export const DOG = {
  patrolSpeed: 2.3,
  chaseSpeed: 3.6,
  searchSpeed: 2.6,
  returnSpeed: 2.4,
  viewRange: 3.4, // short cone, but the nose makes up for it
  viewHalfAngle: 0.5,
  crouchRange: 2.2,
  shadowRange: 2.6,
  hearWalk: 1.8, // about 1.9x a guard's walking hearing
  hearSprint: 7.5,
  catchDistance: 0.55,
  suspicionGain: 1.05,
  suspicionDecay: 0.26,
  searchTime: 4.0,
  pauseAtWaypoint: 0.8,
};

export const DRONE = {
  patrolSpeed: 2.0,
  viewRange: 4.4,
  viewHalfAngle: 0.55,
  alarmFill: 0.9, // seconds of sight before the alarm trips
};

export const CAMERA = {
  viewRange: 4.6,
  viewHalfAngle: 0.5,
  sweepSpeed: 0.55, // radians per second
  sweepArc: 0.9, // radians either side of the base angle
  alarmFill: 1.1, // seconds of sight before the alarm trips
};

export const SEARCHLIGHT = {
  viewRange: 7.0,
  viewHalfAngle: 0.42,
  sweepSpeed: 0.4,
  sweepArc: 0.8,
  alarmFill: 1.0,
};

export const LIGHT = {
  lampRadius: 1.9, // tiles of lit ground around a lamp
  lampGlow: 0.55, // how bright the pool reads
  lightGain: 1.6, // suspicion multiplier while standing in lamplight
  darkGain: 0.62, // suspicion multiplier while in shadow
  crouchGain: 0.55, // suspicion multiplier while crouched
  sprintGain: 1.5, // suspicion multiplier while sprinting
};

export const GADGETS = {
  coins: 99, // coin tosses are free; the pouch never runs out
  smokePerFloor: 2,
  smokeDuration: 3.0, // seconds no eye can see through the cloud
  smokeRadius: 2.4, // tiles
  coinFlight: 0.45, // seconds a tossed coin spends in the air
  coinThrowRange: 5.0, // tiles, clamped to the mouse tile
};

export const ALARM = {
  duration: 7.0, // seconds guards hunt the player after a trip
  convergeSpeed: 3.0, // guards run to the trip position this fast
};

export const SCORE = {
  loot: 100,
  keycard: 50,
  floorClear: 200,
  ghostBonus: 500, // cleared without a single full detection
  timeBonusPerSecond: 8, // leftover seconds under the par time
  floorPar: 150, // seconds; beating par pays the difference
  lifeBonus: 250, // per spare life at the final vault door
};

export const COLORS = {
  floorDark: '#171a20',
  floorLight: '#232833',
  floorAlt: '#1d212b',
  wall: '#3a4152',
  wallTop: '#4d5870',
  crate: '#6b5433',
  crateEdge: '#8a6f45',
  bush: '#243d24',
  bushLeaf: '#2f5230',
  lampPool: 'rgba(255, 196, 90, 0.16)',
  lampCore: '#ffd27a',
  keycard: '#4dc3ff',
  exit: '#39d98a',
  loot: '#ffd94d',
  player: '#e8ecf4',
  playerRing: '#ffd94d',
  guard: '#ff5d5d',
  dog: '#ff9a3d',
  drone: '#b78cff',
  camera: '#ff7ad9',
  searchlight: 'rgba(255, 240, 160, 0.20)',
  coneCalm: 'rgba(255, 220, 120, 0.13)',
  coneWarm: 'rgba(255, 160, 60, 0.22)',
  coneHot: 'rgba(255, 70, 70, 0.30)',
  smoke: 'rgba(200, 205, 215, 0.5)',
  hudBg: '#10131a',
  hudText: '#e8ecf4',
  hudDim: '#8b93a7',
  accent: '#ffd94d',
};
