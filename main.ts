// Entrypoint for the NIGHTSHIFT — The Meridian Vault submission.
// Hands the game in: copies the playable game/ tree and the staged
// screenshots/ into the output directory and writes dossier.json, a
// machine-readable description of the game for the make.fun judges.
//
// Run with:  MAKEFUN_OUTPUT_DIR=<dir> node main.ts
// (Node 22.18+ runs this file as-is; it uses no TypeScript-only syntax.)

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || join(here, 'dist'));
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

function fail(message) {
  console.error('main.ts: ' + message);
  process.exit(1);
}

if (!existsSync(gameDir)) fail('game/ directory is missing next to main.ts');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ directory is missing');

const shotFiles = ['1-start.jpg', '2-play.jpg', '3-chase.jpg', '4-end.jpg'];
for (const shot of shotFiles) {
  if (!existsSync(join(shotsDir, shot))) fail('screenshots/' + shot + ' is missing');
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = {
  title: 'NIGHTSHIFT — The Meridian Vault',
  tagline: 'A top-down stealth game: five floors, two guard types, cameras, drones, and a ghost bonus for never being seen.',
  cover: 'screenshots/1-start.jpg',
  images: shotFiles.map((name) => 'screenshots/' + name),
  text: [
    'You are the night thief in the Meridian Vault. Each floor hides a blue keycard; grab it, then slip out the green exit without ever being spotted.',
    'Five floors: The Lobby, The Gallery, The Vault, The Server Room, and The Rooftop. Guards patrol waypoints, pause and scan; a guard dog hears walking and runs faster with a shorter cone; patrol drones and sweeping cameras raise the alarm; a rooftop searchlight sweeps the final floor.',
    'Stealth systems: vision cones that warm from yellow to red as suspicion grows, light and shadow (lamps are dangerous, darkness is cover), bushes that hide a crouched player, sprinting that is fast and loud, coin tosses that pull guards away, and smoke puffs that break every line of sight for three seconds.',
    'A floor cleared without a single full detection pays a ghost bonus. Three lives; caught three times and the vault wins.',
  ].join(' '),
  floors: ['The Lobby', 'The Gallery', 'The Vault', 'The Server Room', 'The Rooftop'],
  systems: ['vision cones', 'suspicion with recovery', 'light and shadow', 'bush cover', 'noise and hearing', 'coin distraction', 'smoke gadget', 'cameras', 'guard dog', 'patrol drones', 'searchlight', 'alarm and chase', 'ghost bonus'],
  controls: {
    move: 'WASD or arrow keys',
    sprint: 'Shift (fast, loud)',
    crouch: 'C or Ctrl (slow, silent, hard to see)',
    coin: 'Q or left-click (toss toward the mouse)',
    smoke: 'E (2 per floor, breaks line of sight for 3 seconds)',
    start: 'Space or Enter',
    pause: 'P or Esc',
    restartFloor: 'R',
    mute: 'M',
  },
  howToRun: 'node serve.ts, then open http://localhost:8080',
  entry: 'game/index.html',
  screenshots: shotFiles.map((name) => 'screenshots/' + name),
  license: 'MIT',
};

writeFileSync(join(outDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

let readme = '';
try {
  readme = readFileSync(join(here, 'README.md'), 'utf8');
} catch (err) {
  readme = '';
}
if (readme) cpSync(join(here, 'README.md'), join(outDir, 'README.md'));
if (existsSync(join(here, 'LICENSE'))) cpSync(join(here, 'LICENSE'), join(outDir, 'LICENSE'));

console.log('NIGHTSHIFT handed in to ' + outDir);
console.log('  game/        -> ' + join(outDir, 'game'));
console.log('  screenshots/ -> ' + join(outDir, 'screenshots'));
console.log('  dossier.json written (' + shotFiles.length + ' screenshots, 5 floors)');
