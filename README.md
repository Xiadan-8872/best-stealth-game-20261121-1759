# NIGHTSHIFT — The Meridian Vault

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Xiadan-8872/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Xiadan-8872/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Built for [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759) on make.fun — free entry, $50 prize pool, entries close 2026-11-22 05:59Z.

**5 floors, 2 guard types, cameras, drones, ghost bonus.** You are the night thief in the Meridian Vault. Each floor hides a blue keycard — grab it, then slip out the green exit without ever being spotted. Three lives; caught three times and the vault wins.

## The game

| Floor | What waits for you |
| --- | --- |
| 1. The Lobby | 2 patrolling guards, lamps, crates, bushes |
| 2. The Gallery | 2 guards, first sweeping security cameras |
| 3. The Vault | 3 guards, cameras, denser lamps |
| 4. The Server Room | 2 patrolling drones, 1 guard dog, 1 guard |
| 5. The Rooftop | A sweeping searchlight, 1 guard dog, 1 guard |

## Stealth systems

- **Vision cones** — guards patrol waypoints, pause and scan. Cones are drawn on the floor and warm from yellow to red as suspicion grows; a ring and `?` / `!` show how close you are to being spotted.
- **Detection with recovery** — suspicion fills faster up close, in lamplight, standing, or sprinting; slower in shadow or crouched. Break line of sight and it cools off; guards search where they last saw you, then return to patrol.
- **Light and shadow** — lamp pools are lit ground (dangerous); the dark between them is cover. Standing in light draws a warning ring around you.
- **Cover** — crates and walls block sight and movement; bushes hide a crouched player completely unless a guard is right on top of you.
- **Noise** — sprinting is fast and loud (guards hear it and come to look, with visible footstep rings); walking is a whisper; crouching is silent. The guard dog hears walking from about 1.9× a guard's range.
- **Coin distraction** — toss a coin toward the mouse; the clink pulls nearby guards to investigate the spot.
- **Smoke puff gadget** — 2 per floor, breaks all line of sight for 3 seconds.
- **Cameras, drones, searchlight** — fixed sweeping cones with their own meters; a full meter raises the alarm and sends guards to your position. Drones never catch you, but they call the guards who do.
- **Alarm and chase** — a full meter means a chase. Caught = lose a life and the floor restarts.
- **Ghost bonus** — a floor cleared without ever being spotted pays +500. Loot is optional (+100 each); beating the par time pays a time bonus.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sprint — fast, loud |
| C / Ctrl | Crouch — slow, silent, hard to see |
| Q or left-click | Toss a coin toward the mouse |
| E | Smoke puff (2 per floor) |
| Space / Enter | Start / continue |
| P / Esc | Pause |
| R | Restart floor |
| M | Mute |

All sound is synthesised live with WebAudio (footsteps, suspicion sting, alarm, pickup chimes, room tone). No audio files, no network requests, no libraries, no build step — plain ES modules and Canvas 2D, runs offline in a desktop browser from its own static files.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` through any static server. Node 22.18+ is enough; `serve.ts` also accepts `--port <n>`.

## Files

| Path | What it is |
| --- | --- |
| `game/index.html` | Page shell and canvas |
| `game/src/main.js` | Boot, game loop, screens (title, briefing, pause, clear, caught, victory) |
| `game/src/config.js` | Every tuning number and colour |
| `game/src/levels.js` | The 5 floor plans, patrols, cameras, lamps |
| `game/src/world.js` | Rules: guards, vision, suspicion, noise, loot, exit |
| `game/src/render.js` | Canvas drawing: floor, light, cones, HUD, panels |
| `game/src/input.js` | Keyboard and mouse |
| `game/src/audio.js` | Synthesised WebAudio sound (no audio files) |
| `game/src/shots.js` | Staged screenshot scenes (real play, autopilot) |
| `game/src/random.js` | Seeded RNG (same seed, same game) |
| `main.ts` | Entrypoint: copies `game/` + `screenshots/` to the output directory and writes `dossier.json` |
| `serve.ts` | Local static server for play-testing (default port 8080) |
| `shots.json` | The 4 staged screenshot scenes |
| `screenshots/` | 4 staged renders (1280×800 JPEG): title, sneak, chase, victory |

## Screenshots

The four images in `screenshots/` are real renders of the running game, staged deterministically from the simulation with `?shot=start|play|chase|end&seed=1` — no mock-ups. `1-start.jpg` title over a patrolling lobby, `2-play.jpg` mid-floor sneak, `3-chase.jpg` live alarm chase, `4-end.jpg` victory screen.

## License

MIT — see [LICENSE](LICENSE).
