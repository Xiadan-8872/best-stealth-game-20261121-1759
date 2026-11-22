// Canvas drawing: floor, lamps, vision cones, actors, HUD and screens.
// All drawing reads the world; nothing here mutates it.

import { TILE, VIEW_W, VIEW_H, HUD_H, COLORS, LIGHT } from './config.js';
import { blocksSight } from './levels.js';

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: HUD_H + ty * TILE + TILE / 2 };
}

export function worldToScreen(x, y) {
  return { x: x * TILE, y: HUD_H + y * TILE };
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range * TILE, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function suspicionColor(suspicion) {
  if (suspicion > 0.66) return COLORS.coneHot;
  if (suspicion > 0.3) return COLORS.coneWarm;
  return COLORS.coneCalm;
}

export function drawWorld(ctx, world) {
  const grid = world.grid;
  // --- floor tiles ---
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const ch = grid[y][x];
      const px = x * TILE;
      const py = HUD_H + y * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 6);
        continue;
      }
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorDark : COLORS.floorAlt;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      if (ch === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 8, py + 8, TILE - 16, TILE - 16);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 8, py + 8, TILE - 16, TILE - 16);
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 8);
        ctx.lineTo(px + TILE - 8, py + TILE - 8);
        ctx.moveTo(px + TILE - 8, py + 8);
        ctx.lineTo(px + 8, py + TILE - 8);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else if (ch === 'B') {
        ctx.fillStyle = COLORS.bush;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.bushLeaf;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.6;
          ctx.beginPath();
          ctx.arc(px + TILE / 2 + Math.cos(a) * 14, py + TILE / 2 + Math.sin(a) * 14, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (ch === 'L') {
        ctx.fillStyle = COLORS.lampPool;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, LIGHT.lampRadius * TILE * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.lampCore;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- keycard, loot, exit ---
  const kc = worldToScreen(world.keycard.x, world.keycard.y);
  if (!world.keycardTaken) {
    ctx.fillStyle = COLORS.keycard;
    ctx.fillRect(kc.x - 10, kc.y - 6, 20, 12);
    ctx.fillStyle = '#0b2a3d';
    ctx.fillRect(kc.x - 6, kc.y - 3, 5, 6);
    ctx.strokeStyle = COLORS.keycard;
    ctx.beginPath();
    ctx.arc(kc.x, kc.y, 16 + Math.sin(world.time * 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A pulsing ring marks the exit once the keycard is banked.
  const ex0 = worldToScreen(world.exit.x, world.exit.y);
  if (world.keycardTaken) {
    ctx.strokeStyle = `rgba(57, 217, 138, ${0.5 + 0.3 * Math.sin(world.time * 4)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex0.x, ex0.y, TILE / 2 + 4 + Math.sin(world.time * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  for (const loot of world.loot) {
    if (loot.taken) continue;
    const s = worldToScreen(loot.x, loot.y);
    ctx.fillStyle = COLORS.loot;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c00';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', s.x, s.y + 0.5);
  }
  const ex = worldToScreen(world.exit.x, world.exit.y);
  ctx.fillStyle = world.keycardTaken ? COLORS.exit : 'rgba(57, 217, 138, 0.25)';
  ctx.fillRect(ex.x - TILE / 2 + 4, ex.y - TILE / 2 + 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = COLORS.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x - TILE / 2 + 4, ex.y - TILE / 2 + 4, TILE - 8, TILE - 8);
  ctx.lineWidth = 1;
  ctx.fillStyle = world.keycardTaken ? '#06281a' : '#9fb8a8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.keycardTaken ? 'EXIT' : 'LOCKED', ex.x, ex.y);

  // --- vision cones (under the actors) ---
  for (const w of [...world.guards, ...world.dogs]) {
    const s = worldToScreen(w.x, w.y);
    const t = w.tuning;
    const range = w.kind === 'dog' ? t.viewRange : t.viewRange;
    drawCone(ctx, s.x, s.y, w.angle, range, t.viewHalfAngle, suspicionColor(w.suspicion));
  }
  for (const d of world.drones) {
    const s = worldToScreen(d.x, d.y);
    drawCone(ctx, s.x, s.y, d.angle, 4.4, 0.55, d.meter > 0.3 ? COLORS.coneWarm : 'rgba(183, 140, 255, 0.14)');
  }
  for (const c of world.cameras) {
    const s = worldToScreen(c.x, c.y);
    drawCone(ctx, s.x, s.y, c.angle, 4.6, 0.5, c.meter > 0.3 ? COLORS.coneWarm : 'rgba(255, 122, 217, 0.14)');
  }
  if (world.searchlight) {
    const s = worldToScreen(world.searchlight.x, world.searchlight.y);
    drawCone(ctx, s.x, s.y, world.searchlight.angle, 7.0, 0.42, COLORS.searchlight);
  }

  // --- smoke clouds ---
  for (const s of world.smokes) {
    const p = worldToScreen(s.x, s.y);
    const alpha = Math.min(1, s.timer);
    ctx.fillStyle = `rgba(200, 205, 215, ${0.5 * alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.radius * TILE, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(220, 225, 235, ${0.35 * alpha})`;
    ctx.beginPath();
    ctx.arc(p.x - 18, p.y - 10, 22, 0, Math.PI * 2);
    ctx.arc(p.x + 20, p.y + 12, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- coins in flight ---
  for (const coin of world.coins) {
    const cx = coin.x + (coin.tx - coin.x) * coin.t;
    const cy = coin.y + (coin.ty - coin.y) * coin.t - Math.sin(coin.t * Math.PI) * 0.8;
    const s = worldToScreen(cx, cy);
    ctx.fillStyle = COLORS.loot;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Footer strip below the last tile row, so no canvas stays unpainted.
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, HUD_H + grid.length * TILE, VIEW_W, VIEW_H - HUD_H - grid.length * TILE);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Q coin · E smoke · C crouch · Shift sprint · P pause', VIEW_W / 2, HUD_H + grid.length * TILE + 20);
  ctx.textAlign = 'left';
}

// Draw one patrolling watcher: body, facing tick, suspicion ring and ? / !.
function drawWalker(ctx, world, w) {
  const s = worldToScreen(w.x, w.y);
  const isDog = w.kind === 'dog';
  ctx.fillStyle = isDog ? '#ff9a3d' : '#ff5d5d';
  ctx.beginPath();
  ctx.arc(s.x, s.y, isDog ? 13 : 15, 0, Math.PI * 2);
  ctx.fill();
  // facing tick
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x + Math.cos(w.angle) * 20, s.y + Math.sin(w.angle) * 20);
  ctx.stroke();
  ctx.lineWidth = 1;
  // ears for the dog, cap brim for the guard
  ctx.fillStyle = isDog ? '#c96a1e' : '#7a2020';
  if (isDog) {
    ctx.beginPath();
    ctx.arc(s.x - 9, s.y - 9, 4, 0, Math.PI * 2);
    ctx.arc(s.x + 9, s.y - 9, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(s.x - 12, s.y - 17, 24, 6);
  }
  // suspicion ring + mark
  if (w.suspicion > 0.05) {
    ctx.strokeStyle = w.suspicion > 0.66 ? '#ff4040' : '#ffd94d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 22, -Math.PI / 2, -Math.PI / 2 + w.suspicion * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = w.suspicion > 0.66 ? '#ff4040' : '#ffd94d';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.suspicion > 0.66 ? '!' : '?', s.x, s.y - 26);
  }
  if (w.state === 'chase') {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', s.x, s.y - 26);
  }
}

function drawDrone(ctx, world, d) {
  const s = worldToScreen(d.x, d.y);
  ctx.fillStyle = '#b78cff';
  ctx.beginPath();
  ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e6dcff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#2a1a4d';
  ctx.beginPath();
  ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
  ctx.fill();
  if (d.meter > 0.05) {
    ctx.strokeStyle = '#b78cff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 22, -Math.PI / 2, -Math.PI / 2 + d.meter * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawCamera(ctx, world, c) {
  const s = worldToScreen(c.x, c.y);
  ctx.fillStyle = '#3a3f4d';
  ctx.fillRect(s.x - 10, s.y - 10, 20, 20);
  ctx.fillStyle = '#ff7ad9';
  ctx.beginPath();
  ctx.arc(s.x + Math.cos(c.angle) * 12, s.y + Math.sin(c.angle) * 12, 6, 0, Math.PI * 2);
  ctx.fill();
  if (c.meter > 0.05) {
    ctx.strokeStyle = '#ff7ad9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 20, -Math.PI / 2, -Math.PI / 2 + c.meter * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

export function drawActors(ctx, world) {
  for (const c of world.cameras) drawCamera(ctx, world, c);
  if (world.searchlight) {
    const s = worldToScreen(world.searchlight.x, world.searchlight.y);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a7a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (world.searchlight.meter > 0.05) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 21, -Math.PI / 2, -Math.PI / 2 + world.searchlight.meter * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  for (const d of world.drones) drawDrone(ctx, world, d);
  for (const w of [...world.guards, ...world.dogs]) drawWalker(ctx, world, w);

  // --- the player ---
  const p = world.player;
  const s = worldToScreen(p.x, p.y);
  if (p.lit) {
    ctx.strokeStyle = 'rgba(255, 210, 122, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(s.x, s.y, p.crouch ? 11 : 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c3242';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y, p.crouch ? 11 : 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2c3242';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x + Math.cos(p.angle) * 18, s.y + Math.sin(p.angle) * 18);
  ctx.stroke();
  if (p.hidden) {
    ctx.fillStyle = '#7ee2a0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', s.x, s.y - 24);
  }
}

export function drawHud(ctx, world) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`NIGHTSHIFT — ${world.floor.name}`, 16, 22);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '14px sans-serif';
  ctx.fillText(
    `Floor ${world.floorIndex + 1}/5   Score ${world.score}   Lives ${'♥'.repeat(world.lives)}${'♡'.repeat(Math.max(0, 3 - world.lives))}`,
    16, 46,
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = world.keycardTaken ? COLORS.keycard : COLORS.hudDim;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(world.keycardTaken ? 'KEYCARD ✓  →  reach the EXIT' : 'Find the blue KEYCARD', VIEW_W - 260, 22);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '14px sans-serif';
  const mins = Math.floor(world.floorTime / 60);
  const secs = Math.floor(world.floorTime % 60);
  ctx.fillText(`Time ${mins}:${String(secs).padStart(2, '0')}   Smoke ${world.smokeLeft} (E)   ${world.ghost ? 'GHOST ★' : ''}`, VIEW_W - 260, 46);
  ctx.textAlign = 'left';
  if (world.alarm.active) {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ ALARM — HIDE!', VIEW_W / 2, 32);
    ctx.textAlign = 'left';
  }
}

export function drawPanel(ctx, title, lines, accent) {
  const w = 620;
  const h = 120 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = 'rgba(8, 10, 14, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#161a22';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || COLORS.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 96 + i * 30);
  });
  ctx.textAlign = 'left';
}
