# Palmera Bay — an open-world crime game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/mouns4117-ai/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/mouns4117-ai/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

**Palmera Bay** is a sun-soaked open-world crime game that runs entirely in a
desktop browser from static files — no build step, no network, no downloads.
You are Leo Marin, a driver-for-hire in a coastal city who owes a debt to a
fixer known only as the Broker. Work the jobs, dodge the heat, and pay the
debt off one delivery at a time.

Explore the city on foot or behind the wheel. Steal cars, outrun the police,
take on story missions, and build your reputation — and your cash — as the
wanted stars stack up.

## What is in the game

- **A city to explore** — Palmera Bay: a road grid of downtown towers, a
  beachfront boulevard, a park, a pier, suburbs, and a marina, all drawn and
  laid out by hand in code.
- **On foot and by car** — walk the sidewalks, jack any parked or passing
  car, and drive it with real-feeling arcade handling: acceleration,
  braking, handbrake turns, and collisions.
- **Traffic and pedestrians** — cars cruise the roads and stop for nothing;
  pedestrians stroll the sidewalks and scatter when shots are fired.
- **Wanted level and police** — crimes raise your heat from one to five
  stars. Patrol cars and officers respond, chase, and ram. Lose them to cool
  off.
- **Missions and a story** — a chain of jobs for the Broker: pickups,
  deliveries, a stolen ride, and a final run under full police pressure.
  Each job pays cash and unlocks the next.
- **Combat** — a pistol with limited ammo, ammo pickups around the city,
  and police who shoot back.
- **HUD and minimap** — health, cash, wanted stars, speed, mission
  objectives, and a live minimap with mission markers.
- **Start screen, pause, game over, and saving** — progress (cash and
  missions) is saved in the browser so you can pick up where you left off.
- **Sound** — engine hum, sirens, gunshots, and a bassline, all synthesized
  live with WebAudio. No audio files.

## How to play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. For local development:

```sh
node serve.ts
# open http://localhost:8080
```

| Keys | Action |
| ---- | ------ |
| W A S D | Move / drive |
| Shift | Run |
| E | Enter or exit a car |
| Mouse | Aim |
| Click | Shoot |
| Space | Handbrake (driving) |
| P or Esc | Pause |
| M | Mute |

## How it is built

- `game/index.html` — the page: one canvas, one module script.
- `game/src/` — the game's own source, one file per job: the city, the
  player and cars, traffic, police, missions, combat, rendering, the HUD,
  sound, saving, and screenshot staging.
- `main.ts` — the entry program (Node 22, standard library only). It copies
  `game/` and `screenshots/` to the output directory and writes
  `dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — four screenshots of the game itself, taken in a browser.

Everything in `game/` is original: the city, the characters, the vehicles,
the names, the story, the art, and the sounds. Nothing is taken from any
commercial game.

## License

MIT — see [LICENSE](LICENSE).
