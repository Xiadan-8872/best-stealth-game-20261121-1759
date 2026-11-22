// The five floors of the Meridian Vault.
// Map legend: '#' wall, '.' open floor, 'C' crate (solid, blocks sight),
// 'B' bush (walkable, hides a crouched player), 'L' lamp (lit ground),
// 'S' player start, 'K' blue keycard, 'X' green exit, 'o' loot.
// Every map is 20 wide and 11 tall; every patrol leg runs on open floor.

export const FLOORS = [
  {
    name: 'The Lobby',
    brief: 'Slip past the night guards. Grab the blue keycard, reach the green exit.',
    tip: 'Walk in the dark between lamps. Crouch (C) to stay quiet and unseen. Crates block sight — use them as walls.',
    map: [
      '####################',
      '#S...C....L....o...#',
      '#..........##......#',
      '#.B....C......B....#',
      '#.....##....L......#',
      '#..C......o....C...#',
      '#......L......##...#',
      '#.B.......C........#',
      '#....##.......B..K.#',
      '#..o.....C....L..X.#',
      '####################',
    ],
    guards: [
      { waypoints: [[4, 5], [14, 5]] },
      { waypoints: [[3, 6], [12, 6]] },
    ],
    dogs: [],
    drones: [],
    cameras: [],
    searchlight: null,
  },
  {
    name: 'The Gallery',
    brief: 'Cameras sweep the gallery now. Time your crossing between sweeps.',
    tip: 'A camera fills its own meter — break its line of sight before it trips.',
    map: [
      '####################',
      '#S....L.....C...o..#',
      '#..C......##.......#',
      '#.......B....L.....#',
      '#.##......C....##..#',
      '#.....o......B.....#',
      '#..L.....##....C...#',
      '#.......C.....L..K.#',
      '#.B...##......o....#',
      '#....C....L......X.#',
      '####################',
    ],
    guards: [
      { waypoints: [[3, 1], [11, 1]] },
      { waypoints: [[9, 7], [16, 7]] },
    ],
    dogs: [],
    drones: [],
    cameras: [
      { x: 18, y: 3, base: -2.2 },
      { x: 2, y: 6, base: 0.4 },
    ],
    searchlight: null,
  },
  {
    name: 'The Vault',
    brief: 'Three guards, two cameras, lamps everywhere. The vault door is close.',
    tip: 'Toss a coin (Q) to pull a guard away from the vault corridor.',
    map: [
      '####################',
      '#S..C....L....C..o.#',
      '#.....##......B....#',
      '#.B.....L..C.......#',
      '#..##.......##..L..#',
      '#....o....C....C...#',
      '#.C....L......##...#',
      '#......##...B......#',
      '#.B..C.....L....oK.#',
      '#..L.....C......#X.#',
      '####################',
    ],
    guards: [
      { waypoints: [[5, 1], [11, 1]] },
      { waypoints: [[2, 5], [9, 5]] },
      { waypoints: [[11, 8], [16, 8]] },
    ],
    dogs: [],
    drones: [],
    cameras: [
      { x: 18, y: 1, base: 2.6 },
      { x: 1, y: 9, base: 0.3 },
    ],
    searchlight: null,
  },
  {
    name: 'The Server Room',
    brief: 'Drones hum between the racks. A guard dog patrols by scent and sound.',
    tip: 'Drones never catch you — but if one spots you, the alarm calls the guards. The dog hears walking: crouch near it.',
    map: [
      '####################',
      '#S...C...L.....o...#',
      '#........##...C....#',
      '#.B..L......B......#',
      '#...##....C....L...#',
      '#......o......##...#',
      '#.C.......L....C...#',
      '#....##.....B......#',
      '#.B.....C....L...K.#',
      '#..o......##....#X.#',
      '####################',
    ],
    guards: [
      { waypoints: [[9, 8], [16, 8]] },
    ],
    dogs: [
      { waypoints: [[3, 5], [12, 5]] },
    ],
    drones: [
      { waypoints: [[3, 3], [16, 3]] },
      { waypoints: [[7, 7], [16, 7]] },
    ],
    cameras: [],
    searchlight: null,
  },
  {
    name: 'The Rooftop',
    brief: 'One last sweep under the searchlight. The vault is yours if you vanish.',
    tip: 'The searchlight sweeps the whole roof. Smoke (E) breaks every eye for 3 seconds.',
    map: [
      '####################',
      '#S....L......C..o..#',
      '#..B......##.......#',
      '#.....C.......B....#',
      '#.L......o....##...#',
      '#....##.......L....#',
      '#.B......C......K..#',
      '#..C...L......B....#',
      '#.......##.....o...#',
      '#..o.......C....LX.#',
      '####################',
    ],
    guards: [
      { waypoints: [[8, 3], [17, 3]] },
    ],
    dogs: [
      { waypoints: [[11, 6], [16, 6]] },
    ],
    drones: [],
    cameras: [],
    searchlight: { x: 18, y: 1, base: 2.4 },
  },
];

// Turn a floor's string rows into the structures the simulation needs.
export function parseMap(rows) {
  const grid = rows.map((row) => row.split(''));
  const start = { x: 1.5, y: 1.5 };
  const keycard = { x: 0, y: 0 };
  const exit = { x: 0, y: 0 };
  const loot = [];
  const lamps = [];
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === 'S') { start.x = x + 0.5; start.y = y + 0.5; }
      if (ch === 'K') { keycard.x = x + 0.5; keycard.y = y + 0.5; }
      if (ch === 'X') { exit.x = x + 0.5; exit.y = y + 0.5; }
      if (ch === 'o') loot.push({ x: x + 0.5, y: y + 0.5, taken: false });
      if (ch === 'L') lamps.push({ x: x + 0.5, y: y + 0.5 });
    }
  }
  return { grid, start, keycard, exit, loot, lamps };
}

// Tiles the player and guards can stand on: anything but wall or crate.
export function isWalkable(grid, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || ty >= grid.length || tx >= grid[0].length) return false;
  const ch = grid[ty][tx];
  return ch !== '#' && ch !== 'C';
}

// Walls and crates block eyes; bushes and lamps do not.
export function blocksSight(grid, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= grid.length || tx >= grid[0].length) return true;
  const ch = grid[ty][tx];
  return ch === '#' || ch === 'C';
}

export function isBush(grid, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || ty >= grid.length || tx >= grid[0].length) return false;
  return grid[ty][tx] === 'B';
}

// Straight-line sight between two tile-space points, stepped finely enough
// that no wall or crate can slip between samples.
export function hasLineOfSight(grid, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist * 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(grid, Math.floor(ax + dx * t), Math.floor(ay + dy * t))) return false;
  }
  return true;
}

// Flood fill from the start tile over walkable tiles. Used by the Node
// validator to prove every objective is reachable on every floor.
export function reachableTiles(grid, sx, sy) {
  const seen = new Set();
  const queue = [[Math.floor(sx), Math.floor(sy)]];
  while (queue.length) {
    const [x, y] = queue.pop();
    const key = x + ',' + y;
    if (seen.has(key)) continue;
    if (!isWalkable(grid, x + 0.5, y + 0.5)) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}
